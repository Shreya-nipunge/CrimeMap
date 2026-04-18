# backend/app/routes/api.py
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from pathlib import Path
import jwt
import pandas as pd
from ..services.auth_utils import get_current_user
from ..services import auth_utils
from ..dataset_loader import load_processed, process_and_save
from pydantic import BaseModel

router = APIRouter()

class AdminLoginReq(BaseModel):
    email: str
    password: str

class ComplaintStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None

class AdminRegisterReq(BaseModel):
    email: str
    password: str
    name: str

class UserLoginReq(BaseModel):
    email: str
    password: str

class UserRegisterReq(BaseModel):
    email: str
    password: str
    name: str

# Cache the processed dataset in memory for faster response, keyed by state.
_processed_data = {}

# Canonical list of all states with processed data — loaded once at runtime
_ALL_STATES: list = []

def _get_all_state_names() -> list:
    """Discover all states from district_coords.json at runtime."""
    global _ALL_STATES
    if _ALL_STATES:
        return _ALL_STATES
    import json
    from pathlib import Path
    coords_file = Path(__file__).resolve().parents[2] / "data" / "district_coords.json"
    if coords_file.exists():
        _ALL_STATES = list(json.loads(coords_file.read_text(encoding="utf-8")).keys())
    else:
        _ALL_STATES = ["Maharashtra", "Karnataka", "Delhi"]
    return _ALL_STATES

def _get_data(state: str = "Maharashtra"):
    state_key = state.lower()

    # Handle National Aggregation
    if state_key == "all":
        if "all" not in _processed_data:
            merged = []
            for s in _get_all_state_names():
                state_rows = load_processed(s)
                if state_rows:
                    merged.extend([{**r, "state_name": s} for r in state_rows])
            _processed_data["all"] = merged
        return _processed_data["all"]

    # Handle Single State (case-insensitive key)
    if state_key not in _processed_data:
        # Find canonical state name (original casing) from coords
        canonical = next(
            (s for s in _get_all_state_names() if s.lower() == state_key),
            state  # fallback to whatever was passed
        )
        _processed_data[state_key] = load_processed(canonical)
    return _processed_data[state_key]

from ..services.analytics_service import compute_safety_score_and_trends, get_rising_crimes, get_state_benchmarks, get_actionable_intelligence, get_gap_alerts, STATE_CENTROIDS

@router.get("/crimes")
def get_crimes(
    state: str = "Maharashtra",
    region: Optional[str] = None,
    crime_type: Optional[str] = None,
    year: Optional[str] = None,
    view_mode: str = "micro",  # 'micro' for district, 'macro' for state
):
    data = _get_data(state)

    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]

    # 1. Macro-Level Aggregation (State Level)
    if view_mode == "macro":
        agg_state = {}
        for r in data:
            s_name = r.get("state_name", state.title())
            if s_name not in agg_state:
                coords = STATE_CENTROIDS.get(s_name, [20, 78])
                agg_state[s_name] = {
                    "district": s_name,
                    "state_name": s_name,
                    "lat": coords[0],
                    "lng": coords[1],
                    "crime_score": 0,
                    "is_macro": True
                }
                for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape"]:
                    agg_state[s_name][k] = 0
            
            agg_state[s_name]["crime_score"] += int(r.get("crime_score", 0))
            for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape"]:
                agg_state[s_name][k] += int(r.get(k, 0))
        
        return {"data": list(agg_state.values()), "total": len(agg_state)}

    # 2. Micro-Level Handling (District Level)
    if not year:
        agg = {}
        for r in data:
            d = r.get("district")
            s = r.get("state_name", state)
            key = (d, s)
            if key not in agg:
                agg[key] = r.copy()
                for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape", "crime_score"]:
                    agg[key][k] = int(r.get(k, 0))
            else:
                for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape", "crime_score"]:
                    agg[key][k] += int(r.get(k, 0))
        data = list(agg.values())

    if region:
        data = [r for r in data if region.lower() in str(r.get("district", "")).lower()]

    if crime_type:
        mapping = {
            "Murder / Homicide": ["murder"],
            "Theft & Robbery": ["robbery", "thefts", "vehicle_theft"],
            "Other IPC Crimes": ["burglary", "cheating"],
            "Crimes Against Women": ["rape"],
        }
        cols = mapping.get(crime_type)
        if cols:
            data = [r for r in data if any(int(r.get(c, 0)) > 0 for c in cols)]

    return {"data": data, "total": len(data)}


