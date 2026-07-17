from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class InvoiceItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    tax_rate: float
    total_amount: float

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemOut(InvoiceItemBase):
    id: int
    invoice_id: int
    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    customer_id: Optional[int] = None
    status: str = "pending"
    notes: Optional[str] = None
    subtotal: float
    tax_total: float
    grand_total: float
    quotation_id: Optional[int] = None
    is_dummy: Optional[bool] = False

class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate]

class InvoiceOut(InvoiceBase):
    id: int
    invoice_number: str
    date: datetime
    items: List[InvoiceItemOut] = []
    class Config:
        from_attributes = True
