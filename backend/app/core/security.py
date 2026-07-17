"""
security.py - Password hashing, JWT create/verify, auth dependency
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: Dict[str, Any]) -> str:
    to_encode: Dict[str, Any] = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=480)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

from jose import jwt, JWTError

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that raises 403 if the current user is not a superadmin."""
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to perform this action. Superadmin access required."
        )
    return current_user


def create_password_reset_token(email: str) -> str:
    """
    Creates a temporary password reset token (valid for 15 minutes).
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode = {
        "sub": email,
        "type": "reset",
        "exp": expire
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def verify_password_reset_token(token: str) -> str | None:
    """
    Decodes and validates a password reset token. Returns email if valid, otherwise None.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") == "reset":
            return payload.get("sub")
    except JWTError:
        pass
    return None