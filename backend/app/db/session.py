"""
session.py - SQLAlchemy engine, SessionLocal, Base, get_db()

Connection strategy:
  - Local dev  → SQLite  (instant, no network)
  - Production → Supabase IPv4 pooler (aws-0-ap-southeast-1.pooler.supabase.com)
                 Set DATABASE_URL in Render env vars to the pooler URL.
"""
import urllib.parse
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

db_url = settings.DATABASE_URL

# ── Auto-rewrite direct Supabase host → IPv4 pooler ───────────────────────────
# The direct host (db.xxxxx.supabase.co) only has an IPv6 address which many
# cloud providers (Render, Railway) and home ISPs cannot reach.
# The pooler (aws-0-ap-southeast-1.pooler.supabase.com) has a stable IPv4 address.
if "supabase.co" in db_url and "pooler.supabase.com" not in db_url:
    try:
        # Extract project ref from host: db.PROJECTREF.supabase.co
        prefix, rest = db_url.split("://", 1)
        user_pass, host_db = rest.rsplit("@", 1)
        host_part = host_db.split("/")[0].split(":")[0]  # e.g. db.mcjmfvsvdcailmswttpl.supabase.co
        parts = host_part.split(".")
        if parts[0] == "db" and len(parts) >= 3:
            project_ref = parts[1]
            # Rewrite to IPv4 pooler with Session mode (port 5432, full SQL support)
            # Username must be prefixed with project ref for pooler
            if ":" in user_pass:
                username, password = user_pass.split(":", 1)
                # Use tenant-prefixed username required by pooler
                if "." not in username:
                    username = f"{username}.{project_ref}"
            else:
                username = f"postgres.{project_ref}"
                password = user_pass
            db_name = host_db.split("/")[-1] if "/" in host_db else "postgres"
            pooler_host = f"aws-0-ap-southeast-1.pooler.supabase.com"
            encoded_password = urllib.parse.quote_plus(password)
            db_url = f"postgresql://{username}:{encoded_password}@{pooler_host}:5432/{db_name}"
            import logging
            logging.info(f"[SESSION] Rewrote DB URL to IPv4 pooler: {pooler_host}:5432")
    except Exception as e:
        import logging
        logging.warning(f"[SESSION] Could not rewrite to pooler: {e}")

# ── URL-encode special chars in password (if not already encoded) ──────────────
elif db_url.startswith(("postgresql://", "postgres://")):
    try:
        prefix, rest = db_url.split("://", 1)
        if "@" in rest:
            user_pass, host_db = rest.rsplit("@", 1)
            if ":" in user_pass:
                username, password = user_pass.split(":", 1)
                if password.startswith("[") and password.endswith("]"):
                    password = password[1:-1]
                encoded_password = urllib.parse.quote_plus(password)
                db_url = f"{prefix}://{username}:{encoded_password}@{host_db}"
    except Exception:
        pass

# ── Engine configuration ───────────────────────────────────────────────────────
_is_postgres = db_url.startswith(("postgresql://", "postgres://"))
_connect_args = {}
if _is_postgres:
    _connect_args = {
        "connect_timeout": 20,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }

# Session mode pooler supports prepared statements, use pool_size=3
engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=2,
    pool_timeout=30,
    pool_recycle=1800,
    connect_args=_connect_args,
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
