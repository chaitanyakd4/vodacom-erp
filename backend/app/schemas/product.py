from pydantic import BaseModel
from typing import Optional

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "Uncategorized"
    hsn_code: Optional[str] = None
    price: float
    tax_rate: float = 18.0
    stock_quantity: int = 0
    unit: str = "pcs"

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int
    class Config:
        from_attributes = True
