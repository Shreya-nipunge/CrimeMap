# backend/app/services/analytics_service.py
from typing import List, Dict, Any

def compute_safety_score_and_trends(data: List[Dict[str, Any]], target_district: str) -> Dict[str, Any]:
    """
    Computes Safety Score, Trends, and Rank for a specific district.
    State data must contain multiple years for trend, and all districts for normalization and rank.
    """
    if not data:
        return {"score": 0, "risk": "Low", "trend": "Stable", "rank": 0, "state_avg_diff": 0}

    # Aggregate total scores per district (latest year or sum, here we use sum over available years.
    # Alternatively, just use the latest year data for comparison)
    # Let's find the latest year in the dataset
    latest_year = max(int(r.get("year", 0)) for r in data)
    
    district_latest_scores = {}
    for r in data:
        y = int(r.get("year", 0))
        if y == latest_year:
            district_latest_scores[r.get("district")] = int(r.get("crime_score", 0))

    if not district_latest_scores:
        return {"score": 0, "risk": "Low", "trend": "Stable", "rank": 0, "state_avg_diff": 0}

    max_state_score = max(district_latest_scores.values()) if dict.values else 1
    if max_state_score == 0:
        max_state_score = 1
        
    state_avg_score = sum(district_latest_scores.values()) / len(district_latest_scores)

    target_score_raw = district_latest_scores.get(target_district, 0)
    
    # Normalize per state
    normalized_score = min(int((target_score_raw / max_state_score) * 100), 100)
    
    # Risk Label
    if normalized_score >= 80:
        risk = "High"
    elif normalized_score >= 40:
        risk = "Moderate"
    else:
        risk = "Low"

    # Rank (Lowest crime score = Rank 1 Safest)
    sorted_districts = sorted(district_latest_scores.items(), key=lambda x: x[1])
    rank = 0
    total_districts = len(sorted_districts)
    for idx, (dist, _) in enumerate(sorted_districts):
        if dist == target_district:
            rank = idx + 1
            break

    # State avg diff in %
    # How much higher or lower is the district's raw score from state average?
    if state_avg_score > 0:
        pct_diff = ((target_score_raw - state_avg_score) / state_avg_score) * 100
    else:
        pct_diff = 0

    # Trend logic (for the target district)
    district_data = [r for r in data if r.get("district") == target_district]
    district_data_sorted = sorted(district_data, key=lambda x: int(x.get("year", 0)))
    trend = "Stable"
    if len(district_data_sorted) >= 2:
        last = int(district_data_sorted[-1].get("crime_score", 0))
        prev = int(district_data_sorted[-2].get("crime_score", 0))
        if last > prev:
            trend = "Increasing"
        elif last < prev:
            trend = "Decreasing"

    return {
        "score": normalized_score,
        "risk": risk,
        "rank": rank,
        "total": total_districts,
        "state_avg_diff": int(pct_diff),
        "trend": trend,
        "raw_score": target_score_raw
    }

def get_rising_crimes(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Computes top 3 rising crimes for the given state dataset.
    """
    if not data:
        return []
        
    latest_year = max(int(r.get("year", 0)) for r in data)
    prev_year = latest_year - 1
    
    crime_keys = ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape"]
    latest_counts = {k: 0 for k in crime_keys}
    prev_counts = {k: 0 for k in crime_keys}
    
    has_prev = False
    
    for r in data:
        y = int(r.get("year", 0))
        if y == latest_year:
            for k in crime_keys:
                latest_counts[k] += int(r.get(k, 0))
        elif y == prev_year:
            has_prev = True
            for k in crime_keys:
                prev_counts[k] += int(r.get(k, 0))

    if not has_prev:
        # If we only have 1 year of data, just return top crimes by volume for now instead of rising
        crimes = [{'type': k.title().replace('_', ' '), 'growth_pct': 0, 'latest': v} for k, v in latest_counts.items()]
        crimes.sort(key=lambda x: x['latest'], reverse=True)
        return crimes[:3]

    results = []
    for k in crime_keys:
        prev = prev_counts[k]
        latest = latest_counts[k]
        if prev > 0:
            growth = ((latest - prev) / prev) * 100
        else:
            growth = 100.0 if latest > 0 else 0.0
            
        results.append({
            'type': k.title().replace('_', ' '),
            'growth_pct': int(growth),
            'latest': latest,
            'prev': prev
        })
        
    results.sort(key=lambda x: x['growth_pct'], reverse=True)
    return results[:3]
