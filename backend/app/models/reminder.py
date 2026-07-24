from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from app.db.session import Base

class ReminderLog(Base):
    __tablename__ = "sent_reminder_logs"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    recipient_email = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # AMC, Invoice, Enquiry, ServiceWork
    reference_text = Column(String(255), nullable=True)  # e.g., "AMC #AMC-2026-001"
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="sent")  # sent, failed
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

    customer = relationship("Customer")
