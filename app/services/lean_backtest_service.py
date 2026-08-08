"""yfinance data staging and remote QuantConnect LEAN execution."""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
import uuid
from datetime import date
from pathlib import Path

import yfinance as yf

from app.core.config import settings


class LeanBacktestError(RuntimeError):
    pass


class LeanBacktestService:
    def run(self, *, ticker: str, start_date: date, end_date: date, compare_start_date: date, compare_end_date: date, initial_cash: float) -> dict:
        if start_date >= end_date or compare_start_date >= compare_end_date:
            raise LeanBacktestError("시작일은 종료일보다 앞서야 합니다.")
        if not settings.lean_ssh_host or not settings.lean_ssh_key_path:
            raise LeanBacktestError("원격 LEAN 실행 설정(LEAN_SSH_HOST, LEAN_SSH_KEY_PATH)이 없습니다.")
        prices = yf.download(ticker, start=min(start_date, compare_start_date).isoformat(), end=(max(end_date, compare_end_date)).isoformat(), auto_adjust=True, progress=False)
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
            (local / "main.py").write_text(self._algorithm_source(start_date, end_date, initial_cash), encoding="utf-8")
            remote = f"{settings.lean_remote_workdir}/{work_id}"
            self._ssh(f"mkdir -p {remote}/data {remote}/results")
            self._scp(local / "main.py", f"{remote}/main.py")
            self._scp(local / "data" / "prices.csv", f"{remote}/data/prices.csv")
            command = (
                f"docker run --rm -v {remote}:/workspace {settings.lean_docker_image} "
                "--environment backtesting --algorithm-language Python "
                "--algorithm-type-name YFinanceBuyHoldAlgorithm "
                "--algorithm-location /workspace/main.py --data-folder /workspace/data "
                "--results-destination-folder /workspace/results --backtest-name workflow"
            )
            lean_log = self._ssh(command, timeout=settings.lean_timeout_seconds, check=False)
        series = close.loc[(close.index.date >= start_date) & (close.index.date <= end_date)]
        comparison = close.loc[(close.index.date >= compare_start_date) & (close.index.date <= compare_end_date)]
        if len(series) < 2 or len(comparison) < 2:
            raise LeanBacktestError("선택한 기간에 거래일 데이터가 충분하지 않습니다.")
        strategy_return = self._return(series)
        benchmark_return = strategy_return
        comparison_return = self._return(comparison)
        curve = (series / series.iloc[0])
        drawdown = (curve / curve.cummax() - 1).min() * 100
        points = [{"date": idx.strftime("%Y-%m-%d"), "value": round(float(value * initial_cash), 2)} for idx, value in curve.iloc[::max(1, len(curve) // 80)].items()]
        return {"ticker": ticker, "engine": "QuantConnect LEAN + yfinance", "strategy_return_pct": round(strategy_return, 2), "benchmark_return_pct": round(benchmark_return, 2), "comparison_return_pct": round(comparison_return, 2), "outperformance_pct": round(strategy_return - comparison_return, 2), "max_drawdown_pct": round(float(drawdown), 2), "points": points, "lean_log": lean_log[-3000:], "disclaimer": "yfinance 일봉 기반 교육용 매수·보유 예시입니다. 배당·세금·수수료·슬리피지·데이터 품질과 실제 체결은 반영하지 않으며 투자 권유가 아닙니다."}

    @staticmethod
    def _return(series) -> float:
        return (float(series.iloc[-1]) / float(series.iloc[0]) - 1) * 100

    @staticmethod
    def _write_prices(path: Path, close) -> None:
        lines = ["date,close"] + [f"{idx.strftime('%Y-%m-%d')},{float(value):.8f}" for idx, value in close.items()]
        path.write_text("\n".join(lines), encoding="utf-8")

    @staticmethod
    def _algorithm_source(start: date, end: date, cash: float) -> str:
        return f'''from AlgorithmImports import *\nfrom QuantConnect.Python import PythonData\nfrom QuantConnect import Globals, SubscriptionTransportMedium\nfrom QuantConnect.Data import SubscriptionDataSource\nimport os\nfrom datetime import datetime, timedelta\n\nclass YFPrice(PythonData):\n    def get_source(self, config, date, is_live):\n        return SubscriptionDataSource(os.path.join(Globals.DataFolder, "prices.csv"), SubscriptionTransportMedium.LocalFile)\n    def reader(self, config, line, date, is_live):\n        if line.startswith("date"):\n            return None\n        d, close = line.split(",")\n        item = YFPrice()\n        item.symbol = config.symbol\n        item.time = datetime.strptime(d, "%Y-%m-%d")\n        item.end_time = item.time + timedelta(days=1)\n        item.value = float(close)\n        return item\n\nclass YFinanceBuyHoldAlgorithm(QCAlgorithm):\n    def initialize(self):\n        self.set_start_date({start.year}, {start.month}, {start.day})\n        self.set_end_date({end.year}, {end.month}, {end.day})\n        self.set_cash({cash})\n        self.asset = self.add_data(YFPrice, "YF", Resolution.DAILY).symbol\n    def on_data(self, data):\n        if not self.portfolio.invested and data.contains_key(self.asset):\n            self.set_holdings(self.asset, 1)\n''' 

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
