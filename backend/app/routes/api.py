# backend/app/routes.py
# FastAPI routes for the crime analytics backend.

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import datetime
import jwt

from ..dataset_loader import load_processed, process_and_save, UPLOADS_DIR
from .. import auth_utils

router = APIRouter(prefix="/api")

# This is used for Swagger UI and token extraction logic
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login-user", auto_error=False)

# Dependency to check JWT token
def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None or role is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return {"email": email, "role": role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")


# Cache the processed dataset in memory for faster response, keyed by state.
_processed_data = {}

def _get_data(state: str = "Maharashtra"):
    state = state.lower()
    if state not in _processed_data:
        _processed_data[state] = load_processed(state)
    return _processed_data[state]


@router.get("/crimes")
def get_crimes(
    state: str = "Maharashtra",
    region: Optional[str] = None,
    crime_type: Optional[str] = None,
    year: Optional[str] = None,
    gender: Optional[str] = None,
):
    """Return the processed crime dataset for a state.
    Optional query parameters:
      - state: filter by state (default Maharashtra)
      - region: filter by district/region name (case-insensitive substring match)
      - crime_type: approximate filter by high-incidence crime buckets
      - year: filter by year (e.g., "2017")
      - gender: currently accepted but not applied
    """
    data = _get_data(state)

    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    else:
        # If no year is specified, we aggregate data by district to avoid duplicate markers on map
        agg = {}
        for r in data:
            d = r.get("district")
            if d not in agg:
                agg[d] = r.copy()
                # Initialize these to 0 as we'll sum them up
                for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape", "crime_score"]:
                    agg[d][k] = int(r.get(k, 0))
                # Remove year as this is an aggregate
                if "year" in agg[d]: del agg[d]["year"]
            else:
                for k in ["murder", "robbery", "thefts", "vehicle_theft", "burglary", "cheating", "rape", "crime_score"]:
                    agg[d][k] += int(r.get(k, 0))
        data = list(agg.values())

    if region:
        data = [
            r for r in data if region.lower() in str(r.get("district", "")).lower()
        ]

    if crime_type:
        mapping = {
            "Murder / Homicide": ["murder"],
            "Theft & Robbery": ["robbery", "thefts", "vehicle_theft"],
            "Other IPC Crimes": ["burglary", "cheating"],
            "Crimes Against Women": ["rape"],
        }
        cols = mapping.get(crime_type)
        if cols:
            data = [
                r for r in data if any(int(r.get(c, 0)) > 0 for c in cols)
            ]

    return {"data": data, "total": len(data)}


@router.get("/summary")
def get_summary(state: str = "Maharashtra", year: Optional[str] = None):
    """Return summary statistics used by the dashboard KPI cards."""
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]

    total_incidents = sum(
        int(r.get("murder", 0))
        + int(r.get("robbery", 0))
        + int(r.get("thefts", 0))
        + int(r.get("vehicle_theft", 0))
        + int(r.get("burglary", 0))
        + int(r.get("cheating", 0))
        + int(r.get("rape", 0))
        for r in data
    )

    totals = {
        "Murder": sum(int(r.get("murder", 0)) for r in data),
        "Robbery": sum(int(r.get("robbery", 0)) for r in data),
        "Other Thefts": sum(int(r.get("thefts", 0)) for r in data),
        "Vehicle Theft": sum(int(r.get("vehicle_theft", 0)) for r in data),
        "Burglary": sum(int(r.get("burglary", 0)) for r in data),
        "Cheating": sum(int(r.get("cheating", 0)) for r in data),
        "Rape": sum(int(r.get("rape", 0)) for r in data),
    }
    top_crime = max(totals, key=totals.get) if totals and any(v > 0 for v in totals.values()) else "—"

    # Hottest district (highest crime_score as aggregate)
    hottest = "—"
    if data:
        # Group by district for hottest check
        district_scores = {}
        for r in data:
            d = r.get("district")
            district_scores[d] = district_scores.get(d, 0) + int(r.get("crime_score", 0))
        hottest = max(district_scores, key=district_scores.get) if district_scores else "—"

    return {
        "total_incidents": total_incidents,
        "top_crime": top_crime,
        "hottest_zone": hottest,
        "under_investigation": 0,
    }


