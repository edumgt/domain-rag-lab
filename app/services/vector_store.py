import time
import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

from app.core.config import settings


class VectorStore:
    def __init__(self):
        self.client = QdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
            check_compatibility=False,
        )
        self.collection_name = settings.qdrant_collection
        self.vector_size = settings.embedding_dim
        self._ensure_collection()

    def _ensure_collection(self):
        # Compose에서 Qdrant 컨테이너가 막 기동된 직후에도 API가 안정적으로
        # 시작하도록 준비 완료까지 잠시 재시도한다.
        last_error = None
        for _ in range(15):
            try:
                collections = [c.name for c in self.client.get_collections().collections]
                break
            except Exception as error:
                last_error = error
                time.sleep(2)
        else:
            raise RuntimeError(
                f"Qdrant 연결에 실패했습니다 ({settings.qdrant_host}:{settings.qdrant_port})."
            ) from last_error

        if self.collection_name not in collections:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
            )

    def upsert_chunks(self, chunks: list[dict], vectors: list[list[float]]):
        points = []

        for chunk, vector in zip(chunks, vectors):
            point_id = str(uuid.uuid4())
            payload = {
                "chunk_id": chunk["chunk_id"],
                "document_id": chunk["document_id"],
                "title": chunk["title"],
                "content": chunk["content"],
                "chunk_index": chunk["chunk_index"],
                "domain": chunk.get("domain", "general"),
            }
            points.append(PointStruct(id=point_id, vector=vector, payload=payload))

        self.client.upsert(collection_name=self.collection_name, points=points)

    def search(self, query_vector: list[float], top_k: int = 4, domain: str | None = None):
        query_filter = None
        if domain and domain != "general":
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="domain",
                        match=MatchValue(value=domain),
                    )
                ]
            )

        return self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=top_k,
            query_filter=query_filter,
        )
