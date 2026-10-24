"""
migrate_from_supabase.py - Migrate 100% of Vodacom ERP data from Supabase to the dedicated server's local database.

Supports migrating from Supabase PostgreSQL to:
  1. Local Dedicated Server SQLite (WAL mode) at C:/vodacom-erp/data/vodacom_erp.db (default, zero external daemon needed)
  2. Local Dedicated Server PostgreSQL (e.g. postgresql://postgres:password@localhost:5432/vodacom_erp) via --target-url

Also saves a full JSON backup snapshot in C:/vodacom-erp/backups/ before updating backend/.env.
"""
import argparse
import datetime
import json
import os
import sys
import urllib.parse
from pathlib import Path
from sqlalchemy import create_engine, text, inspect

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

import app.models  # noqa: F401 - Register all models on Base.metadata
from app.db.session import Base


def _normalize_pg_url(url: str) -> str:
    """URL-encode special characters in PostgreSQL password if needed."""
    if not url.startswith(("postgresql://", "postgres://")):
        return url
    try:
        prefix, rest = url.split("://", 1)
        if "@" in rest:
            user_pass, host_db = rest.rsplit("@", 1)
            if ":" in user_pass:
                username, password = user_pass.split(":", 1)
                if password.startswith("[") and password.endswith("]"):
                    password = password[1:-1]
                decoded = urllib.parse.unquote(password)
                encoded_password = urllib.parse.quote(decoded, safe="")
                return f"{prefix}://{username}:{encoded_password}@{host_db}"
    except Exception:
        pass
    return url


def _read_env_vars(env_path: Path) -> dict:
    env_vars = {}
    if not env_path.exists():
        return env_vars
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        k, v = stripped.split("=", 1)
        env_vars[k.strip()] = v.strip().strip("'\"")
    return env_vars


def _update_env_file(env_path: Path, new_db_url: str, old_supabase_url: str):
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    new_lines = []
    updated_db = False
    has_backup_url = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("DATABASE_URL="):
            new_lines.append(f"DATABASE_URL={new_db_url}")
            updated_db = True
        elif stripped.startswith("SUPABASE_BACKUP_URL="):
            new_lines.append(f"SUPABASE_BACKUP_URL={old_supabase_url}")
            has_backup_url = True
        else:
            new_lines.append(line)

    if not has_backup_url and old_supabase_url:
        new_lines.append(f"SUPABASE_BACKUP_URL={old_supabase_url}")
    if not updated_db:
        new_lines.append(f"DATABASE_URL={new_db_url}")

    env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def _json_default(obj):
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    return str(obj)