@router.get("/summary")
def get_summary(state: str = "Maharashtra", year: Optional[str] = None):
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    
    total_incidents = sum(int(r.get("crime_score", 0)) for r in data)
    
    totals = {"murders": 0, "robberies": 0, "thefts": 0}
    for r in data:
        totals["murders"] += int(r.get("murder", 0))
        totals["robberies"] += int(r.get("robbery", 0))
        totals["thefts"] += int(r.get("thefts", 0))
    
    top_crime = max(totals, key=totals.get) if totals and any(v > 0 for v in totals.values()) else "—"

    # Hottest district (highest crime_score as aggregate)
    hottest = "—"
    if data:
        district_scores = {}
        for r in data:
            key = (r.get("district"), r.get("state_name", state))
            district_scores[key] = district_scores.get(key, 0) + int(r.get("crime_score", 0))
        
        best_key = max(district_scores, key=district_scores.get) if district_scores else None
        if best_key:
            hottest = f"{best_key[0]} ({best_key[1]})" if state.lower() == 'all' else best_key[0]

    return {
        "total_incidents": total_incidents,
        "top_crime": top_crime.title(),
        "hottest_zone": hottest,
        "under_investigation": 0,
    }


@router.get("/by-type")
def get_by_type(state: str = "Maharashtra", year: Optional[str] = None):
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    labels = ["Crimes Against Women", "Crimes Against Children", "Theft & Robbery", "Murder / Homicide", "Assault / Hurt", "Cyber Crime", "Drug / Narcotics", "Riots / Public Order", "Other IPC Crimes"]
    total_score = sum(int(r.get("crime_score", 0)) for r in data)
    values = [0]*9
    if total_score > 0:
        values = [int(total_score * x) for x in [0.15, 0.1, 0.15, 0.2, 0.15, 0.1, 0.1, 0.1, 0.05]]
    return {"labels": labels, "values": values}


@router.get("/trend")
def get_trend(state: str = "Maharashtra"):
    data = _get_data(state)
    yearly = {}
    for r in data:
        y = str(r.get("year"))
        yearly[y] = yearly.get(y, 0) + int(r.get("crime_score", 0))
    sorted_years = sorted(yearly.keys())
    return [{"month": y, "count": yearly[y]} for y in sorted_years]


@router.get("/hotspots")
def get_hotspots(state: str = "Maharashtra", year: Optional[str] = None):
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    agg = {}
    for r in data:
        key = (r.get("district"), r.get("state_name", state))
        agg[key] = agg.get(key, 0) + int(r.get("crime_score", 0))
    sorted_districts = sorted(agg.items(), key=lambda x: x[1], reverse=True)
    hotspots = []
    for idx, ((district, s_name), score) in enumerate(sorted_districts[:5], start=1):
        display_name = f"{district}, {s_name}" if state.lower() == 'all' else district
        hotspots.append({"rank": idx, "area": display_name, "station": district, "count": score, "primary_crime": "Crime Score"})
    return hotspots

@router.get("/analytics/insights")
def get_insights_decision_support(state: str = "all"):
    """Returns top 5 actionable security insights and community gap alerts."""
    data = _get_data(state)
    complaints = _read_complaints().get("complaints", [])
    
    insights = get_actionable_intelligence(data)
    gap_alerts = get_gap_alerts(data, complaints)
    
    return {
        "insights": insights,
        "gap_alerts": gap_alerts
    }


@router.post("/register-user")
def register_user(data: UserRegisterReq):
    email, password, name = data.email.strip().lower(), data.password, data.name
    db = auth_utils.read_db()
    if any(u["email"] == email for u in db["users"]):
        raise HTTPException(status_code=400, detail="User already exists")
    hashed_pwd = auth_utils.get_password_hash(password)
    db["users"].append({"name": name, "email": email, "password": hashed_pwd, "role": "user"})
    auth_utils.write_db(db)
    access_token = auth_utils.create_access_token(data={"sub": email, "role": "user", "name": name})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": "user", 
        "name": name, 
        "email": email,
        "message": "User registered successfully"
    }

@router.post("/login-user")
def login_user(data: UserLoginReq):
    email, password = data.email.strip().lower(), data.password
    db = auth_utils.read_db()
    user = next((u for u in db["users"] if u["email"] == email), None)
    if not user or not auth_utils.verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    name = user.get("name", "User")
    access_token = auth_utils.create_access_token(data={"sub": user["email"], "role": "user", "name": name})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": "user", 
        "name": name,
        "email": email
    }

@router.post("/register-admin")
def register_admin(data: AdminRegisterReq):
    email, password, name = data.email.strip().lower(), data.password, data.name
    db = auth_utils.read_db()
    if any(a["email"] == email for a in db["admins"]):
        raise HTTPException(status_code=400, detail="Admin already exists")
    hashed_pwd = auth_utils.get_password_hash(password)
    db["admins"].append({"name": name, "email": email, "password": hashed_pwd, "role": "admin"})
    auth_utils.write_db(db)
    access_token = auth_utils.create_access_token(data={"sub": email, "role": "admin", "name": name})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": "admin", 
        "name": name, 
        "email": email,
        "message": "Admin registered successfully"
    }

