"""Index the DATA-ROOT labelled multilingual finance corpus for RAG.

The labelled corpus has one JSON document per source document. Each document
contains corpus metadata and a ``sents`` array with Korean source text plus a
machine/post-edited target-language translation. This command preserves those
sentence boundaries, emits one JSONL record per RAG chunk, and stores the same
chunks in PostgreSQL and Qdrant.

Run in the API container (the compose file mounts ``./DATA-ROOT`` read-only)::

    docker compose exec api python -m app.ops.ingest_data_root

For a local preview without database writes::

    python -m app.ops.ingest_data_root --data-root DATA-ROOT --dry-run
"""

from __future__ import annotations

import argparse
import json
import uuid
from collections.abc import Iterator
from pathlib import Path
from typing import Any, TextIO

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.document_chunk import DocumentChunk
from app.services.chunker import TextChunker
from app.services.embedder import EmbeddingService
from app.services.vector_store import VectorStore

DEFAULT_DATA_ROOT = Path("/app/data/DATA-ROOT")
LABEL_DIR_NAME = "02.라벨링데이터"
DEFAULT_JSONL_PATH = Path("/app/data/processed/data_root_label_chunks.jsonl")
DOMAIN = "finance"
BATCH_SIZE = 500


def _text(value: Any) -> str:
    """Convert a corpus field to searchable text without serialising nulls."""
    return str(value).strip() if value not in (None, "") else ""


def _language_label(language: str) -> str:
    return {"en": "영어", "zh": "중국어", "ja": "일본어", "vi": "베트남어", "id": "인도네시아어"}.get(
        language, language
    )


