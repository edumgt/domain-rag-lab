from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from pgvector.sqlalchemy import Vector  # noqa: F401 — SQLAlchemy type 등록

from app.api.routes.chat import router as chat_router
from app.api.routes.health import router as health_router
from app.api.routes.ingest import router as ingest_router
from app.api.routes.market import router as market_router
from app.core.config import settings
from app.core.database import Base, engine

# 모든 모델을 import해야 Base.metadata가 테이블을 인식함
import app.models.chat_log          # noqa: F401
import app.models.document_chunk    # noqa: F401
import app.models.long_term_memory  # noqa: F401

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)


@app.middleware("http")
async def prevent_frontend_cache(request: Request, call_next):
    """Always refresh the client shell and its mutable local assets."""
    response = await call_next(request)
    if request.url.path in {"/", "/static/app.js", "/static/style.css"}:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

app.include_router(health_router)
app.include_router(ingest_router)
app.include_router(market_router)
app.include_router(chat_router)

# Serve frontend static files
_frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
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
