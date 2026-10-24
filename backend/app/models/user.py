from sqlalchemy import Boolean, Column, Integer, String, Text
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superadmin = Column(Boolean, default=False)
    # Comma-separated module slugs, e.g. "dashboard,customers,invoices"
    # Value "all" means full access to everything
    permissions = Column(Text, default="all")

