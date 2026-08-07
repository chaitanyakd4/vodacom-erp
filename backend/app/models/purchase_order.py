from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
import datetime

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, nullable=False)
    date = Column(DateTime, default=datetime.datetime.utcnow)

    # Header flags
    reverse_charge = Column(Boolean, default=False)
    invoice_ref = Column(String(100), nullable=True)   # linked invoice ref (optional)

    # Transportation
    transportation_mode = Column(String(100), nullable=True)
    vehicle_no = Column(String(100), nullable=True)
    date_of_supply = Column(DateTime, nullable=True)
    place_of_supply = Column(String(100), nullable=True)

    # Receiver / Billed To (the SUPPLIER we are ordering from)
    receiver_name = Column(String(255), nullable=False)
    receiver_address = Column(String(500), nullable=True)
    receiver_gstin = Column(String(50), nullable=True)
    receiver_state = Column(String(100), nullable=True)
    receiver_state_code = Column(String(10), nullable=True)
    payment_terms = Column(String(255), nullable=True)

    # Consignee / Ship To (Vodacom — where goods will be delivered)
    consignee_name = Column(String(255), nullable=True)
    consignee_address = Column(String(500), nullable=True)
    consignee_gstin = Column(String(50), nullable=True)
    consignee_state = Column(String(100), nullable=True)
    consignee_state_code = Column(String(10), nullable=True)
    other_reference = Column(String(255), nullable=True)

    # Tax breakdowns
    tax_rate = Column(Float, default=18.0)          # default GST %
    cgst_amount = Column(Float, default=0.0)
    sgst_amount = Column(Float, default=0.0)
    igst_amount = Column(Float, default=0.0)

    # Totals
    total_qty = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)           # amount before tax
    total_tax = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)       # grand total
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="draft")    # draft, sent, received, cancelled

    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)

    description = Column(String(255), nullable=True)
    hsn_sac = Column(String(50), nullable=True)
    uom = Column(String(30), default="Nos")
    quantity = Column(Float, default=1.0)
    rate = Column(Float, default=0.0)
    tax_rate = Column(Float, default=18.0)
    total_amount = Column(Float, default=0.0)       # pre-tax amount

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")
