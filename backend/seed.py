from app.db.session import SessionLocal, engine
from app.db.session import Base
from app.models.user import User
from app.core.security import hash_password
from app.core.config import get_settings

settings = get_settings()

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
    if not admin:
        admin_user = User(
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print(f"Admin user {settings.ADMIN_EMAIL} created.")
    else:
        print("Admin user already exists.")
    
    db.close()

if __name__ == "__main__":
    print("Starting database seeding...")
    seed_db()
    print("Done.")
