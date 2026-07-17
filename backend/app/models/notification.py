from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # e.g., 'amc_expiry'
    is_read = Column(Boolean, default=False)
    reference_id = Column(Integer, nullable=True)  # e.g., AMC contract ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
