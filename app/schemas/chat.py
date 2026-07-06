from typing import List, Optional
from enum import Enum
from pydantic import BaseModel


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
