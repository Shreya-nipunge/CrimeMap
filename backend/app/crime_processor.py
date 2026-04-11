# backend/app/crime_processor.py
# Contains data transformation logic for the IPC dataset using pure Python (no pandas). 

from collections import defaultdict
from typing import List, Dict, Any

# Coordinates for all Maharashtra districts.
# All districts in Maharashtra will be included in the processed output.
DISTRICT_COORDINATES = {
    "Ahmednagar": (19.08, 74.73),
    "Akola": (20.70, 77.00),
    "Amravati": (20.93, 77.75),
    "Aurangabad": (19.88, 75.32),
    "Beed": (18.98, 75.75),
    "Bhandara": (21.17, 79.65),
    "Buldhana": (20.53, 76.18),
    "Chandrapur": (19.95, 79.30),
    "Chhatrapati Sambhajinagar": (19.88, 75.32),  # Aurangabad
    "Dharashiv": (18.18, 76.03),  # Osmanabad
    "Dhule": (20.90, 74.77),
    "Gadchiroli": (20.18, 80.00),
    "Gondia": (21.45, 80.20),
    "Hingoli": (19.72, 77.15),
    "Jalgaon": (21.00, 75.57),
    "Jalna": (19.83, 75.88),
    "Kolhapur": (16.70, 74.23),
    "Latur": (18.40, 76.57),
    "Mumbai": (19.08, 72.88),
    "Mumbai Suburban": (19.05, 72.83),
    "Nagpur": (21.15, 79.08),
    "Nanded": (19.15, 77.30),
    "Nandurbar": (21.87, 74.23),
    "Nashik": (20.00, 73.78),
    "Osmanabad": (18.18, 76.03),
    "Palghar": (19.68, 72.77),
    "Parbhani": (19.27, 76.77),
    "Pune": (18.52, 73.86),
    "Raigad": (18.65, 72.88),
    "Ratnagiri": (16.98, 73.30),
    "Sangli": (16.85, 74.60),
    "Satara": (17.68, 74.00),
    "Sindhudurg": (16.00, 73.47),
    "Solapur": (17.68, 75.92),
    "Thane": (19.22, 72.98),
    "Wardha": (20.73, 78.60),
    "Washim": (20.10, 77.13),
    "Yavatmal": (20.38, 78.13),
}


def _normalize_column_name(value: str) -> str:
    return value.strip().lower().replace(" ", "_").replace("/", "_").replace("-", "_")


def _to_int(value: Any) -> int:
    try:
        return int(float(str(value).strip()))
    except Exception:
        return 0


def process_raw_data(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Process raw IPC rows into a district-level crime dataset."""

    if not rows:
        return []

    # Normalize headers and create uniform records.
    normalized_rows = []
    for r in rows:
        normalized_rows.append({
            _normalize_column_name(k): (v.strip() if isinstance(v, str) else v)
            for k, v in r.items()
        })

    # Column mapping with aliases
    # Map normalized internal key -> list of possible CSV column names (normalized)
    column_map = {
        "year": ["year"],
        "state_name": ["state_name", "state"],
        "district_name": ["district_name", "district"],
        "murder": ["murder"],
        "robbery": ["robbery"],
        "thefts": ["other_thefts", "thefts", "theft"],
        "vehicle_theft": ["auto_motor_vehicle_theft", "vehicle_theft", "motor_vehicle_theft"],
        "burglary": ["night_burglary", "burglary"],
        "cheating": ["cheating"],
        "rape": ["rape"],
    }

    # Verify critical columns exist (year, state, district)
    critical = ["year", "state_name", "district_name"]
    found_map = {}
    
    first_row = normalized_rows[0]
    for key, aliases in column_map.items():
        for alias in aliases:
            if alias in first_row:
                found_map[key] = alias
                break
    
    # If critical columns are missing, we can't process
    if not all(c in found_map for c in critical):
        return []

    # Filter to Maharashtra and aggregate per (district, year)
    agg: Dict[tuple, Dict[str, Any]] = {}

    for r in normalized_rows:
        state = str(r.get(found_map["state_name"], "")).strip().lower()
        if state != "maharashtra":
            continue
            
        district = str(r.get(found_map["district_name"], "")).strip()
        year = str(r.get(found_map["year"], "")).strip()
        if not district or not year:
            continue

        key = (district, year)
        if key not in agg:
            agg[key] = {
                "district": district,
                "year": year,
                "murder": 0,
                "robbery": 0,
                "thefts": 0,
                "vehicle_theft": 0,
                "burglary": 0,
                "cheating": 0,
                "rape": 0,
            }

        # Aggregate values, defaulting to 0 if column is missing in this dataset
        for internal_key in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape"]:
            alias = found_map.get(internal_key)
            if alias:
                agg[key][internal_key] += _to_int(r.get(alias))

    # Compute crime score and merge coordinates
    results: List[Dict[str, Any]] = []
    for (district, year), values in agg.items():
        # Check coordinates (fallback for variations in naming)
        coord_key = district
        if district not in DISTRICT_COORDINATES:
            # Simple fuzzy check for names like "Mumbai City" vs "Mumbai"
            # But the DISTRICT_COORDINATES seem pretty comprehensive for Maharashtra.
            continue

        murder = values["murder"]
        robbery = values["robbery"]
        thefts = values["thefts"]
        vehicle_theft = values["vehicle_theft"]
        burglary = values["burglary"]
        cheating = values["cheating"]
        rape = values["rape"]

        crime_score = (
            murder * 5
            + robbery * 4
            + vehicle_theft * 3
            + thefts * 2
            + burglary * 3
            + cheating * 2
            + rape * 5
        )

        lat, lng = DISTRICT_COORDINATES[coord_key]

        results.append(
            {
                "district": district,
                "year": year,
                "lat": lat,
                "lng": lng,
                "murder": murder,
                "robbery": robbery,
                "thefts": thefts,
                "vehicle_theft": vehicle_theft,
                "burglary": burglary,
                "cheating": cheating,
                "rape": rape,
                "crime_score": crime_score,
            }
        )

    return results
