from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.chat_log import ChatLog
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    OrchestrateRequest,
    OrchestrateResponse,
    RetrievedChunk,
    ToolCallTrace,
)
from app.services.orchestrator import MainOrchestrator
from app.services.rag_service import RAGService

router = APIRouter(prefix="/chat", tags=["chat"])
rag_service = RAGService()
orchestrator = MainOrchestrator()


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    answer, chunks, context_meta = rag_service.ask(
        db=db,
        question=payload.question,
        domain=payload.domain.value,
        session_id=payload.session_id,
        top_k=payload.top_k,
    )

    log = ChatLog(
        question=payload.question,
        answer=answer,
        domain=payload.domain.value,
        session_id=payload.session_id,
    )
    db.add(log)
    db.commit()

    return ChatResponse(
        answer=answer,
        references=[RetrievedChunk(**chunk) for chunk in chunks],
        domain=payload.domain.value,
        session_id=payload.session_id,
        context_meta=context_meta,
    )


@router.post("/orchestrate", response_model=OrchestrateResponse)
def orchestrate(payload: OrchestrateRequest, db: Session = Depends(get_db)):
    """
    메인 오케스트레이터 엔드포인트.
    LLM이 필요한 도구를 스스로 판단·호출하여 최종 답변을 생성합니다.
    응답에는 호출된 도구 이력(tool_calls)과 반복 횟수(iterations)가 포함됩니다.
    """
    result = orchestrator.run(
        db=db,
        question=payload.question,
        domain=payload.domain.value,
        session_id=payload.session_id,
    )

    log = ChatLog(
        question=payload.question,
        answer=result.answer,
        domain=result.domain,
        session_id=result.session_id,
    )
    db.add(log)
    db.commit()

    return OrchestrateResponse(
        answer=result.answer,
        tool_calls=[
            ToolCallTrace(
                tool=tc.tool,
                arguments=tc.arguments,
                result_preview=tc.result_preview,
            )
            for tc in result.tool_calls
        ],
        iterations=result.iterations,
        domain=result.domain,
        session_id=result.session_id,
    )
