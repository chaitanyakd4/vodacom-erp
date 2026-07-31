from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
import datetime
from app.db.session import Base

class AmcContract(Base):
    __tablename__ = "amc_contracts"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    contract_number = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(20), default="active")
    notes = Column(String(500), nullable=True)

    customer = relationship("Customer", back_populates="amc_contracts")
    items = relationship("AmcItem", back_populates="amc", cascade="all, delete-orphan")


class AmcItem(Base):
    __tablename__ = "amc_items"

    id = Column(Integer, primary_key=True, index=True)
    amc_id = Column(Integer, ForeignKey("amc_contracts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    added_date = Column(Date, default=datetime.date.today)

    amc = relationship("AmcContract", back_populates="items")
    product = relationship("Product")


class ReminderLog(Base):
    __tablename__ = "reminders_log"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, nullable=False)
    reminder_type = Column(String(50), default="expiry")
