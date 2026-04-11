# backend/app/routes/news.py
from fastapi import APIRouter, HTTPException
from ..services.news_service import get_crime_news
from typing import List, Dict, Any

router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("/{city}")
def fetch_news(city: str):
    """Fetch crime news for a given city."""
    news = get_crime_news(city)
    return news