@router.get("/by-type")
def get_by_type(state: str = "Maharashtra", year: Optional[str] = None):
    """Return aggregated counts per crime type for the bar chart."""
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]

    labels = [
        "Crimes Against Women",
        "Crimes Against Children",
        "Theft & Robbery",
        "Murder / Homicide",
        "Assault / Hurt",
        "Cyber Crime",
        "Drug / Narcotics",
        "Riots / Public Order",
        "Other IPC Crimes",
    ]

    values = [
        0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]

    # As the processed dataset does not have disaggregated crime types, we use the computed crime score
    # and spread it into approximate buckets for visualization.
    total_score = sum(int(r.get("crime_score", 0)) for r in data)
    if total_score > 0:
        values = [int(total_score * 0.15), int(total_score * 0.1), int(total_score * 0.15), int(total_score * 0.2), int(total_score * 0.15), int(total_score * 0.1), int(total_score * 0.1), int(total_score * 0.1), int(total_score * 0.05)]
    return {"labels": labels, "values": values}


@router.get("/trend")
def get_trend(state: str = "Maharashtra"):
    """Return yearly incident counts for the trend line."""
    data = _get_data(state)
    yearly = {}
    for r in data:
        y = str(r.get("year"))
        yearly[y] = yearly.get(y, 0) + int(r.get("crime_score", 0))

    sorted_years = sorted(yearly.keys())
    return [
        {"month": y, "count": yearly[y]} for y in sorted_years
    ]


