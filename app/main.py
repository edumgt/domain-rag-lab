from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from functools import lru_cache
import os
from pathlib import Path
import re
import requests

from pgvector.sqlalchemy import Vector  # noqa: F401 — SQLAlchemy type 등록

from app.api.routes.chat import router as chat_router
from app.api.routes.health import router as health_router
from app.api.routes.ingest import router as ingest_router
from app.api.routes.market import router as market_router
from app.api.routes.backtest import router as backtest_router
from app.api.routes.auth import router as auth_router
from app.core.config import settings
from app.core.database import Base, engine

# 모든 모델을 import해야 Base.metadata가 테이블을 인식함
import app.models.chat_log           # noqa: F401
import app.models.document_chunk     # noqa: F401
import app.models.long_term_memory   # noqa: F401
import app.models.user               # noqa: F401
import app.models.stock_price_history  # noqa: F401

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

_HISTORIC_BOND_DETAIL_URL = "https://www.emuseum.go.kr/detail?relicId=PS0100202500100758500000"


@lru_cache(maxsize=1)
def _load_historic_bond_image() -> tuple[bytes, str]:
    """Fetch the unchanged, attributed e-Museum image through its required session."""
    session = requests.Session()
    detail = session.get(_HISTORIC_BOND_DETAIL_URL, timeout=15)
    detail.raise_for_status()
    match = re.search(r'<img src="(?P<path>/IMG/[^"]+)" alt="대한민국정부 건국국채증서 일백환', detail.text)
    if not match:
        raise ValueError("Historic bond image path was not found")
    image = session.get(
        f"https://www.emuseum.go.kr{match.group('path')}",
        headers={"Referer": _HISTORIC_BOND_DETAIL_URL},
        timeout=15,
    )
    image.raise_for_status()
    return image.content, image.headers.get("Content-Type", "image/jpeg").split(";")[0]


@app.get("/learning/historic-bond-image", include_in_schema=False)
def historic_bond_image():
    """Serve the public e-Museum bond image without browser hotlink failures."""
    try:
        content, media_type = _load_historic_bond_image()
    except (requests.RequestException, ValueError) as error:
        raise HTTPException(status_code=502, detail="국채 사료 이미지를 불러오지 못했습니다.") from error
    return Response(content=content, media_type=media_type, headers={"Cache-Control": "public, max-age=86400"})


@app.middleware("http")
async def prevent_frontend_cache(request: Request, call_next):
    """Always refresh the client shell and its mutable local assets."""
    response = await call_next(request)
    if request.url.path == "/" or request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

app.include_router(health_router)
app.include_router(ingest_router)
app.include_router(market_router)
app.include_router(backtest_router)
app.include_router(auth_router)
app.include_router(chat_router)

# Serve frontend static files
_frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
_data_dir = Path(os.path.join(os.path.dirname(__file__), "..", "data")).resolve()
_learning_text_extensions = {".txt", ".md", ".mdx"}


def _learning_document_title(path: Path) -> str:
    """Return the first Markdown H1, falling back to the file stem."""
    try:
        with path.open("r", encoding="utf-8") as source:
            for line in source:
                if line.startswith("# "):
                    return line[2:].strip()
    except OSError:
        pass
    return path.stem


@app.get("/learning/documents")
def list_learning_documents():
    """Expose every text learning document stored beneath ``data``."""
    if not _data_dir.is_dir():
        return []

    documents = []
    for path in sorted(_data_dir.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in _learning_text_extensions:
            continue
        documents.append(
            {
                "path": path.relative_to(_data_dir).as_posix(),
                "filename": path.name,
                "title": _learning_document_title(path),
            }
        )
    return documents


@app.get("/learning/document")
def read_learning_document(path: str):
    """Return one text document beneath ``data`` without path traversal."""
    requested_path = (_data_dir / path).resolve()
    if (
        requested_path == _data_dir
        or _data_dir not in requested_path.parents
        or not requested_path.is_file()
        or requested_path.suffix.lower() not in _learning_text_extensions
    ):
        raise HTTPException(status_code=404, detail="학습 문서를 찾을 수 없습니다.")

    try:
        with requested_path.open("r", encoding="utf-8") as source:
            return {
                "path": requested_path.relative_to(_data_dir).as_posix(),
                "filename": requested_path.name,
                "title": _learning_document_title(requested_path),
                "content": source.read(),
            }
    except OSError as error:
        raise HTTPException(status_code=500, detail="학습 문서를 읽을 수 없습니다.") from error


if os.path.isdir(_frontend_dir):
    app.mount("/static", StaticFiles(directory=_frontend_dir), name="static")

    @app.get("/", include_in_schema=False)
    def serve_index():
        # The client shell references versioned static assets, but the HTML itself
        # must also be refreshed so a deployed UI immediately picks up new assets.
        return FileResponse(
            os.path.join(_frontend_dir, "index.html"),
            headers={"Cache-Control": "no-store, max-age=0"},
        )
