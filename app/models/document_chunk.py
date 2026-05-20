from sqlalchemy import Column, Integer, String, Text, DateTime, func

from app.core.database import Base


class DocumentChunk(Base):
    """
    키워드(Full-Text) 검색을 위해 청크 원문을 PostgreSQL에 이중 저장.
    벡터 검색은 Qdrant, 키워드 검색은 이 테이블을 사용하여 하이브리드 검색을 구현.
    """
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    chunk_id = Column(String(128), unique=True, nullable=False, index=True)
    document_id = Column(String(64), nullable=False, index=True)
    title = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    domain = Column(String(32), nullable=False, default="general", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
