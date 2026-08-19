"""yfinance data staging and remote QuantConnect LEAN execution."""

from __future__ import annotations

import subprocess
import tempfile
import uuid
from datetime import date, timedelta
from pathlib import Path

import yfinance as yf

from app.core.config import settings
from app.schemas.chat import STRATEGY_LABELS

# Extra calendar-day lookback fetched before start_date so indicators (moving
# averages, breakout windows) have enough history on day one of the backtest.
_LOOKBACK_BUFFER_DAYS = {
    "buy_hold": 0,
    "dca": 0,
    "ma_cross": lambda long_window: long_window * 2 + 15,
    "momentum": lambda breakout_window: breakout_window * 2 + 15,
}

# LEAN's engine loads these two static databases at startup (Engine.StaticInitializations)
# regardless of asset type, even for a custom PythonData subscription. Without them the
# container fails before Initialize() ever runs. Vendored from the public QuantConnect/Lean
# repo (Data/market-hours, Data/symbol-properties) since the docker image does not bundle them.
_REFERENCE_DATA_DIR = Path(__file__).parent / "lean_reference_data"
_REFERENCE_DATA_FILES = [
    "market-hours/market-hours-database.json",
    "symbol-properties/symbol-properties-database.csv",
    "symbol-properties/security-database.csv",
]


class LeanBacktestError(RuntimeError):
    pass


