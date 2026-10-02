"""백테스트 결과 → 전략 스펙 변환·합격 판정·저장.

흐름: POST /backtests/strategies (BacktestRequest + strategy_id/name/universe) → LeanBacktestService.run →
      build_spec() → evaluate_acceptance() → strategy_store.save(). 불합격이면 저장은 하되 422 로 알린다.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any

from datetime import date

from app.schemas.chat import STRATEGY_LABELS, BacktestRequest
from app.schemas.strategy import (
    AcceptanceCriteria, BacktestPeriod, BacktestResultSummary, PositionSizing, SignalRule, SignalWeights,
    StrategySpec, evaluate_acceptance,
)
from app.services import strategy_store

KST = timezone(timedelta(hours=9))

# domain-rag-lab 예시 전략(BacktestStrategy) → lumina-invest 시그널 규칙 매핑
_RULES: dict[str, tuple[SignalRule, SignalRule]] = {
    "buy_hold": (SignalRule(indicator="buy_hold", condition="always"), SignalRule(indicator="buy_hold", condition="never")),
    "dca":      (SignalRule(indicator="dca", condition="always"), SignalRule(indicator="dca", condition="never")),
    "ma_cross": (SignalRule(indicator="ma_cross", condition="short_above_long"), SignalRule(indicator="ma_cross", condition="short_below_long")),
    "momentum": (SignalRule(indicator="momentum", condition="breakout_high"), SignalRule(indicator="momentum", condition="breakdown_low")),
}


def rules_for(request: BacktestRequest) -> tuple[SignalRule, SignalRule]:
    entry, exit_ = _RULES[request.strategy]
    params: dict[str, Any] = {}
    if request.strategy == "ma_cross":
        params = {"short_window": request.short_window, "long_window": request.long_window}
    elif request.strategy == "dca":
        params = {"interval_days": request.dca_interval_days}
    elif request.strategy == "momentum":
        params = {"breakout_window": request.breakout_window}
    return entry.model_copy(update={"params": params}), exit_.model_copy(update={"params": params})


def build_spec(*, request: BacktestRequest, result: dict[str, Any], strategy_id: str, name: str | None,
               universe: list[str], version: int, criteria: AcceptanceCriteria | None = None,
               signal_weights: SignalWeights | None = None, position_sizing: PositionSizing | None = None) -> StrategySpec:
    """``result``는 BacktestResponse.model_dump() 와 같은 딕셔너리."""
    entry, exit_ = rules_for(request)
    summary = BacktestResultSummary(
        period=BacktestPeriod(start=request.start_date, end=request.end_date),
        annualized_return_pct=float(result["annualized_return_pct"]),
        max_drawdown_pct=float(result["max_drawdown_pct"]),
        sharpe_ratio=float(result["sharpe_ratio"]),
        trade_count=int(result["trade_count"]),
        win_rate_pct=result.get("win_rate_pct"),
        engine=str(result.get("engine") or "lean"),
    )
    return StrategySpec(
        strategy_id=strategy_id, version=version,
        name=name or f"{STRATEGY_LABELS.get(request.strategy, request.strategy)} ({request.ticker})",
        universe=universe, entry=entry, exit=exit_,
        signal_weights=signal_weights or SignalWeights(),
        position_sizing=position_sizing or PositionSizing(),
        backtest_result=summary, acceptance=evaluate_acceptance(summary, criteria),
        created_at=datetime.now(KST),
    )


def export_spec(**kwargs) -> StrategySpec:
    spec = build_spec(**kwargs)
    strategy_store.save(spec)
    return spec


_INDICATOR_TO_STRATEGY = {"buy_hold": "buy_hold", "dca": "dca", "ma_cross": "ma_cross", "momentum": "momentum"}


def request_from_spec(spec: StrategySpec, *, ticker: str | None = None, start_date: date | None = None,
                      end_date: date | None = None, initial_cash: float = 10_000) -> BacktestRequest:
    """스펙(entry 규칙·파라미터)에서 BacktestRequest 를 복원한다 — 스펙 재검증(revalidate)·다른 기간 재실행용.

    ticker 를 생략하면 universe 첫 종목(.KS 접미), 기간을 생략하면 스펙의 백테스트 기간을 쓴다.
    """
    strategy = _INDICATOR_TO_STRATEGY.get(spec.entry.indicator)
    if strategy is None:
        raise ValueError(f"LEAN 예시 전략으로 변환할 수 없는 indicator: {spec.entry.indicator}")
    params = spec.entry.params or {}
    period = spec.backtest_result.period
    start = start_date or period.start
    end = end_date or period.end
    return BacktestRequest(
        ticker=ticker or f"{spec.universe[0]}.KS",
        start_date=start, end_date=end, compare_start_date=start, compare_end_date=end,
        initial_cash=initial_cash, strategy=strategy,
        short_window=int(params.get("short_window", 20)), long_window=int(params.get("long_window", 60)),
        dca_interval_days=int(params.get("interval_days", 21)), breakout_window=int(params.get("breakout_window", 20)),
    )
