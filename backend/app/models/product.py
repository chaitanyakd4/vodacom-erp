from sqlalchemy import Column, Integer, String, Float
from app.db.session import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    category = Column(String(100), nullable=False, default="Uncategorized")
    hsn_code = Column(String(50), nullable=True)
    price = Column(Float, default=0.0)
    tax_rate = Column(Float, default=18.0)
    stock_quantity = Column(Integer, default=0)
    unit = Column(String(50), default="pcs")
