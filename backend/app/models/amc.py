from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
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
    notes = Column(String(255), nullable=True)

    customer = relationship("Customer", back_populates="amc_contracts")

class ReminderLog(Base):
    __tablename__ = "reminders_log"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, nullable=False)
    reminder_type = Column(String(50), default="expiry")
