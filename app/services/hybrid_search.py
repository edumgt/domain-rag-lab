from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.vector_store import VectorStore


class HybridSearchService:
    """
    하이브리드 검색 — 벡터 검색 + 키워드 검색 결합
    ────────────────────────────────────────────────
    1. 벡터 검색 (Qdrant): 시맨틱 유사도 기반 Top-K 문서 회수
    2. 키워드 검색 (PostgreSQL): ILIKE 기반 토큰 매칭
       - Korean/English 모두 지원 (언어별 토크나이저 불필요)
       - 토큰별 매칭 수로 관련도 스코어링
    3. RRF (Reciprocal Rank Fusion): 두 결과 목록을 순위 기반으로 병합
       - score = Σ 1/(k + rank_i), k=60 (표준 상수)
       - 어느 한쪽 검색에만 있어도 최종 결과에 포함 가능

    구조 이해 포인트:
    - 순수 벡터 검색: 동의어·문맥 강함, 정확한 단어 매칭 약함
    - 순수 키워드 검색: 정확 단어 강함, 의미적 유사도 약함
    - 하이브리드: 두 장점 결합 → 재현율·정밀도 모두 향상
    """

    RRF_K = 60  # RRF 분모 상수 (논문 기본값)

    def __init__(self):
        self.vector_store = VectorStore()

    def search(
        self,
        db: Session,
        query: str,
        query_vector: list[float],
        domain: str = "general",
        top_k: int | None = None,
    ) -> list[dict]:
        k = top_k or settings.top_k

        vector_results = self._vector_search(query_vector, domain, k * 2)
        keyword_results = self._keyword_search(db, query, domain, k * 2)
        return self._rrf_merge(vector_results, keyword_results, k)

    # ── 내부 메서드 ──────────────────────────────────────────────

    def _vector_search(
        self, query_vector: list[float], domain: str, limit: int
    ) -> list[dict]:
        results = self.vector_store.search(
            query_vector=query_vector,
            top_k=limit,
            domain=domain if domain != "general" else None,
        )
        return [
            {
                "chunk_id": r.payload.get("chunk_id", ""),
                "document_id": r.payload.get("document_id", ""),
                "title": r.payload.get("title", ""),
                "content": r.payload.get("content", ""),
                "score": float(r.score),
                "domain": r.payload.get("domain", "general"),
                "source": "vector",
            }
            for r in results
        ]

    def _keyword_search(
        self, db: Session, query: str, domain: str, limit: int
    ) -> list[dict]:
        """
        PostgreSQL document_chunks 테이블에서 ILIKE 토큰 매칭.
        공백으로 분리한 토큰이 content에 포함된 행을 점수순 반환.
        한국어·영어 모두 언어 설정 없이 동작.
        """
        tokens = [t.strip() for t in query.split() if len(t.strip()) >= 2]
        if not tokens:
            return []

        # 토큰별 ILIKE 조건 동적 생성
        conditions = " OR ".join(
            [f"content ILIKE :tok{i}" for i in range(len(tokens))]
        )
        # 매칭 토큰 수를 스코어로 사용
        score_expr = " + ".join(
            [f"(CASE WHEN content ILIKE :tok{i} THEN 1 ELSE 0 END)" for i in range(len(tokens))]
        )
        domain_filter = "" if domain == "general" else "AND domain = :domain"

        sql = text(f"""
            SELECT chunk_id, document_id, title, content, domain,
                   ({score_expr}) AS keyword_score
            FROM document_chunks
            WHERE ({conditions}) {domain_filter}
            ORDER BY keyword_score DESC
            LIMIT :limit
        """)

        params = {f"tok{i}": f"%{tok}%" for i, tok in enumerate(tokens)}
        params["limit"] = limit
        if domain != "general":
            params["domain"] = domain

        rows = db.execute(sql, params).fetchall()
        return [
            {
                "chunk_id": row.chunk_id,
                "document_id": row.document_id,
                "title": row.title,
                "content": row.content,
                "score": float(row.keyword_score),
                "domain": row.domain,
                "source": "keyword",
            }
            for row in rows
        ]

    def _rrf_merge(
        self,
        vector_results: list[dict],
        keyword_results: list[dict],
        top_k: int,
    ) -> list[dict]:
        """
        Reciprocal Rank Fusion으로 두 순위 목록을 병합.
        chunk_id를 기준으로 동일 문서 탐지, 중복 제거.
        """
        rrf_scores: dict[str, float] = {}
        merged: dict[str, dict] = {}

        for rank, item in enumerate(vector_results, start=1):
            cid = item["chunk_id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (self.RRF_K + rank)
            if cid not in merged:
                merged[cid] = item

        for rank, item in enumerate(keyword_results, start=1):
            cid = item["chunk_id"]
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (self.RRF_K + rank)
            if cid not in merged:
                merged[cid] = item

        sorted_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)

        results = []
        for cid in sorted_ids[:top_k]:
            item = dict(merged[cid])
            item["score"] = round(rrf_scores[cid], 6)
            item["source"] = "hybrid"
            results.append(item)

        return results
