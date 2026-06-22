from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import inspect, text

from app.api.routes import router
from app.core.config import settings
from app.db.session import Base, engine

Base.metadata.create_all(bind=engine)

try:
    inspector = inspect(engine)
    cols = [c['name'] for c in inspector.get_columns('study_intakes')] if inspector.has_table('study_intakes') else []
    if cols and 'source_bundle' not in cols:
        with engine.begin() as conn:
            conn.execute(text('ALTER TABLE study_intakes ADD COLUMN source_bundle TEXT'))
except Exception:
    pass

app = FastAPI(title=settings.app_name)
app.include_router(router)
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "app_name": settings.app_name})
