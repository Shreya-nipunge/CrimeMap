# backend/app/main.py
# FastAPI application entrypoint for the crime analytics dashboard.

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
from pathlib import Path

# Consolidate environment loading at the root of the app
# Try root path first, then parent of backend
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from .routes import router
from .routes import news
from .dataset_loader import load_processed

app = FastAPI(title="CrimeMap India API", version="2.0.0")

# Allow the frontend dev server and any other origins in production.
# Note: allow_credentials=True is incompatible with allow_origins=["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # Set to False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the static uploads directory
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(router, prefix="/api")
app.include_router(news.router)


@app.on_event("startup")
def startup_event():
    """Pre-warm: load processed data for Maharashtra (fast startup).
    Other states are loaded lazily on first request."""
    load_processed("Maharashtra")


@app.get("/api/states")
def get_states():
    """Returns the list of all available states from district_coords.json."""
    import json
    coords_file = Path(__file__).resolve().parent.parent / "data" / "district_coords.json"
    if coords_file.exists():
        states = list(json.loads(coords_file.read_text(encoding="utf-8")).keys())
        return {"states": sorted(states), "total": len(states)}
    return {"states": [], "total": 0}
