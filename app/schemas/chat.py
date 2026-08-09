from typing import List, Literal, Optional
from enum import Enum
from pydantic import BaseModel
from pydantic import Field, field_validator, model_validator
from datetime import date
import re


class DomainType(str, Enum):
    medical = "medical"
    english = "english"
    finance = "finance"
    general = "general"


class ChatRequest(BaseModel):
    question: str
    domain: DomainType = DomainType.general
    top_k: int | None = None
    session_id: Optional[str] = None


class RetrievedChunk(BaseModel):
    chunk_id: str
    document_id: str
    title: str
    content: str
    score: float
    domain: str = "general"


class ChatResponse(BaseModel):
    answer: str
    references: List[RetrievedChunk]
    domain: str = "general"
    session_id: Optional[str] = None
    context_meta: Optional[dict] = None


# ── Orchestrator schemas ──────────────────────────────────────────

class OrchestrateRequest(BaseModel):
    question: str
    domain: DomainType = DomainType.general
    session_id: Optional[str] = None


class ToolCallTrace(BaseModel):
    tool: str
    arguments: dict
    result_preview: str


class OrchestrateResponse(BaseModel):
    answer: str
    tool_calls: List[ToolCallTrace]
    iterations: int
    domain: str
    session_id: Optional[str] = None


BacktestStrategy = Literal["buy_hold", "ma_cross", "dca", "momentum"]

STRATEGY_LABELS: dict[str, str] = {
    "buy_hold": "매수 후 보유",
    "ma_cross": "이동평균 교차",
    "dca": "정액 적립매수(DCA)",
    "momentum": "추세추종(돌파)",
}


class BacktestRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=12, examples=["005930.KS"])
    start_date: date
    end_date: date
    compare_start_date: date
    compare_end_date: date
    initial_cash: float = Field(default=10000, ge=1000, le=10_000_000)
    strategy: BacktestStrategy = Field(default="buy_hold", description="적용할 예시 전략")
    short_window: int = Field(default=20, ge=2, le=120, description="ma_cross 단기 이동평균 기간(거래일)")
    long_window: int = Field(default=60, ge=5, le=300, description="ma_cross 장기 이동평균 기간(거래일)")
    dca_interval_days: int = Field(default=21, ge=1, le=120, description="dca 매수 간격(거래일, 21≈1개월)")
    breakout_window: int = Field(default=20, ge=5, le=120, description="momentum 돌파 기준 기간(거래일)")

    @field_validator("ticker")
    @classmethod
    def ticker_is_safe(cls, value: str) -> str:
        ticker = value.strip().upper()
        if not re.fullmatch(r"[A-Z0-9.^=-]{1,12}", ticker):
            raise ValueError("티커는 영문·숫자와 . ^ = - 만 사용할 수 있습니다.")
        return ticker

    @model_validator(mode="after")
    def windows_are_consistent(self) -> "BacktestRequest":
        if self.strategy == "ma_cross" and self.long_window <= self.short_window:
            raise ValueError("장기 이동평균 기간은 단기 이동평균 기간보다 길어야 합니다.")
        return self


class BacktestResponse(BaseModel):
    ticker: str
    engine: str
    strategy: str
    strategy_label: str
    strategy_return_pct: float
    benchmark_return_pct: float
    comparison_return_pct: float
    outperformance_pct: float
    max_drawdown_pct: float
    points: list[dict]
    lean_log: str
    disclaimer: str
