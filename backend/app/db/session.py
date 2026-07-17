"""
session.py - SQLAlchemy engine, SessionLocal, Base, get_db()
"""
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
    try:
        prefix, rest = db_url.split("://", 1)
        if "@" in rest:
            user_pass, host_db = rest.rsplit("@", 1)
            if ":" in user_pass:
                username, password = user_pass.split(":", 1)
                # Strip leading/trailing brackets if user left the placeholder brackets
                if password.startswith("[") and password.endswith("]"):
                    password = password[1:-1]
                # URL-encode the password to handle special characters (@, #, etc.)
                encoded_password = urllib.parse.quote_plus(password)
                db_url = f"{prefix}://{username}:{encoded_password}@{host_db}"
    except Exception as e:
        # Fallback to original on parsing error
        pass

# Build connect_args only for PostgreSQL (SQLite doesn't support TCP keepalives)
_pg_connect_args = {}
if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
    _pg_connect_args = {
        "connect_timeout": 15,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=0,
    connect_args=_pg_connect_args,
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