def iter_labelled_docs(data_root: Path) -> Iterator[dict[str, Any]]:
    """Yield RAG-ready documents from every labelled JSON file.

    ``source_cleaned`` and human post-edited ``mtpe`` are preferred. Keeping
    Korean and the target translation in each segment supports bilingual query
    retrieval while avoiding an index made from raw JSON keys/values.
    """
    label_root = data_root / LABEL_DIR_NAME
    if not label_root.is_dir():
        raise FileNotFoundError(f"라벨링 데이터 디렉터리가 없습니다: {label_root}")

    for path in sorted(label_root.rglob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            continue

        meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
        doc_info = data.get("doc_info") if isinstance(data.get("doc_info"), dict) else {}
        relative_path = path.relative_to(data_root).as_posix()
        doc_no = _text(meta.get("doc_no")) or path.stem
        category = _text(meta.get("category")) or path.parent.parent.name
        target_language = _text(meta.get("target_language"))
        title = _text(doc_info.get("title")) or _text(doc_info.get("doc_name")) or f"{category}-{doc_no}"
        document_id = f"label-{uuid.uuid5(uuid.NAMESPACE_URL, relative_path).hex}"

        header = [
            f"문서: {title}",
            f"분류: {category}",
            f"출처: {_text(doc_info.get('source')) or 'DATA-ROOT'}",
        ]
        if _text(doc_info.get("date")):
            header.append(f"일자: {_text(doc_info['date'])}")

        segments: list[str] = []
        for sentence in data.get("sents", []):
            if not isinstance(sentence, dict):
                continue
            korean = _text(sentence.get("source_cleaned")) or _text(sentence.get("source_original"))
            translation = _text(sentence.get("mtpe")) or _text(sentence.get("mt"))
            if not korean and not translation:
                continue

            lines = []
            if _text(sentence.get("page")):
                lines.append(f"페이지: {_text(sentence['page'])}")
            if korean:
                lines.append(f"한국어 원문: {korean}")
            if translation:
                lines.append(f"{_language_label(target_language)} 번역: {translation}")
            segments.append("\n".join(lines))

        if not segments:
            continue

        yield {
            "document_id": document_id,
            "title": title,
            "content": "\n\n".join(["\n".join(header), *segments]),
            "metadata": {
                "dataset": "DATA-ROOT",
                "source_path": relative_path,
                "doc_no": doc_no,
                "category": category,
                "source_language": _text(meta.get("source_language")),
                "target_language": target_language,
                "license": _text(meta.get("license")),
                "source": _text(doc_info.get("source")),
                "date": _text(doc_info.get("date")),
            },
        }


def build_chunk_docs(doc: dict[str, Any], chunker: TextChunker) -> list[dict[str, Any]]:
    return [
        {
            "chunk_id": f"{doc['document_id']}-chunk-{index}",
            "document_id": doc["document_id"],
            "title": doc["title"],
            "content": chunk,
            "chunk_index": index,
            "domain": DOMAIN,
            "metadata": doc["metadata"],
        }
        for index, chunk in enumerate(chunker.split_text(doc["content"]))
    ]


def write_jsonl(handle: TextIO, chunk_docs: list[dict[str, Any]]) -> None:
    for chunk in chunk_docs:
        handle.write(
            json.dumps(
                {
                    "chunk_id": chunk["chunk_id"],
                    "document_id": chunk["document_id"],
                    "title": chunk["title"],
                    "text": chunk["content"],
                    "metadata": {**chunk["metadata"], "chunk_index": chunk["chunk_index"], "domain": chunk["domain"]},
                },
                ensure_ascii=False,
            )
            + "\n"
        )


def flush(chunk_docs: list[dict[str, Any]], embedder: EmbeddingService, vector_store: VectorStore, session) -> None:
    if not chunk_docs:
        return

    vectors = embedder.embed_texts([chunk["content"] for chunk in chunk_docs])
    vector_store.upsert_chunks(chunk_docs, vectors)
    for chunk in chunk_docs:
        # ``metadata`` belongs in Qdrant payload/JSONL; the relational schema
        # deliberately stores only fields needed for keyword retrieval.
        row = {key: value for key, value in chunk.items() if key != "metadata"}
        stmt = pg_insert(DocumentChunk).values(**row)
        stmt = stmt.on_conflict_do_nothing(index_elements=["chunk_id"])
        session.execute(stmt)
    session.commit()


def ingest(data_root: Path, jsonl_path: Path, dry_run: bool = False) -> tuple[int, int]:
    chunker = TextChunker()
    jsonl_path.parent.mkdir(parents=True, exist_ok=True)
    document_count = chunk_count = 0
    batch: list[dict[str, Any]] = []
    session = None if dry_run else SessionLocal()
    embedder = vector_store = None
    if not dry_run:
        embedder = EmbeddingService(settings.embedding_model)
        vector_store = VectorStore()

    try:
        with jsonl_path.open("w", encoding="utf-8") as jsonl_file:
            for doc in iter_labelled_docs(data_root):
                chunk_docs = build_chunk_docs(doc, chunker)
                write_jsonl(jsonl_file, chunk_docs)
                document_count += 1
                chunk_count += len(chunk_docs)
                batch.extend(chunk_docs)
                if not dry_run and len(batch) >= BATCH_SIZE:
                    flush(batch, embedder, vector_store, session)
                    batch = []
                    print(f"{document_count} docs / {chunk_count} chunks indexed", flush=True)
            if not dry_run:
                flush(batch, embedder, vector_store, session)
    finally:
        if session is not None:
            session.close()

    action = "previewed" if dry_run else "indexed"
    print(f"DATA-ROOT labels {action}: {document_count} docs -> {chunk_count} chunks")
    print(f"JSONL: {jsonl_path}")
    return document_count, chunk_count


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Index DATA-ROOT labelled corpus for RAG")
    parser.add_argument("--data-root", type=Path, default=DEFAULT_DATA_ROOT)
    parser.add_argument("--jsonl-path", type=Path, default=DEFAULT_JSONL_PATH)
    parser.add_argument("--dry-run", action="store_true", help="write JSONL but do not connect to databases")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ingest(data_root=args.data_root, jsonl_path=args.jsonl_path, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
