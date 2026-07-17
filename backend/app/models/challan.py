from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base
import datetime

class Challan(Base):
    __tablename__ = "challans"

    id = Column(Integer, primary_key=True, index=True)
    challan_number = Column(String(50), unique=True, nullable=False)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Reverse charge / misc
    reverse_charge = Column(Boolean, default=False)
    invoice_ref = Column(String(100), nullable=True)   # linked invoice ref (optional)

    # Transportation
    transportation_mode = Column(String(100), nullable=True)
    vehicle_no = Column(String(100), nullable=True)
    date_of_supply = Column(DateTime, nullable=True)
    place_of_supply = Column(String(100), nullable=True)

    # Receiver / Bill To
    receiver_name = Column(String(255), nullable=False)
    receiver_address = Column(String(500), nullable=True)
    receiver_gstin = Column(String(50), nullable=True)
    receiver_state = Column(String(100), nullable=True)
    receiver_state_code = Column(String(10), nullable=True)
    payment_terms = Column(String(255), nullable=True)

    # Consignee / Ship To
    consignee_name = Column(String(255), nullable=True)
    consignee_address = Column(String(500), nullable=True)
    consignee_gstin = Column(String(50), nullable=True)
    consignee_state = Column(String(100), nullable=True)
    consignee_state_code = Column(String(10), nullable=True)
    other_reference = Column(String(255), nullable=True)

    # Totals
    total_qty = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)   # before tax (challans are often 0-rated)
    notes = Column(String(500), nullable=True)
    status = Column(String(50), default="draft")  # draft, sent, delivered

    items = relationship("ChallanItem", back_populates="challan", cascade="all, delete-orphan")


class ChallanItem(Base):
    __tablename__ = "challan_items"

    id = Column(Integer, primary_key=True, index=True)
    challan_id = Column(Integer, ForeignKey("challans.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    # Allow free-text description in case item isn't in inventory
    description = Column(String(255), nullable=True)
    hsn_sac = Column(String(50), nullable=True)
    uom = Column(String(30), default="Nos")   # Unit of Measure: Nos, MTR, KG etc.
    quantity = Column(Float, default=1.0)
    rate = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)

    challan = relationship("Challan", back_populates="items")
    product = relationship("Product")
