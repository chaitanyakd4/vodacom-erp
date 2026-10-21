"""
backup_local_db.py - Automated daily backup utility for Vodacom ERP local database.
Creates a safe hot-backup copy of the local SQLite database (using sqlite3.Connection.backup)
in C:/vodacom-erp/backups/ and prunes backups older than 30 days.
"""
import datetime
import gzip
import shutil
import sqlite3
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
DATA_DB = ROOT_DIR / "data" / "vodacom_erp.db"
BACKUP_DIR = ROOT_DIR / "backups"
RETENTION_DAYS = 30


def run_backup():
    if not DATA_DB.exists():
        print(f"⚠️ Local database file not found at {DATA_DB}")
        return

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    raw_backup_path = BACKUP_DIR / f"vodacom_erp_{ts}.db"
    gz_backup_path = BACKUP_DIR / f"vodacom_erp_{ts}.db.gz"

    # Safe online hot-backup using SQLite's native backup API
    src_conn = sqlite3.connect(str(DATA_DB))
    dst_conn = sqlite3.connect(str(raw_backup_path))
    with dst_conn:
        src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()

    # Compress backup
    with open(raw_backup_path, "rb") as f_in, gzip.open(gz_backup_path, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)
    raw_backup_path.unlink(missing_ok=True)

    print(f"✅ Local database backup created: {gz_backup_path}")

    # Prune backups older than RETENTION_DAYS
    cutoff = datetime.datetime.now().timestamp() - (RETENTION_DAYS * 86400)
    for old_file in BACKUP_DIR.glob("vodacom_erp_*.db.gz"):
        if old_file.stat().st_mtime < cutoff:
            old_file.unlink(missing_ok=True)
            print(f"🧹 Pruned old backup: {old_file.name}")


if __name__ == "__main__":
    run_backup()
