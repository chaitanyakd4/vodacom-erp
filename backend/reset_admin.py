import sys
from app.db.session import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import hash_password
from app.core.config import get_settings

def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    settings = get_settings()

    print("\n==========================================")
    print("      VODACOM ERP - USER ACCOUNTS         ")
    print("==========================================")

    users = db.query(User).all()
    if not users:
        print("No users found in database.")
    else:
        print(f"Found {len(users)} registered user(s):")
        for u in users:
            print(f"  ID: {u.id} | Email: {u.email} | Active: {u.is_active}")

    target_email = sys.argv[1] if len(sys.argv) > 1 else settings.ADMIN_EMAIL
    new_password = sys.argv[2] if len(sys.argv) > 2 else settings.ADMIN_PASSWORD

    print(f"\nSetting credentials for: {target_email}")
    user = db.query(User).filter(User.email.ilike(target_email)).first()

    if user:
        user.hashed_password = hash_password(new_password)
        user.is_active = True
        user.is_superadmin = True
        user.permissions = "all"
        db.commit()
        print(f"Password for '{user.email}' has been reset to: {new_password}")
    else:
        new_user = User(
            email=target_email,
            hashed_password=hash_password(new_password),
            is_active=True,
            is_superadmin=True,
            permissions="all"
        )
        db.add(new_user)
        db.commit()
        print(f"Created new Superadmin '{target_email}' with password: {new_password}")

    for alt_email in ["admin@vodacom.in", "admin@vodacom.com"]:
        alt_user = db.query(User).filter(User.email.ilike(alt_email)).first()
        if alt_user:
            alt_user.hashed_password = hash_password(new_password)
            alt_user.is_active = True
            alt_user.is_superadmin = True
            alt_user.permissions = "all"
            db.commit()
            print(f"Updated '{alt_email}' password to: {new_password}")
        elif alt_email != target_email:
            new_alt = User(
                email=alt_email,
                hashed_password=hash_password(new_password),
                is_active=True,
                is_superadmin=True,
                permissions="all"
            )
            db.add(new_alt)
            db.commit()
            print(f"Created '{alt_email}' with password: {new_password}")

    print("==========================================\n")
    db.close()

if __name__ == "__main__":
    main()
