"""
migrate_rbac.py - Add is_superadmin and permissions columns to users table
and promote user ID=1 to superadmin with full permissions.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "vodacom_erp.db")

def run():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(users)")
    cols = [row[1] for row in cursor.fetchall()]
    print("Existing columns: " + str(cols))

    if "is_superadmin" not in cols:
        cursor.execute("ALTER TABLE users ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT 0")
        print("[OK] Added column: is_superadmin")
    else:
        print("[INFO] Column already exists: is_superadmin")

    if "permissions" not in cols:
        cursor.execute("ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT 'all'")
        print("[OK] Added column: permissions")
    else:
        print("[INFO] Column already exists: permissions")

    cursor.execute("UPDATE users SET permissions = 'all' WHERE permissions IS NULL OR permissions = ''")
    cursor.execute("UPDATE users SET is_superadmin = 1, permissions = 'all' WHERE id = 1")
    if cursor.rowcount:
        print("[OK] User ID=1 promoted to superadmin.")
    else:
        print("[WARN] No user with ID=1 found.")

    conn.commit()

    cursor.execute("SELECT id, email, is_superadmin, permissions FROM users")
    rows = cursor.fetchall()
    print("\nFinal users table:")
    print("ID    Email                               Superadmin   Permissions")
    print("-" * 70)
    for row in rows:
        print(str(row[0]).ljust(6) + str(row[1]).ljust(36) + str(bool(row[2])).ljust(13) + str(row[3]))

    conn.close()
    print("\n[DONE] Migration complete!")

if __name__ == "__main__":
    run()
