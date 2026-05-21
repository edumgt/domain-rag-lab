"""
Executes registered tools on behalf of the Main Orchestrator.
"""

import json

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.embedder import EmbeddingService
from app.services.hybrid_search import HybridSearchService
from app.services.long_term_memory_service import LongTermMemoryService
from app.services.session_memory import SessionMemoryService


class ToolExecutor:
    def __init__(self):
        self.embedder = EmbeddingService(settings.embedding_model)
        self.hybrid_search = HybridSearchService()
        self.session_memory = SessionMemoryService()
        self.long_term_memory = LongTermMemoryService()

    def execute(self, tool_name: str, arguments: dict, db: Session) -> str:
        """Execute a named tool and return the result as a JSON string."""
        handlers = {
            "search_documents": self._search_documents,
            "get_session_history": self._get_session_history,
            "get_long_term_memory": self._get_long_term_memory,
        }
        handler = handlers.get(tool_name)
        if handler is None:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})
        try:
            return handler(db=db, **arguments)
        except Exception as e:
            return json.dumps({"error": str(e), "tool": tool_name})

    # ── Tool implementations ──────────────────────────────────────

    def _search_documents(
        self, db: Session, query: str, domain: str, top_k: int = 4
    ) -> str:
        query_vector = self.embedder.embed_query(query)
        chunks = self.hybrid_search.search(
            db=db,
            query=query,
            query_vector=query_vector,
            domain=domain,
            top_k=top_k,
        )
        result = [
            {
                "chunk_id": c["chunk_id"],
                "title": c["title"],
                "content": c["content"],
                "score": round(c["score"], 4),
                "domain": c.get("domain", domain),
            }
            for c in chunks
        ]
        return json.dumps({"documents": result, "count": len(result)}, ensure_ascii=False)

    def _get_session_history(self, db: Session, session_id: str) -> str:
        history = self.session_memory.get_recent_turns(db, session_id)
        serializable = [
            {
                "question": h["question"],
                "answer": h["answer"],
                "created_at": str(h.get("created_at", "")),
            }
            for h in history
        ]
        return json.dumps(
            {"session_history": serializable, "turns": len(serializable)},
            ensure_ascii=False,
        )

    def _get_long_term_memory(self, db: Session, query: str, domain: str) -> str:
        query_vector = self.embedder.embed_query(query)
        hits = self.long_term_memory.search(db=db, query_vector=query_vector, domain=domain)
        serializable = [
            {
                "content": h["content"],
                "domain": h["domain"],
                "distance": h["distance"],
            }
            for h in hits
        ]
        return json.dumps(
            {"memories": serializable, "count": len(serializable)}, ensure_ascii=False
        )
