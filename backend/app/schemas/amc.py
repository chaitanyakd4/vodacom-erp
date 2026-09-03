from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class AmcItemBase(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: int = 1
    unit_price: float = 0.0
    total_amount: float = 0.0

class AmcItemCreate(AmcItemBase):
    pass

class AmcItemOut(AmcItemBase):
    id: int
    amc_id: int
    added_date: date

    class Config:
        from_attributes = True

class AddProductToAmcRequest(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: int = 1
    unit_price: float = 0.0
    increase_contract_amount: bool = True

class AmcBase(BaseModel):
    customer_id: int
    contract_number: Optional[str] = None
    start_date: date
    end_date: date
    amount: float
    status: str = "active"
    notes: Optional[str] = None

class AmcCreate(AmcBase):
    items: List[AmcItemCreate] = []

class AmcUpdate(AmcBase):
    items: Optional[List[AmcItemCreate]] = None

from app.schemas.customer import CustomerOut

class AmcOut(AmcBase):
    id: int
    items: List[AmcItemOut] = []
    customer: Optional[CustomerOut] = None

    class Config:
        from_attributes = True
