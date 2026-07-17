from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import date, datetime
from app.db.session import Base

class ServiceWork(Base):
    __tablename__ = "service_work"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    title = Column(String(255), nullable=False)
    person_on_duty = Column(String(255), nullable=True)      # Person assigned to handle the ticket
    description = Column(Text, nullable=True)                # Kept for backward compat (legacy)
    priority = Column(String(20), default="medium")          # low, medium, high, critical
    status = Column(String(50), default="open")              # open, in_progress, resolved, closed
    reported_date = Column(Date, default=date.today)
    due_date = Column(Date, nullable=True)
    resolved_date = Column(Date, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Digital signature fields – required to close/resolve a ticket
    signature_data = Column(Text, nullable=True)             # base64 PNG of the drawn signature
    signer_name = Column(String(255), nullable=True)         # Full name of client signer
    signer_designation = Column(String(255), nullable=True)  # Designation/role of client signer
    signed_at = Column(DateTime, nullable=True)              # Timestamp of signing

    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", backref="service_work")
    product = relationship("Product", backref="service_work")

