from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from simulation import router

app = FastAPI(title="Walk-Forward Lab")
app.include_router(router)
frontend = Path('/app/frontend')
app.mount('/static/assets', StaticFiles(directory=frontend / 'assets'), name='assets')

@app.get('/walk-forward.html', include_in_schema=False)
def page():
    return FileResponse(frontend / 'walk-forward.html', headers={'Cache-Control': 'no-store'})

@app.get('/health')
def health():
    return {'status': 'ok'}
