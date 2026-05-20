from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.chat_log import ChatLog
from app.schemas.chat import ChatRequest, ChatResponse, RetrievedChunk
from app.services.rag_service import RAGService

router = APIRouter(prefix="/chat", tags=["chat"])
rag_service = RAGService()


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