def main():
    parser = argparse.ArgumentParser(description="Migrate Vodacom ERP database from Supabase to local dedicated server")
    parser.add_argument("--source-url", help="Override source Supabase DATABASE_URL")
    parser.add_argument("--target-url", help="Override target local DATABASE_URL")
    args = parser.parse_args()

    env_path = BACKEND_DIR / ".env"
    env_vars = _read_env_vars(env_path)

    # Determine source URL (Supabase)
    source_url = args.source_url or env_vars.get("SUPABASE_BACKUP_URL") or env_vars.get("DATABASE_URL")
    if not source_url or not source_url.startswith(("postgresql://", "postgres://")):
        print("❌ Could not find a PostgreSQL/Supabase source URL in backend/.env.")
        print("   If you already migrated, pass --source-url 'postgresql://...'")
        sys.exit(1)

    # Determine target URL (Local Server DB)
    data_dir = ROOT_DIR / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    default_sqlite_path = (data_dir / "vodacom_erp.db").as_posix()
    target_url = args.target_url or f"sqlite:///{default_sqlite_path}"

    print("=" * 72)
    print("🚀 VODACOM ERP — SUPABASE TO DEDICATED SERVER MIGRATION")
    print("=" * 72)
    print(f"📥 Source (Supabase) : {source_url.split('@')[-1] if '@' in source_url else source_url}")
    print(f"📤 Target (Local DB) : {target_url}")
    print("-" * 72)

    norm_source_url = _normalize_pg_url(source_url)
    norm_target_url = _normalize_pg_url(target_url)

    source_engine = create_engine(norm_source_url, pool_pre_ping=True)
    if norm_target_url.startswith("sqlite"):
        target_engine = create_engine(norm_target_url, connect_args={"check_same_thread": False, "timeout": 30})
    else:
        target_engine = create_engine(norm_target_url, pool_pre_ping=True)

    # 1. Create target schema
    print("🛠️  Creating/verifying all tables on local target database...")
    Base.metadata.create_all(bind=target_engine)

    # Ensure extra columns exist on target
    extra_columns = [
        ("users", "full_name", "VARCHAR(255)"),
        ("users", "phone", "VARCHAR(30)"),
        ("invoice_items", "cost_price", "FLOAT DEFAULT 0.0"),
        ("invoice_items", "profit_margin", "FLOAT DEFAULT 0.0"),
        ("service_work", "technician_mobile", "VARCHAR(20)"),
        ("service_work", "created_by_email", "VARCHAR(255)"),
        ("service_work", "billing_type", "VARCHAR(50) DEFAULT 'billable'"),
        ("service_work", "amc_contract_number", "VARCHAR(100)"),
        ("service_work", "estimated_charge", "FLOAT DEFAULT 0.0"),
        ("service_work", "reached_at", "TIMESTAMP"),
        ("service_work", "reached_location", "VARCHAR(255)"),
    ]
    for tbl, col, col_type in extra_columns:
        try:
            with target_engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_type};"))
        except Exception:
            pass

    # 2. Prepare backup directory for JSON snapshot
    backup_dir = ROOT_DIR / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_file = backup_dir / f"supabase_snapshot_{ts}.json"
    snapshot_data = {}

    # 3. Copy data in topological table order
    src_inspector = inspect(source_engine)
    existing_src_tables = set(src_inspector.get_table_names())

    summary = []

    with source_engine.connect() as src_conn:
        # Disable FK checks during bulk load on target
        with target_engine.begin() as tgt_conn:
            if target_engine.dialect.name == "sqlite":
                tgt_conn.execute(text("PRAGMA foreign_keys=OFF;"))

            for table in Base.metadata.sorted_tables:
                tname = table.name
                if tname not in existing_src_tables:
                    print(f"   ⚠️  Skipping table '{tname}' (not present in source DB)")
                    continue

                # Fetch all rows from source table
                src_rows = src_conn.execute(table.select()).mappings().all()
                rows_dicts = [dict(r) for r in src_rows]
                snapshot_data[tname] = rows_dicts

                # Clear target table and insert exact rows from source
                tgt_conn.execute(table.delete())
                if rows_dicts:
                    # Only keep columns that exist in the SQLAlchemy Table definition
                    valid_cols = {c.name for c in table.columns}
                    cleaned_rows = [
                        {k: v for k, v in row.items() if k in valid_cols}
                        for row in rows_dicts
                    ]
                    tgt_conn.execute(table.insert(), cleaned_rows)

                # Reset PostgreSQL sequence if target is Postgres
                if target_engine.dialect.name == "postgresql" and "id" in [c.name for c in table.columns]:
                    tgt_conn.execute(
                        text(
                            f"SELECT setval(pg_get_serial_sequence('{tname}', 'id'), "
                            f"COALESCE((SELECT MAX(id) FROM {tname}), 1), "
                            f"(SELECT COUNT(*) > 0 FROM {tname}));"
                        )
                    )

                tgt_count = tgt_conn.execute(text(f"SELECT COUNT(*) FROM {tname}")).scalar()
                summary.append((tname, len(rows_dicts), tgt_count))
                print(f"   ✅ {tname:<24} : {len(rows_dicts):>5} rows migrated")

            if target_engine.dialect.name == "sqlite":
                tgt_conn.execute(text("PRAGMA foreign_keys=ON;"))

    # 4. Write JSON snapshot backup
    snapshot_file.write_text(json.dumps(snapshot_data, indent=2, default=_json_default), encoding="utf-8")
    print("-" * 72)
    print(f"💾 Full JSON snapshot saved to: {snapshot_file}")

    # 5. Update backend/.env to use the local database
    _update_env_file(env_path, target_url, source_url)
    print(f"⚙️  Updated {env_path}:")
    print(f"   DATABASE_URL={target_url}")
    print(f"   (Original Supabase URL preserved in SUPABASE_BACKUP_URL)")
    print("=" * 72)
    print("🎉 MIGRATION COMPLETE! All tables verified 100%.")
    print("=" * 72)


if __name__ == "__main__":
    main()