class LeanBacktestService:
    def run(
        self,
        *,
        ticker: str,
        start_date: date,
        end_date: date,
        compare_start_date: date,
        compare_end_date: date,
        initial_cash: float,
        strategy: str = "buy_hold",
        short_window: int = 20,
        long_window: int = 60,
        dca_interval_days: int = 21,
        breakout_window: int = 20,
    ) -> dict:
        if start_date >= end_date or compare_start_date >= compare_end_date:
            raise LeanBacktestError("시작일은 종료일보다 앞서야 합니다.")
        if not settings.lean_ssh_host or not settings.lean_ssh_key_path:
            raise LeanBacktestError("원격 LEAN 실행 설정(LEAN_SSH_HOST, LEAN_SSH_KEY_PATH)이 없습니다.")

        buffer_days = self._lookback_buffer(strategy, long_window, breakout_window)
        fetch_start = min(start_date, compare_start_date) - timedelta(days=buffer_days)
        # yfinance's end argument is exclusive. Include the selected final day so the
        # on-screen date range and the calculation match.
        download_end = max(end_date, compare_end_date) + timedelta(days=1)
        prices = yf.download(ticker, start=fetch_start.isoformat(), end=download_end.isoformat(), auto_adjust=True, progress=False)
        if prices.empty or "Close" not in prices:
            raise LeanBacktestError("yfinance에서 해당 기간의 종가를 받지 못했습니다.")
        close = prices["Close"]
        if getattr(close, "ndim", 1) > 1:
            close = close.iloc[:, 0]

        work_id = f"workflow-{uuid.uuid4().hex[:12]}"
        with tempfile.TemporaryDirectory(prefix="lean-backtest-") as tmp:
            local = Path(tmp)
            (local / "data").mkdir()
            self._write_prices(local / "data" / "prices.csv", close)
            (local / "main.py").write_text(
                self._algorithm_source(strategy, start_date, end_date, initial_cash, short_window, long_window, dca_interval_days, breakout_window),
                encoding="utf-8",
            )
            remote = f"{settings.lean_remote_workdir}/{work_id}"
            self._ssh(f"mkdir -p {remote}/data {remote}/results")
            shared_data = self._ensure_shared_reference_data()
            self._ssh(f"cp -r {shared_data}/. {remote}/data/")
            self._scp(local / "main.py", f"{remote}/main.py")
            self._scp(local / "data" / "prices.csv", f"{remote}/data/prices.csv")
            command = (
                f"docker run --rm -v {remote}:/workspace {settings.lean_docker_image} "
                "--environment backtesting --algorithm-language Python "
                f"--algorithm-type-name {self._algorithm_class_name(strategy)} "
                "--algorithm-location /workspace/main.py --data-folder /workspace/data "
                "--results-destination-folder /workspace/results --backtest-name workflow"
            )
            lean_log = self._ssh(command, timeout=settings.lean_timeout_seconds, check=False)

        series = close.loc[(close.index.date >= start_date) & (close.index.date <= end_date)]
        comparison = close.loc[(close.index.date >= compare_start_date) & (close.index.date <= compare_end_date)]
        if len(series) < 2 or len(comparison) < 2:
            raise LeanBacktestError("선택한 기간에 거래일 데이터가 충분하지 않습니다.")

        strategy_curve = self._strategy_curve(strategy, close, start_date, end_date, short_window, long_window, dca_interval_days, breakout_window)
        if len(strategy_curve) < 2:
            raise LeanBacktestError("선택한 기간에 전략을 계산할 데이터가 충분하지 않습니다.")

        strategy_return = (float(strategy_curve.iloc[-1]) / float(strategy_curve.iloc[0]) - 1) * 100
        benchmark_return = self._return(series)
        comparison_return = self._return(comparison)
        drawdown = (strategy_curve / strategy_curve.cummax() - 1).min() * 100
        analytics = self._analytics(strategy, close, strategy_curve, start_date, end_date, short_window, long_window, dca_interval_days, breakout_window)
        points = [{"date": idx.strftime("%Y-%m-%d"), "value": round(float(value * initial_cash), 2)} for idx, value in strategy_curve.iloc[::max(1, len(strategy_curve) // 80)].items()]
        return {
            "ticker": ticker,
            "engine": "QuantConnect LEAN + yfinance",
            "strategy": strategy,
            "strategy_label": STRATEGY_LABELS.get(strategy, strategy),
            "strategy_return_pct": round(strategy_return, 2),
            "benchmark_return_pct": round(benchmark_return, 2),
            "comparison_return_pct": round(comparison_return, 2),
            "outperformance_pct": round(strategy_return - comparison_return, 2),
            "max_drawdown_pct": round(float(drawdown), 2),
            **analytics,
            "points": points,
            "lean_log": lean_log[-6000:],
            "disclaimer": "yfinance 일봉 기반 교육용 예시입니다. 배당·세금·수수료·슬리피지·데이터 품질과 실제 체결은 반영하지 않으며 투자 권유가 아닙니다.",
        }

    def _analytics(self, strategy: str, close, strategy_curve, start_date: date, end_date: date, short_window: int, long_window: int, dca_interval_days: int, breakout_window: int) -> dict:
        """Return descriptive risk and trend facts, not a buy/sell recommendation."""
        daily = strategy_curve.pct_change().dropna()
        periods = max(1, len(strategy_curve) - 1)
        years = periods / 252
        annualized_return = ((float(strategy_curve.iloc[-1]) / float(strategy_curve.iloc[0])) ** (1 / years) - 1) * 100 if years > 0 else 0.0
        annualized_volatility = float(daily.std(ddof=0) * (252 ** 0.5) * 100) if len(daily) else 0.0
        sharpe = ((annualized_return / 100) - 0.02) / (annualized_volatility / 100) if annualized_volatility else 0.0

        if strategy == "ma_cross":
            position = self._position_ma_cross(close, short_window, long_window)
        elif strategy == "momentum":
            position = self._position_momentum(close, breakout_window)
        elif strategy == "dca":
            position = close * 0
            window = position.loc[(position.index.date >= start_date) & (position.index.date <= end_date)]
            for i, idx in enumerate(window.index):
                position.loc[idx] = min(1.0, (i // max(1, dca_interval_days) + 1) / max(1, (len(window) - 1) // max(1, dca_interval_days) + 1))
        else:
            position = close * 0 + 1.0
        position_window = position.loc[(position.index.date >= start_date) & (position.index.date <= end_date)]
        invested_days = float(position_window.mean() * 100) if len(position_window) else 0.0
        changes = position_window.diff().fillna(position_window.iloc[0] if len(position_window) else 0)
        trade_count = int((changes.abs() > 0.001).sum())

        price_window = close.loc[(close.index.date >= start_date) & (close.index.date <= end_date)]
        last = float(price_window.iloc[-1])
        ma20 = float(price_window.rolling(20).mean().iloc[-1]) if len(price_window) >= 20 else None
        ma60 = float(price_window.rolling(60).mean().iloc[-1]) if len(price_window) >= 60 else None
        ret20 = self._return(price_window.iloc[-21:]) if len(price_window) >= 21 else None
        high_252 = float(price_window.iloc[-252:].max())
        low_252 = float(price_window.iloc[-252:].min())
        range_position = ((last - low_252) / (high_252 - low_252) * 100) if high_252 > low_252 else 50.0
        if ma20 is not None and ma60 is not None:
            trend = "상승 추세 관찰" if last > ma20 > ma60 else "하락·횡보 구간 관찰" if last < ma20 < ma60 else "추세 혼조 구간"
        else:
            trend = "추세 판단에 필요한 거래일이 부족함"
        return {
            "annualized_return_pct": round(annualized_return, 2),
            "annualized_volatility_pct": round(annualized_volatility, 2),
            "sharpe_ratio": round(sharpe, 2),
            "invested_days_pct": round(invested_days, 1),
            "trade_count": trade_count,
            "market_snapshot": {
                "as_of": price_window.index[-1].strftime("%Y-%m-%d"),
                "last_price": round(last, 2),
                "return_20d_pct": round(ret20, 2) if ret20 is not None else None,
                "ma20": round(ma20, 2) if ma20 is not None else None,
                "ma60": round(ma60, 2) if ma60 is not None else None,
                "range_252d_position_pct": round(range_position, 1),
                "trend": trend,
            },
        }

    # ── strategy dispatch ────────────────────────────────────────────

    @staticmethod
    def _lookback_buffer(strategy: str, long_window: int, breakout_window: int) -> int:
        entry = _LOOKBACK_BUFFER_DAYS.get(strategy, 0)
        if callable(entry):
            return entry(long_window if strategy == "ma_cross" else breakout_window)
        return entry

    def _strategy_curve(self, strategy: str, close, start_date: date, end_date: date, short_window: int, long_window: int, dca_interval_days: int, breakout_window: int):
        if strategy == "dca":
            window = close.loc[(close.index.date >= start_date) & (close.index.date <= end_date)]
            return self._equity_dca(window, dca_interval_days)

        if strategy == "ma_cross":
            position_full = self._position_ma_cross(close, short_window, long_window)
        elif strategy == "momentum":
            position_full = self._position_momentum(close, breakout_window)
        else:  # buy_hold
            position_full = close * 0 + 1.0

        equity_full = self._equity_from_position(close, position_full)
        window_equity = equity_full.loc[(equity_full.index.date >= start_date) & (equity_full.index.date <= end_date)]
        if len(window_equity) < 2:
            return window_equity
        return window_equity / float(window_equity.iloc[0])

    @staticmethod
    def _equity_from_position(close, position) -> "object":
        daily_return = close.pct_change().fillna(0.0)
        strategy_return = daily_return * position
        return (1.0 + strategy_return).cumprod()

    @staticmethod
    def _position_ma_cross(close, short_window: int, long_window: int):
        short_ma = close.rolling(short_window).mean()
        long_ma = close.rolling(long_window).mean()
        signal = (short_ma > long_ma).astype(float)
        # act the day after the crossover is observed, avoiding lookahead bias
        return signal.shift(1).fillna(0.0)

    @staticmethod
    def _position_momentum(close, window: int):
        prior_high = close.shift(1).rolling(window).max()
        prior_low = close.shift(1).rolling(window).min()
        holding = False
        flags = []
        for price, hi, lo in zip(close, prior_high, prior_low):
            if not holding and hi == hi and price > hi:  # hi==hi filters NaN
                holding = True
            elif holding and lo == lo and price < lo:
                holding = False
            flags.append(1.0 if holding else 0.0)
        position = close * 0
        position[:] = flags
        # act the day after the breakout/breakdown is observed
        return position.shift(1).fillna(0.0)

    @staticmethod
    def _equity_dca(close, interval_days: int):
        interval_days = max(1, interval_days)
        n = len(close)
        buy_points = set(range(0, n, interval_days))
        portion = 1.0 / len(buy_points)
        shares = 0.0
        cash = 1.0
        values = []
        for i, price in enumerate(close):
            price = float(price)
            if i in buy_points and price > 0:
                cash -= portion
                shares += portion / price
            values.append(shares * price + cash)
        equity = close * 0
        equity[:] = values
        return equity

    @staticmethod
    def _return(series) -> float:
        return (float(series.iloc[-1]) / float(series.iloc[0]) - 1) * 100

    @staticmethod
    def _write_prices(path: Path, close) -> None:
        lines = ["date,close"] + [f"{idx.strftime('%Y-%m-%d')},{float(value):.8f}" for idx, value in close.items()]
        path.write_text("\n".join(lines), encoding="utf-8")

    def _ensure_shared_reference_data(self) -> str:
        """Upload LEAN's required symbol-properties/market-hours databases to a shared
        cache directory on the remote host once, then reuse it for every run instead of
        re-transferring ~4MB on each backtest."""
        shared = f"{settings.lean_remote_workdir}/_shared-lean-data"
        marker = f"{shared}/symbol-properties/symbol-properties-database.csv"
        check = self._ssh(f"test -f {marker} && echo present || echo missing", check=False)
        if check.strip().endswith("present"):
            return shared
        self._ssh(f"mkdir -p {shared}/market-hours {shared}/symbol-properties")
        for relative in _REFERENCE_DATA_FILES:
            local_path = _REFERENCE_DATA_DIR / relative
            if not local_path.exists():
                raise LeanBacktestError(f"LEAN 참조 데이터 파일이 없습니다: {relative}")
            self._scp(local_path, f"{shared}/{relative}")
        return shared

    # ── LEAN algorithm source generation ────────────────────────────

    @staticmethod
    def _algorithm_class_name(strategy: str) -> str:
        return {
            "buy_hold": "YFinanceBuyHoldAlgorithm",
            "ma_cross": "YFinanceMovingAverageCrossAlgorithm",
            "dca": "YFinanceDollarCostAveragingAlgorithm",
            "momentum": "YFinanceMomentumBreakoutAlgorithm",
        }.get(strategy, "YFinanceBuyHoldAlgorithm")

    @staticmethod
    def _reader_boilerplate() -> str:
        return (
            'from AlgorithmImports import *\n'
            'from QuantConnect.Python import PythonData\n'
            'from QuantConnect import Globals, SubscriptionTransportMedium\n'
            'from QuantConnect.Data import SubscriptionDataSource\n'
            'import os\n'
            'from datetime import datetime, timedelta\n\n'
            'class YFPrice(PythonData):\n'
            '    def get_source(self, config, date, is_live):\n'
            '        return SubscriptionDataSource(os.path.join(Globals.DataFolder, "prices.csv"), SubscriptionTransportMedium.LocalFile)\n'
            '    def reader(self, config, line, date, is_live):\n'
            '        if line.startswith("date"):\n'
            '            return None\n'
            '        d, close = line.split(",")\n'
            '        item = YFPrice()\n'
            '        item.symbol = config.symbol\n'
            '        item.time = datetime.strptime(d, "%Y-%m-%d")\n'
            '        item.end_time = item.time + timedelta(days=1)\n'
            '        item.value = float(close)\n'
            '        return item\n\n'
        )

    def _algorithm_source(self, strategy: str, start: date, end: date, cash: float, short_window: int, long_window: int, dca_interval_days: int, breakout_window: int) -> str:
        header = f'''    def initialize(self):
        self.set_start_date({start.year}, {start.month}, {start.day})
        self.set_end_date({end.year}, {end.month}, {end.day})
        self.set_cash({cash})
        self.asset = self.add_data(YFPrice, "YF", Resolution.DAILY).symbol
        # Base/custom data defaults to a whole-share lot size, which silently rounds
        # SetHoldings() down to 0 units whenever cash / price < 1 (e.g. USD cash vs a
        # KRW-priced ticker). A tiny lot size lets it size fractional positions instead.
        self.securities[self.asset].symbol_properties = SymbolProperties("", "USD", 1, 0.01, 0.0000001, "")
'''
        if strategy == "ma_cross":
            body = f'''{header}        self.short_window = {short_window}
        self.long_window = {long_window}
        self.prices = []

    def on_data(self, data):
        if not data.contains_key(self.asset):
            return
        self.prices.append(float(data[self.asset].value))
        self.prices = self.prices[-self.long_window:]
        if len(self.prices) < self.long_window:
            return
        short_ma = sum(self.prices[-self.short_window:]) / self.short_window
        long_ma = sum(self.prices) / self.long_window
        if short_ma > long_ma and not self.portfolio.invested:
            self.set_holdings(self.asset, 1)
        elif short_ma <= long_ma and self.portfolio.invested:
            self.liquidate(self.asset)
'''
            class_name = "YFinanceMovingAverageCrossAlgorithm"
        elif strategy == "dca":
            total_days = max(1, (end - start).days)
            body = f'''{header}        self.interval_days = {dca_interval_days}
        self.day_count = 0
        self.buys_done = 0
        self.total_buys = max(1, {total_days} // self.interval_days)
        self.portion = 1.0 / self.total_buys

    def on_data(self, data):
        if not data.contains_key(self.asset):
            return
        if self.day_count % self.interval_days == 0 and self.buys_done < self.total_buys:
            self.buys_done += 1
            target = min(1.0, self.buys_done * self.portion)
            self.set_holdings(self.asset, target)
        self.day_count += 1
'''
            class_name = "YFinanceDollarCostAveragingAlgorithm"
        elif strategy == "momentum":
            body = f'''{header}        self.window = {breakout_window}
        self.prices = []

    def on_data(self, data):
        if not data.contains_key(self.asset):
            return
        price = float(data[self.asset].value)
        if len(self.prices) >= self.window:
            prior_high = max(self.prices[-self.window:])
            prior_low = min(self.prices[-self.window:])
            if not self.portfolio.invested and price > prior_high:
                self.set_holdings(self.asset, 1)
            elif self.portfolio.invested and price < prior_low:
                self.liquidate(self.asset)
        self.prices.append(price)
'''
            class_name = "YFinanceMomentumBreakoutAlgorithm"
        else:
            body = f'''{header}
    def on_data(self, data):
        if not self.portfolio.invested and data.contains_key(self.asset):
            self.set_holdings(self.asset, 1)
'''
            class_name = "YFinanceBuyHoldAlgorithm"

        return self._reader_boilerplate() + f"class {class_name}(QCAlgorithm):\n" + body

    def _ssh(self, command: str, timeout: int = 30, check: bool = True) -> str:
        args = ["ssh", "-i", settings.lean_ssh_key_path, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", f"{settings.lean_ssh_user}@{settings.lean_ssh_host}", command]
        result = subprocess.run(args, text=True, capture_output=True, timeout=timeout)
        if check and result.returncode:
            raise LeanBacktestError(result.stderr.strip() or "원격 LEAN 작업을 시작하지 못했습니다.")
        return (result.stdout + "\n" + result.stderr).strip()

    def _scp(self, source: Path, destination: str) -> None:
        args = ["scp", "-i", settings.lean_ssh_key_path, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", str(source), f"{settings.lean_ssh_user}@{settings.lean_ssh_host}:{destination}"]
        result = subprocess.run(args, text=True, capture_output=True, timeout=60)
        if result.returncode:
            raise LeanBacktestError(result.stderr.strip() or "원격 작업 폴더로 데이터를 전송하지 못했습니다.")