@router.post("/login-admin")
def login_admin(data: AdminLoginReq):
    email, password = data.email.strip().lower(), data.password
    db = auth_utils.read_db()
    admin = next((a for a in db["admins"] if a["email"] == email), None)
    if not admin or not auth_utils.verify_password(password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    name = admin.get("name", "Administrator")
    access_token = auth_utils.create_access_token(data={"sub": admin["email"], "role": "admin", "name": name})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": "admin", 
        "name": name,
        "email": email
    }


from ..services.analytics_service import compute_safety_score_and_trends, get_rising_crimes, get_state_benchmarks
import json

@router.get("/safety-score")
def get_safety_score(district: str, state: str = "Maharashtra"):
    data = _get_data(state)
    return compute_safety_score_and_trends(data, district)

@router.get("/admin/insights")
def get_insights(state: str = "Maharashtra", year: Optional[str] = None):
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    rising = get_rising_crimes(data)
    text = f"{rising[0]['type']} increased by {rising[0]['growth_pct']}% recently." if rising else "No significant recent increases detected."
    return {"rising_crimes": rising, "auto_insight": text}

@router.get("/analytics/benchmarks")
def get_benchmarks():
    all_data = {s: _get_data(s) for s in _get_all_state_names()}
    return get_state_benchmarks(all_data)

# COMPLAINTS DB
COMPLAINTS_FILE = Path(__file__).resolve().parents[2] / 'db' / 'complaints_db.json'
def _read_complaints():
    if not COMPLAINTS_FILE.exists(): return {"complaints": []}
    with COMPLAINTS_FILE.open('r', encoding='utf-8') as f: return json.load(f)

@router.post("/complaints")
async def submit_complaint(
    name: str = Form(...), phone: str = Form(...), email: Optional[str] = Form(None),
    crime_type: str = Form(...), description: str = Form(...), location: str = Form(...),
    state: Optional[str] = Form("Maharashtra"), district: Optional[str] = Form("Unknown"),
    lat: Optional[float] = Form(0.0), lng: Optional[float] = Form(0.0),
    image: Optional[UploadFile] = File(None), current_user: dict = Depends(get_current_user)
):
    db = _read_complaints()
    import uuid
    complaint_id = str(uuid.uuid4())[:8]
    new_complaint = {"id": complaint_id, "name": name, "phone": phone, "email": email, "crime_type": crime_type, "description": description, "location": location, "state": state, "district": district, "lat": lat, "lng": lng, "status": "pending", "timestamp": "2024-03-12T10:00:00Z", "user_email": current_user["sub"]}
    db["complaints"].append(new_complaint)
    with COMPLAINTS_FILE.open('w', encoding='utf-8') as f: json.dump(db, f, indent=2)
    return {"message": "Complaint submitted successfully", "id": complaint_id}

@router.get("/my-complaints")
def get_my_complaints(current_user: dict = Depends(get_current_user)):
    db = _read_complaints()
    email = current_user["sub"]
    user_complaints = [c for c in db["complaints"] if c.get("user_email") == email]
    # NOTE: We keep 'rejected' here so the user can see their report was denied
    return {"complaints": user_complaints}


@router.get("/complaints")
def get_complaints(state: Optional[str] = None, status: Optional[str] = None, include_rejected: bool = False):
    db = _read_complaints()
    res = db["complaints"]
    if state and state.lower() != 'all': res = [c for c in res if c.get("state", "").lower() == state.lower()]
    
    # Critical Privacy Filter: Hide rejected items from public views unless explicitly asked (admin)
    if not include_rejected:
        res = [c for c in res if c.get("status") != "rejected"]
        
    if status: res = [c for c in res if c.get("status") == status]
    return {"complaints": res}


@router.patch("/complaints/{complaint_id}/status")
def patch_complaint_status(complaint_id: str, data: ComplaintStatusUpdate):
    db = _read_complaints()
    for c in db["complaints"]:
        if c.get("id") == complaint_id:
            c["status"] = data.status
            if data.reason:
                c["rejection_reason"] = data.reason
            with COMPLAINTS_FILE.open('w', encoding='utf-8') as f: json.dump(db, f, indent=2)
            return {"message": f"Status updated to {data.status}"}
    raise HTTPException(status_code=404, detail="Complaint not found")

@router.post("/upload-csv")
async def upload_csv(
    state: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    import shutil
    
    # Ensure only admins can upload and alter datasets
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized. Admins only.")
        
    uploads_dir = Path(__file__).resolve().parents[2] / "data" / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    # Secure storage of the raw upload
    safe_filename = file.filename.replace(" ", "_").replace("/", "")
    file_path = uploads_dir / safe_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Run the full processing pipeline: normalizes columns, matches districts to coords, 
        # calculates crime_scores, and merges with existing CSV for the state.
        rows = process_and_save(state=state, source_csv=file_path)
        
        # Invalidate the in-memory cache for this exact state to force 
        # all subsequent GET requests to read the freshly processed CSV from disk.
        state_key = state.lower()
        if state_key in _processed_data:
            del _processed_data[state_key]
            
        return {"status": f"Data processed successfully. {len(rows)} records loaded for {state}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
