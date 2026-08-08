from typing import List, Optional
from enum import Enum
from pydantic import BaseModel
from pydantic import Field, field_validator
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


class BacktestRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=12, examples=["005930.KS"])
    start_date: date
    end_date: date
    compare_start_date: date
    compare_end_date: date
    initial_cash: float = Field(default=10000, ge=1000, le=10_000_000)

    @field_validator("ticker")
    @classmethod
    def ticker_is_safe(cls, value: str) -> str:
        ticker = value.strip().upper()
        if not re.fullmatch(r"[A-Z0-9.^=-]{1,12}", ticker):
            raise ValueError("티커는 영문·숫자와 . ^ = - 만 사용할 수 있습니다.")
        return ticker


class BacktestResponse(BaseModel):
    ticker: str
    engine: str
    strategy_return_pct: float
    benchmark_return_pct: float
    comparison_return_pct: float
    outperformance_pct: float
    max_drawdown_pct: float
    points: list[dict]
    lean_log: str
    disclaimer: str
