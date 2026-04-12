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

app = FastAPI(title="Maharashtra Crime Heatmap API", version="1.0.0")

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
    # Ensure the processed dataset exists in memory.
    load_processed()
