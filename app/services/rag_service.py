import os
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document_chunk import DocumentChunk
from app.services.chunker import TextChunker
from app.services.context_router import ContextRouter
from app.services.embedder import EmbeddingService
from app.services.file_parser import FileParser
from app.services.hybrid_search import HybridSearchService
from app.services.llm_service import LLMService
from app.services.long_term_memory_service import LongTermMemoryService
from app.services.session_memory import SessionMemoryService
from app.services.vector_store import VectorStore


class RAGService:
    """
    전체 RAG 파이프라인 조율자
    ─────────────────────────
    ask() 한 번 호출 시 내부 흐름:

    1. ContextRouter → SQL vs Vector 우선순위 결정
    2. (session_id 있으면) SessionMemory → PostgreSQL에서 최근 N턴 조회
    3. HybridSearch → Qdrant(벡터) + PostgreSQL(키워드) RRF 병합
    4. (session_id 있으면) LongTermMemory → pgvector 유사 기억 검색
    5. LLMService → 세 소스를 구분하여 프롬프트 조립 후 LLM 호출
    6. ChatLog 저장 + 중요 대화면 LongTermMemory에 승격
    """

    def __init__(self):
        self.parser = FileParser()
        self.chunker = TextChunker()
        self.embedder = EmbeddingService(settings.embedding_model)
        self.vector_store = VectorStore()
        self.hybrid_search = HybridSearchService()
        self.session_memory = SessionMemoryService()
        self.long_term_memory = LongTermMemoryService()
        self.context_router = ContextRouter()
        self.llm = LLMService()

    # ── 문서 수집(Ingest) ────────────────────────────────────────

    def ingest_text(
        self, db: Session, document_id: str, title: str, content: str, domain: str = "general"
    ) -> int:
        chunks = self.chunker.split_text(content)
        if not chunks:
            return 0

        chunk_docs = []
        pg_rows = []
        for idx, chunk in enumerate(chunks):
            chunk_id = f"{document_id}-chunk-{idx}"
            chunk_docs.append(
                {
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "title": title,
                    "content": chunk,
                    "chunk_index": idx,
                    "domain": domain,
                }
            )
            pg_rows.append(
                DocumentChunk(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    title=title,
                    content=chunk,
                    chunk_index=idx,
                    domain=domain,
                )
            )

        # 1) Qdrant: 벡터 저장
        vectors = self.embedder.embed_texts([c["content"] for c in chunk_docs])
        self.vector_store.upsert_chunks(chunk_docs, vectors)

        # 2) PostgreSQL: 키워드 검색용 이중 저장 (ON CONFLICT 방지)
        for row in pg_rows:
            existing = (
                db.query(DocumentChunk)
                .filter(DocumentChunk.chunk_id == row.chunk_id)
                .first()
            )
            if not existing:
                db.add(row)
        db.commit()

        return len(chunk_docs)

    def ingest_file(self, db: Session, saved_path: str, original_filename: str, domain: str = "general"):
        text = self.parser.parse_file(saved_path)
        document_id = str(uuid.uuid4())
        count = self.ingest_text(
            db=db,
            document_id=document_id,
            title=original_filename,
            content=text,
            domain=domain,
        )
        return {
            "document_id": document_id,
            "title": original_filename,
            "chunks": count,
            "text_length": len(text),
            "domain": domain,
        }

    def save_upload_file(self, filename: str, file_bytes: bytes) -> str:
        os.makedirs(settings.upload_dir, exist_ok=True)
        safe_name = f"{uuid.uuid4()}_{filename}"
        save_path = os.path.join(settings.upload_dir, safe_name)
        with open(save_path, "wb") as f:
            f.write(file_bytes)
        return save_path

    # ── 질문 응답(Ask) ────────────────────────────────────────────

    def ask(
        self,
        db: Session,
        question: str,
        domain: str = "general",
        session_id: str | None = None,
        top_k: int | None = None,
    ) -> tuple[str, list[dict], dict]:
        """
        Returns
        -------
        answer        : LLM 생성 답변
        chunks        : 참조 문서 청크 목록
        context_meta  : 사용된 컨텍스트 소스 메타 (디버깅용)
        """
        final_top_k = top_k or settings.top_k

        # ── 1. 라우팅 결정 ──────────────────────────────────────
        decision = self.context_router.route(question, session_id)

        # ── 2. 단기 세션 기억 조회 (SQL) ────────────────────────
        session_history: list[dict] = []
        if decision.use_session and session_id:
            session_history = self.session_memory.get_recent_turns(db, session_id)

        # ── 3. 하이브리드 문서 검색 (Qdrant + PostgreSQL) ───────
        chunks: list[dict] = []
        if decision.use_vector:
            query_vector = self.embedder.embed_query(question)
            chunks = self.hybrid_search.search(
                db=db,
                query=question,
                query_vector=query_vector,
                domain=domain,
                top_k=final_top_k,
            )

        # ── 4. 장기 기억 검색 (pgvector) ────────────────────────
        long_term_hits: list[dict] = []
        if decision.use_long_term and session_id:
            if not chunks:  # 벡터 아직 없으면 계산
                query_vector = self.embedder.embed_query(question)
            long_term_hits = self.long_term_memory.search(
                db=db,
                query_vector=query_vector,
                domain=domain,
            )

        # ── 5. LLM 호출 ─────────────────────────────────────────
        answer = self.llm.generate_answer(
            question=question,
            chunks=chunks,
            domain=domain,
            session_history=session_history,
            long_term_hits=long_term_hits,
            routing_priority=decision.priority,
        )

        # ── 6. 장기 기억 승격: session_id + 답변이 충분히 길면 저장 ─
        if session_id and len(answer) > 80 and chunks:
            memory_text = f"Q: {question}\nA: {answer[:400]}"
            if not chunks:
                query_vector = self.embedder.embed_query(question)
            mem_vector = self.embedder.embed_query(memory_text)
            self.long_term_memory.store(
                db=db,
                content=memory_text,
                embedding=mem_vector,
                session_id=session_id,
                domain=domain,
            )

        context_meta = {
            "routing": decision.priority,
            "routing_reason": decision.reason,
            "session_turns": len(session_history),
            "vector_chunks": len(chunks),
            "long_term_hits": len(long_term_hits),
        }
        return answer, chunks, context_meta
