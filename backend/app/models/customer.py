from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True)
    company_name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=False)
    address = Column(Text, nullable=False)
    shipping_address = Column(Text, nullable=True)
    state_name = Column(String(50), nullable=True)
    state_code = Column(String(10), nullable=True)
    gstin = Column(String(15), nullable=True)

    invoices = relationship("Invoice", back_populates="customer")
    amc_contracts = relationship("AmcContract", back_populates="customer")
