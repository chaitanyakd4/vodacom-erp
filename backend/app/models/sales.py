from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class SalesEnquiry(Base):
    __tablename__ = "sales_enquiries"

    id = Column(Integer, primary_key=True)
    company_name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=False)
    address = Column(Text, nullable=False)
    shipping_address = Column(Text, nullable=True)
    state_name = Column(String(50), nullable=True)
    state_code = Column(String(10), nullable=True)
    status = Column(String(50), default="new") # new, quoted, approved, rejected, converted
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    quotations = relationship("Quotation", back_populates="enquiry", cascade="all, delete-orphan")


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True)
    quotation_number = Column(String(50), unique=True)
    enquiry_id = Column(Integer, ForeignKey("sales_enquiries.id"))
    date = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    status = Column(String(50), default="draft") # draft, sent, approved, rejected
    notes = Column(Text, nullable=True)
    
    subtotal = Column(Float, default=0.0)
    tax_total = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)

    # Internal profit tracking
    total_cost = Column(Float, default=0.0)
    total_profit = Column(Float, default=0.0)
    overall_margin_percent = Column(Float, default=0.0)

    enquiry = relationship("SalesEnquiry", back_populates="quotations")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")
    generated_invoice = relationship("Invoice", back_populates="quotation", uselist=False)


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"))
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    
    unit_price = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    
    # Internal profit tracking
    unit_cost = Column(Float, default=0.0)
    margin_percent = Column(Float, default=0.0)

    quotation = relationship("Quotation", back_populates="items")
