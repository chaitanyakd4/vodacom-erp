"""
migrate_technician_mobile.py
Adds the technician_mobile column to the service_work table (safe / idempotent).
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def run():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(service_work)")
    cols = [row[1] for row in cursor.fetchall()]

    if "technician_mobile" not in cols:
        cursor.execute("ALTER TABLE service_work ADD COLUMN technician_mobile TEXT")
        print("[OK] Added column: technician_mobile")
    else:
        print("[INFO] Column already exists: technician_mobile")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    run()
