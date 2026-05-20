from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.long_term_memory import LongTermMemory


class LongTermMemoryService:
    """
    장기 기억 (Long-term Memory) — pgvector 활용
    ───────────────────────────────────────────
    세션을 넘어 영구 보존되어야 할 핵심 대화 내용을 임베딩 벡터로
    PostgreSQL(pgvector)에 저장하고, 새 질문과의 코사인 유사도로 검색.

    구조 이해 포인트:
    - 벡터 컬럼 타입: vector(384) — pgvector 확장이 제공
    - 유사도 함수: <=> (코사인 거리, 0에 가까울수록 유사)
    - IVFFlat / HNSW 인덱스로 대규모 검색 가속 가능
      (현재는 소규모라 순차 스캔, 필요 시 CREATE INDEX 추가)
    """

    def store(
        self,
        db: Session,
        content: str,
        embedding: list[float],
        session_id: str | None = None,
        domain: str = "general",
    ) -> LongTermMemory:
        """대화 내용을 임베딩과 함께 장기 기억 테이블에 저장."""
        memory = LongTermMemory(
            session_id=session_id,
            domain=domain,
            content=content,
            embedding=embedding,
        )
        db.add(memory)
        db.commit()
        db.refresh(memory)
        return memory

    def search(
        self,
        db: Session,
        query_vector: list[float],
        domain: str = "general",
        top_k: int | None = None,
    ) -> list[dict]:
        """
        pgvector 코사인 거리(<=>)로 유사한 장기 기억을 검색.
        임계값(threshold) 이하의 결과만 반환하여 무관한 기억 제거.
        """
        k = top_k or settings.long_term_memory_top_k
        threshold = settings.long_term_memory_threshold

        # SQLAlchemy ORM에서 pgvector 연산자(<=>)를 직접 사용
        rows = (
            db.query(
                LongTermMemory,
                LongTermMemory.embedding.cosine_distance(query_vector).label("distance"),
            )
            .filter(
                LongTermMemory.embedding.cosine_distance(query_vector) < threshold,
                (LongTermMemory.domain == domain) | (LongTermMemory.domain == "general"),
            )
            .order_by(LongTermMemory.embedding.cosine_distance(query_vector))
            .limit(k)
            .all()
        )

        return [
            {
                "id": mem.id,
                "content": mem.content,
                "domain": mem.domain,
                "distance": float(dist),
                "created_at": mem.created_at,
            }
            for mem, dist in rows
        ]