@router.get("/hotspots")
def get_hotspots(state: str = "Maharashtra", year: Optional[str] = None):
    """Return top 5 districts by crime score for the hotspot cards."""
    data = _get_data(state)
    if year:
        data = [r for r in data if str(r.get("year")) == str(year)]
    
    # Aggregate by district (sum across years if no year filter)
    agg = {}
    for r in data:
        d = r.get("district")
        agg[d] = agg.get(d, 0) + int(r.get("crime_score", 0))
    
    sorted_districts = sorted(agg.items(), key=lambda x: x[1], reverse=True)

    hotspots = []
    for idx, (district, score) in enumerate(sorted_districts[:5], start=1):
        hotspots.append(
            {
                "rank": idx,
                "area": district,
                "station": district,
                "count": score,
                "primary_crime": "Crime Score",
            }
        )
    return hotspots


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a new raw CSV dataset. Protected route."""
    if not current_user or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized. Admins only.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a CSV")

    dest = UPLOADS_DIR / f"{datetime.datetime.now(datetime.timezone.utc):%Y%m%d_%H%M%S}_{file.filename}"
    contents = await file.read()
    dest.write_bytes(contents)
    processed = process_and_save(source_csv=dest)
    
    # Refresh the cached dataset only if we found relevant data (e.g. Maharashtra rows)
    if processed:
        global _processed_data
        _processed_data = processed
        return {"status": "dataset updated", "count": len(processed)}
    else:
        # If processing failed or returned no data, we don't clear the cache
        # We also notify the user that the file was uploaded but no relevant data was found
        raise HTTPException(
            status_code=422, 
            detail="File uploaded but no Maharashtra crime data found. Please check column headers and state names."
        )


# --- AUTHENTICATION ENDPOINTS ---

class UserRegisterReq(BaseModel):
    name: str = "User"
    email: str
    password: str

class UserLoginReq(BaseModel):
    email: str
    password: str

class AdminRegisterReq(BaseModel):
    name: str = "Administrator"
    email: str
    password: str

class AdminLoginReq(BaseModel):
    email: str
    password: str

@router.post("/register-user")
def register_user(data: UserRegisterReq):
    email = data.email
    password = data.password
    name = data.name
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    db = auth_utils.read_db()
    if any(u["email"] == email for u in db["users"]):
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_pwd = auth_utils.get_password_hash(password)
    db["users"].append({
        "name": name,
        "email": email, 
        "password": hashed_pwd, 
        "role": "user"
    })
    auth_utils.write_db(db)
    
    access_token = auth_utils.create_access_token(data={"sub": email, "role": "user", "name": name})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": "user",
        "name": name,
        "message": "User registered successfully"
    }

@router.post("/login-user")
def login_user(data: UserLoginReq):
    email = data.email
    password = data.password
    db = auth_utils.read_db()
    user = next((u for u in db["users"] if u["email"] == email), None)
    if not user or not auth_utils.verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    name = user.get("name", "User")
    access_token = auth_utils.create_access_token(data={"sub": user["email"], "role": "user", "name": name})
    return {"access_token": access_token, "token_type": "bearer", "role": "user", "name": name}

@router.post("/register-admin")
def register_admin(data: AdminRegisterReq):
    email = data.email
    password = data.password
    name = data.name
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    db = auth_utils.read_db()
    if any(a["email"] == email for a in db["admins"]):
        raise HTTPException(status_code=400, detail="Admin already exists")
    
    hashed_pwd = auth_utils.get_password_hash(password)
    db["admins"].append({
        "name": name,
        "email": email, 
        "password": hashed_pwd, 
        "role": "admin"
    })
    auth_utils.write_db(db)
    
    access_token = auth_utils.create_access_token(data={"sub": email, "role": "admin", "name": name})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": "admin",
        "name": name,
        "message": "Admin registered successfully"
    }

@router.post("/login-admin")
def login_admin(data: AdminLoginReq):
    email = data.email
    password = data.password
    db = auth_utils.read_db()
    admin = next((a for a in db["admins"] if a["email"] == email), None)
    if not admin or not auth_utils.verify_password(password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    name = admin.get("name", "Administrator")
    access_token = auth_utils.create_access_token(data={"sub": admin["email"], "role": "admin", "name": name})
    return {"access_token": access_token, "token_type": "bearer", "role": "admin", "name": name}

from ..services.analytics_service import compute_safety_score_and_trends, get_rising_crimes
import json

@router.get("/safety-score")
def get_safety_score(district: str, state: str = "Maharashtra"):
    data = _get_data(state)
    return compute_safety_score_and_trends(data, district)

@router.get("/admin/insights")
def get_insights(state: str = "Maharashtra"):
    data = _get_data(state)
    rising = get_rising_crimes(data)
    
    # Auto insight text generator
    if rising:
        top = rising[0]
        text = f"{top['type']} increased by {top['growth_pct']}% recently."
    else:
        text = "No significant recent increases detected."
        
    return {
        "rising_crimes": rising,
        "auto_insight": text
    }

# COMPLAINTS DB
COMPLAINTS_FILE = Path(__file__).resolve().parents[2] / 'db' / 'complaints_db.json'

def _read_complaints():
    if not COMPLAINTS_FILE.exists():
        return {"complaints": []}
    with COMPLAINTS_FILE.open('r', encoding='utf-8') as f:
        return json.load(f)

def _write_complaints(db):
    with COMPLAINTS_FILE.open('w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)

class ComplaintReq(BaseModel):
    # This remains for reference but the route will use Form() parameters
    pass

import uuid

@router.post("/complaints")
async def submit_complaint(
    name: str = Form(...),
    phone: str = Form(...),
    email: Optional[str] = Form(None),
    crime_type: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    state: Optional[str] = Form("Maharashtra"),
    district: Optional[str] = Form("Unknown"),
    lat: Optional[float] = Form(0.0),
    lng: Optional[float] = Form(0.0),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    db = _read_complaints()
    image_url = None

    if image and image.filename:
        # Save image to uploads
        ext = image.filename.split('.')[-1]
        img_id = str(uuid.uuid4())
        img_filename = f"{img_id}.{ext}"
        dest = Path(__file__).resolve().parent.parent.parent / "uploads" / img_filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        contents = await image.read()
        dest.write_bytes(contents)
        image_url = f"/uploads/{img_filename}"

    new_comp = {
        "id": str(uuid.uuid4()),
        "user_email": current_user["email"],
        "name": name,
        "phone": phone,
        "email": email or current_user["email"],
        "crime_type": crime_type,
        "description": description,
        "location": location,
        "state": state,
        "district": district,
        "lat": lat,
        "lng": lng,
        "image_url": image_url,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "pending"
    }
    db["complaints"].append(new_comp)
    _write_complaints(db)
    return {"message": "Complaint submitted successfully", "complaint": new_comp}

@router.get("/complaints")
def get_complaints(state: Optional[str] = None, status: Optional[str] = None):
    db = _read_complaints()
    comps = db.get("complaints", [])
    if state:
        comps = [c for c in comps if c.get("state", "").lower() == state.lower()]
    if status:
        comps = [c for c in comps if c.get("status") == status]
    return {"complaints": comps}

@router.get("/my-complaints")
def get_my_complaints(current_user: dict = Depends(get_current_user)):
    db = _read_complaints()
    comps = db.get("complaints", [])
    # Return ONLY complaints belonging to this user
    user_comps = [c for c in comps if c.get("user_email") == current_user["email"]]
    # Sort by timestamp descending (newest first)
    user_comps.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return {"complaints": user_comps}

@router.patch("/complaints/{complaint_id}/status")
def update_complaint_status(complaint_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    db = _read_complaints()
    for c in db.get("complaints", []):
        if c.get("id") == complaint_id:
            c["status"] = "resolved"
            _write_complaints(db)
            return {"message": "Status updated to resolved"}
    raise HTTPException(status_code=404, detail="Complaint not found")

