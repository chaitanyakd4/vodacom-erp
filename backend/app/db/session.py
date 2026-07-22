"""
session.py - SQLAlchemy engine, SessionLocal, Base, get_db()

For production (Render/Railway): Set DATABASE_URL in environment variables to
the Supabase Session Mode pooler URL from your Supabase Dashboard:
  Project Settings → Database → Connection Pooling → Session Mode → Copy URI
"""
import urllib.parse
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()
db_url = settings.DATABASE_URL

# URL-encode special characters in the password (handles #, @, %, etc.)
if db_url.startswith(("postgresql://", "postgres://")):
    try:
        prefix, rest = db_url.split("://", 1)
        if "@" in rest:
            user_pass, host_db = rest.rsplit("@", 1)
            if ":" in user_pass:
                username, password = user_pass.split(":", 1)
                if password.startswith("[") and password.endswith("]"):
                    password = password[1:-1]
                # Only encode if not already encoded
                decoded = urllib.parse.unquote(password)
                encoded_password = urllib.parse.quote(decoded, safe="")
                db_url = f"{prefix}://{username}:{encoded_password}@{host_db}"
    except Exception as e:
        logging.warning(f"[SESSION] Could not encode password: {e}")

# Engine config — SQLite vs PostgreSQL have different settings
_is_postgres = db_url.startswith(("postgresql://", "postgres://"))

if _is_postgres:
    _connect_args = {
        "connect_timeout": 20,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=3,
        max_overflow=2,
        pool_timeout=30,
        pool_recycle=1800,
        connect_args=_connect_args,
    )
    logging.info(f"[SESSION] Using PostgreSQL engine")
else:
    # SQLite — used for local development
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False},
    )
    logging.info(f"[SESSION] Using SQLite engine (local dev)")


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
