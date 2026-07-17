from pydantic import BaseModel
from typing import Optional
from datetime import date

class AmcBase(BaseModel):
    customer_id: int
    contract_number: str
    start_date: date
    end_date: date
    amount: float
    status: str = "active"
    notes: Optional[str] = None

class AmcCreate(AmcBase):
    pass

class AmcUpdate(AmcBase):
    pass

class AmcOut(AmcBase):
    id: int
    class Config:
        from_attributes = True
