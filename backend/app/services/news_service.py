# backend/app/services/news_service.py
import requests
import os
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables (fallback if not already loaded in main.py)
from pathlib import Path
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

def get_crime_news(city: str) -> List[Dict[str, Any]]:
    """Fetch recent crime news for a specific city using NewsAPI."""
    if not city:
        return []

    # Mandatory city name + any of the crime keywords for stricter filtering
    q = f'+{city} AND (crime OR police OR robbery OR arrested OR murder OR investigation OR FIR)'
    
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": q,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 20,  # Increase to allow for stricter filtering
        "apiKey": NEWS_API_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        articles = data.get("articles", [])
        
        filtered_articles = []
        excluded_terms = ["movie", "netflix", "series", "trailer", "tv show", "bollywood", "hollywood", "actor", "actress"]
        
        for art in articles:
            title = (art.get("title") or "").lower()
            description = (art.get("description") or "").lower()
            
            # Simple check for entertainment-related junk
            if any(term in title or term in description for term in excluded_terms):
                continue
                
            filtered_articles.append({
                "title": art.get("title"),
                "description": art.get("description"),
                "url": art.get("url"),
                "image": art.get("urlToImage"),
                "source": art.get("source", {}).get("name"),
                "publishedAt": art.get("publishedAt")
            })
            
            # Limit to 6 results as requested
            if len(filtered_articles) >= 6:
                break
                
        return filtered_articles

    except Exception as e:
        print(f"Error fetching news for {city}: {e}")
        return []
