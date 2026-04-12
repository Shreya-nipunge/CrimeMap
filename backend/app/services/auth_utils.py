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

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Store users in a local JSON file (since no SQL database is allowed)
AUTH_DB_FILE = Path(__file__).resolve().parents[2] / "db" / "auth_db.json"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login-user", auto_error=False)

def init_db():
    if not AUTH_DB_FILE.exists():
        AUTH_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
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
    try:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        if isinstance(encoded_jwt, bytes):
            return encoded_jwt.decode('utf-8')
        return str(encoded_jwt)
    except Exception as e:
        print(f"JWT Encoding Error: {str(e)}")
        raise e

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return payload # Returns the full decoded payload (email, role, name)
    except jwt.PyJWTError:
        raise credentials_exception
