import json
import os
from pathlib import Path
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

# Load environment variables from .env file (root of the workspace)
# We go up two levels from app/auth_utils.py to reach the root HACKSTOMP directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Using pbkdf2_sha256 which is more compatible with newer Python/OS environments
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET", "hackstomp-dev-fallback-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

# Store users in a local JSON file (since no SQL database is allowed)
# This path is relative to the backend/ directory
AUTH_DB_FILE = Path(__file__).resolve().parent.parent / "db" / "auth_db.json"

def init_db():
    if not AUTH_DB_FILE.exists():
        AUTH_DB_FILE.write_text(json.dumps({"users": [], "admins": []}))

def read_db():
    init_db()
    try:
        with open(AUTH_DB_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {"users": [], "admins": []}

def write_db(data):
    with open(AUTH_DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    # Using timezone-aware datetime for better compatibility
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
