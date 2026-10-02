"""전략 스펙(StrategySpec) — LEAN 백테스트를 통과한 전략을 lumina-invest 가 HTTP로 받아 쓰는 계약 객체.

계약서: docs/contracts/kis-autotrade-api.md 1절. 필드를 바꾸면 계약서와 lumina-invest strategy_loader 를 함께 갱신한다.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

SignalCondition = Literal[
    "short_above_long", "short_below_long",   # ma_cross
    "breakout_high", "breakdown_low",         # momentum
    "always", "never",                        # buy_hold / dca
]


class SignalRule(BaseModel):
    indicator: str = Field(min_length=1, max_length=40, examples=["ma_cross"])
    params: dict[str, Any] = Field(default_factory=dict)
    condition: SignalCondition


class SignalWeights(BaseModel):
    technical: float = Field(default=1.0, ge=0, le=1)
    lightgbm: float = Field(default=0.0, ge=0, le=1)
    buy_threshold: float = Field(default=0.6, ge=-1, le=1)
    sell_threshold: float = Field(default=-0.6, ge=-1, le=1)


class PositionSizing(BaseModel):
    max_position_pct: float = Field(default=30.0, gt=0, le=100)
    max_symbols: int = Field(default=5, ge=1, le=50)


class BacktestPeriod(BaseModel):
    start: date
    end: date


class BacktestResultSummary(BaseModel):
    period: BacktestPeriod
    annualized_return_pct: float
    max_drawdown_pct: float
    sharpe_ratio: float
    trade_count: int = Field(ge=0)
    win_rate_pct: float | None = None
    engine: str = "lean"


class AcceptanceCriteria(BaseModel):
    """합격 기준. 모두 만족해야 export 된다."""
    max_drawdown_pct_lte: float = 20.0
    trade_count_gte: int = 30
    annualized_return_pct_gt: float = 0.0


class Acceptance(BaseModel):
    passed: bool
    criteria: AcceptanceCriteria = Field(default_factory=AcceptanceCriteria)
    failed: list[str] = Field(default_factory=list)


class StrategySpec(BaseModel):
    strategy_id: str = Field(pattern=r"^[a-z0-9_]{3,40}$", examples=["ma_cross_kr_large"])
    version: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=80)
    universe: list[str] = Field(min_length=1, max_length=50)
    timeframe: Literal["1d"] = "1d"
    entry: SignalRule
    exit: SignalRule
    signal_weights: SignalWeights = Field(default_factory=SignalWeights)
    position_sizing: PositionSizing = Field(default_factory=PositionSizing)
    backtest_result: BacktestResultSummary
    acceptance: Acceptance
    created_at: datetime

    @field_validator("universe")
    @classmethod
    def krx_codes(cls, value: list[str]) -> list[str]:
        cleaned = []
        for raw in value:
            code = str(raw).strip().upper().removesuffix(".KS").removesuffix(".KQ")
            if len(code) != 6 or not code.isdigit():
                raise ValueError(f"universe 종목은 KRX 6자리 코드여야 합니다: {raw}")
            cleaned.append(code)
        return cleaned


class StrategySummary(BaseModel):
    strategy_id: str
    version: int
    name: str
    universe_size: int
    backtest_result: BacktestResultSummary
    created_at: datetime


class StrategyListResponse(BaseModel):
    strategies: list[StrategySummary]


def evaluate_acceptance(result: BacktestResultSummary, criteria: AcceptanceCriteria | None = None) -> Acceptance:
    criteria = criteria or AcceptanceCriteria()
    failed: list[str] = []
    if abs(result.max_drawdown_pct) > criteria.max_drawdown_pct_lte:
        failed.append(f"max_drawdown_pct {result.max_drawdown_pct:.2f} > {criteria.max_drawdown_pct_lte}")
    if result.trade_count < criteria.trade_count_gte:
        failed.append(f"trade_count {result.trade_count} < {criteria.trade_count_gte}")
    if result.annualized_return_pct <= criteria.annualized_return_pct_gt:
        failed.append(f"annualized_return_pct {result.annualized_return_pct:.2f} <= {criteria.annualized_return_pct_gt}")
    return Acceptance(passed=not failed, criteria=criteria, failed=failed)
