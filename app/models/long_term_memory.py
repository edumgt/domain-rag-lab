from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Integer, String, Text, DateTime, func

from app.core.config import settings
from app.core.database import Base


class LongTermMemory(Base):
    """
    pgvector 기반 장기 기억 테이블.
    세션이 끝난 후에도 보존되어야 할 핵심 대화 내용을
    임베딩 벡터로 저장하고, 이후 유사도 검색으로 재활용.
    """
    __tablename__ = "long_term_memories"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), nullable=True, index=True)
    domain = Column(String(32), nullable=False, default="general", index=True)
    # 저장할 원문 (질문+답변 요약)
    content = Column(Text, nullable=False)
    # pgvector: sentence-transformer 임베딩 (384차원)
    embedding = Column(Vector(settings.embedding_dim), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
