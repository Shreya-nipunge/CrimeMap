# backend/app/routes/news.py
from fastapi import APIRouter, HTTPException
from ..services.news_service import get_crime_news
from typing import List, Dict, Any

router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("/")
def fetch_news(q: str):
    """Fetch crime news using a query parameter (e.g., ?q=Mumbai robbery)."""
    news = get_crime_news(q)
    return news
