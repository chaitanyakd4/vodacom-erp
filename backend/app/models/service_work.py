from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Float, ForeignKey
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
    technician_mobile = Column(String(20), nullable=True)    # Technician contact number for SMS/WhatsApp
    created_by_email = Column(String(255), nullable=True)    # Logged-in user/engineer who created the ticket
    description = Column(Text, nullable=True)                # Kept for backward compat (legacy)
    priority = Column(String(20), default="medium")          # low, medium, high, critical
    status = Column(String(50), default="open")              # open, in_progress, resolved, closed

    # Billing & AMC coverage tracking
    billing_type = Column(String(50), default="billable")    # under_amc, billable, warranty, free_service
    amc_contract_number = Column(String(100), nullable=True) # Linked AMC contract number if under_amc
    estimated_charge = Column(Float, default=0.0)            # Visit / service charge if billable
    reported_date = Column(Date, default=date.today)
    due_date = Column(Date, nullable=True)
    resolved_date = Column(Date, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Site Visit Check-In / Reached Site tracking
    reached_at = Column(DateTime, nullable=True)             # Exact timestamp when technician marked 'Reached Site'
    reached_location = Column(String(255), nullable=True)    # GPS location / Google Maps link or coordinates

    # Digital signature fields – required to close/resolve a ticket
    signature_data = Column(Text, nullable=True)             # base64 PNG of the drawn signature
    signer_name = Column(String(255), nullable=True)         # Full name of client signer
    signer_designation = Column(String(255), nullable=True)  # Designation/role of client signer
    signed_at = Column(DateTime, nullable=True)              # Timestamp of signing

    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", backref="service_work")
    product = relationship("Product", backref="service_work")

