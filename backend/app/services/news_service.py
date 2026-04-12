import time
import os
import requests
from datetime import datetime
from dotenv import load_dotenv
from typing import List, Dict, Any, Tuple

# Load environment variables
from pathlib import Path
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

# Simple In-Memory Cache for Hackathon Demo
news_cache = {}  # { normalized_query: (articles_list, cache_timestamp) }
CACHE_TTL = 300  # 5 minutes in seconds

TRUSTED_SOURCES = ["The Hindu", "Indian Express", "Times of India", "BBC News", "Reuters", "NDTV"]

def get_severity(text: str) -> str:
    text = text.lower()
    # High-intensity keywords for judge impact
    if any(w in text for w in ["murder", "rape", "kill", "terror", "gang", "multiple victims", "weapon"]):
        return "high"
    if any(w in text for w in ["robbery", "assault", "fraud", "theft", "clash", "arrest"]):
        return "medium"
    return "low"

def get_location_hint(text: str) -> str:
    # Very basic regional extraction for OSINT effect
    text = text.title()
    for word in ["Mumbai", "Thane", "Pune", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata"]:
        if word in text:
            return word
    return None

def get_crime_news(query: str) -> List[Dict[str, Any]]:
    """Fetch and classify crime news with caching and fallback intelligence."""
    if not NEWS_API_KEY:
        raise ValueError("NEWS_API_KEY not configured")

    # Normalize query for cache integrity
    normalized_query = (query or "India").strip().lower()
    now = time.time()

    if normalized_query in news_cache:
        cached_data, timestamp = news_cache[normalized_query]
        if now - timestamp < CACHE_TTL:
            print(f"DEBUG: Serving OSINT cache for '{normalized_query}'")
            return cached_data

    # Context-Aware Enrichment: Ensure we actually get crime-related data
    search_query = f"{normalized_query} crime OR police OR FIR OR arrest"

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": search_query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 20,
        "apiKey": NEWS_API_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        articles = data.get("articles", [])
        filtered_articles = []
        excluded_terms = ["movie", "netflix", "series", "trailer", "tv show", "bollywood", "hollywood", "actor", "actress"]
        crime_keywords = ["murder", "robbery", "theft", "assault", "fraud", "rape", "arrest", "fir", "police", "investigation"]
        
        seen_titles = set()

        for art in articles:
            title = (art.get("title") or "")
            description = (art.get("description") or "")
            t_low = title.lower()
            d_low = description.lower()
            
            # 1. Deduplication
            if t_low in seen_titles: continue
            seen_titles.add(t_low)

            # 2. Strict Filter (Remove Entertainment)
            if any(term in t_low or term in d_low for term in excluded_terms):
                continue
            
            # 3. Mandatory Keywords (Ensures Intelligence Relevance)
            if not any(word in t_low or word in d_low for word in crime_keywords):
                continue
            
            # Intelligence Enrichment
            source = art.get("source", {}).get("name")
            is_trusted = source in TRUSTED_SOURCES
            combined_text = title + " " + description
            
            # Date Formatting
            published_at = art.get("publishedAt")
            formatted_date = "Recent"
            if published_at:
                try:
                    formatted_date = datetime.fromisoformat(published_at.replace("Z", "")).strftime("%d %b %Y")
                except: pass

            filtered_articles.append({
                "title": title,
                "description": description,
                "url": art.get("url"),
                "image": art.get("urlToImage"),
                "source": source,
                "publishedAt": formatted_date,
                "severity": get_severity(combined_text),
                "confidence": "high" if is_trusted else "medium",
                "location_hint": get_location_hint(combined_text)
            })
            
            if len(filtered_articles) >= 6: break

        # Resilient Fallback: If filtering is too strict, return raw results to ensure UI is never empty
        result_set = filtered_articles if len(filtered_articles) >= 3 else [
            {
                "title": a.get("title"),
                "description": a.get("description"),
                "url": a.get("url"),
                "image": a.get("urlToImage"),
                "source": a.get("source", {}).get("name"),
                "publishedAt": "Recent",
                "severity": "low",
                "confidence": "medium",
                "location_hint": None
            } for a in articles[:6]
        ]

        # Cache only valid data
        if result_set:
            news_cache[normalized_query] = (result_set, now)
            
        return result_set

    except Exception as e:
        print(f"CRITICAL: OSINT fetch error: {e}")
        return []
