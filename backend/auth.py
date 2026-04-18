"""
Staff authentication helpers — JWT bearer-token flow.

CSRF NOTE: This module uses Authorization: Bearer <token> (not cookies).
Bearer tokens are not automatically attached by browsers, so there is no
CSRF attack surface. CSRF protection (double-submit cookie, SameSite, etc.)
is NOT needed for this flow. If cookie-session auth is ever added, revisit.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
_JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-in-prod")
_ALGORITHM = "HS256"
_TOKEN_EXPIRE_HOURS = 12

_bearer = HTTPBearer(auto_error=True)

# ---------------------------------------------------------------------------
# Password helpers  (bcrypt 4+/5+ direct API — passlib is incompatible with bcrypt>=4)
# ---------------------------------------------------------------------------

def hash_password(plaintext: str) -> str:
    return _bcrypt.hashpw(plaintext.encode(), _bcrypt.gensalt()).decode()


def verify_password(plaintext: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plaintext.encode(), hashed.encode())

# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(user_id: int, username: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _JWT_SECRET, algorithms=[_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = _decode_token(credentials.credentials)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = db.query(User).filter(User.id == int(user_id), User.active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_role(*roles: str):
    """Factory returning a dependency that enforces role membership."""
    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted. Required: {list(roles)}",
            )
        return current_user
    return _dependency
