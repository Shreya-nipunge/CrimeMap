# backend/app/routes.py
# FastAPI routes for the crime analytics backend.

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
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


# Cache the processed dataset in memory for faster response.
_processed_data = None


def _get_data():
    global _processed_data
    if _processed_data is None:
        _processed_data = load_processed()
    return _processed_data


@router.get("/crimes")
def get_crimes(
    region: Optional[str] = None,
    crime_type: Optional[str] = None,
    year: Optional[str] = None,
    gender: Optional[str] = None,
):
    """Return the processed Maharashtra crime dataset.
    Optional query parameters:
      - region: filter by district/region name (case-insensitive substring match)
      - crime_type: approximate filter by high-incidence crime buckets
      - year: filter by year (e.g., "2017")
      - gender: currently accepted but not applied (dataset does not include gender info)
    """
    data = _get_data()

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
def get_summary(year: Optional[str] = None):
    """Return summary statistics used by the dashboard KPI cards."""
    data = _get_data()
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
def get_by_type(year: Optional[str] = None):
    """Return aggregated counts per crime type for the bar chart."""
    data = _get_data()
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
def get_trend():
    """Return yearly incident counts for the trend line."""
    data = _get_data()
    yearly = {}
    for r in data:
        y = str(r.get("year"))
        yearly[y] = yearly.get(y, 0) + int(r.get("crime_score", 0))

    sorted_years = sorted(yearly.keys())
    return [
        {"month": y, "count": yearly[y]} for y in sorted_years
    ]


@router.get("/hotspots")
def get_hotspots(year: Optional[str] = None):
    """Return top 5 districts by crime score for the hotspot cards."""
    data = _get_data()
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
    email: str
    password: str

class UserLoginReq(BaseModel):
    email: str
    password: str

class AdminRegisterReq(BaseModel):
    email: str
    password: str

class AdminLoginReq(BaseModel):
    email: str
    password: str

@router.post("/register-user")
def register_user(data: UserRegisterReq):
    email = data.email
    password = data.password
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    db = auth_utils.read_db()
    if any(u["email"] == email for u in db["users"]):
        raise HTTPException(status_code=400, detail="User already exists")
    hashed_pwd = auth_utils.get_password_hash(password)
    db["users"].append({"email": email, "password": hashed_pwd, "role": "user"})
    auth_utils.write_db(db)
    
    access_token = auth_utils.create_access_token(data={"sub": email, "role": "user"})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": "user",
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
    access_token = auth_utils.create_access_token(data={"sub": user["email"], "role": "user"})
    return {"access_token": access_token, "token_type": "bearer", "role": "user"}

@router.post("/register-admin")
def register_admin(data: AdminRegisterReq):
    email = data.email
    password = data.password
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    db = auth_utils.read_db()
    if any(a["email"] == email for a in db["admins"]):
        raise HTTPException(status_code=400, detail="Admin already exists")
    hashed_pwd = auth_utils.get_password_hash(password)
    db["admins"].append({"email": email, "password": hashed_pwd, "role": "admin"})
    auth_utils.write_db(db)
    
    access_token = auth_utils.create_access_token(data={"sub": email, "role": "admin"})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": "admin",
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
    access_token = auth_utils.create_access_token(data={"sub": admin["email"], "role": "admin"})
    return {"access_token": access_token, "token_type": "bearer", "role": "admin"}
