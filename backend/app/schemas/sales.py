from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Quotation Items ---
class QuotationItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    tax_rate: float
    total_amount: float
    unit_cost: float = 0.0
    margin_percent: float = 0.0

class QuotationItemCreate(QuotationItemBase):
    pass

class QuotationItemOut(QuotationItemBase):
    id: int
    quotation_id: int

    class Config:
        from_attributes = True


# --- Quotations ---
class QuotationBase(BaseModel):
    enquiry_id: int
    date: datetime
    valid_until: Optional[datetime] = None
    status: str = "draft"
    notes: Optional[str] = None
    subtotal: float
    tax_total: float
    grand_total: float
    total_cost: float = 0.0
    total_profit: float = 0.0
    overall_margin_percent: float = 0.0

class QuotationCreate(QuotationBase):
    items: List[QuotationItemCreate]

class QuotationOut(QuotationBase):
    id: int
    quotation_number: str
    items: List[QuotationItemOut] = []

    class Config:
        from_attributes = True


# --- Sales Enquiries ---
class SalesEnquiryBase(BaseModel):
    company_name: str
    contact_person: str
    email: Optional[str] = None
    phone: str
    address: str
    shipping_address: Optional[str] = None
    state_name: Optional[str] = None
    state_code: Optional[str] = None
    status: str = "new"
    notes: Optional[str] = None

class SalesEnquiryCreate(SalesEnquiryBase):
    pass

class SalesEnquiryUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    shipping_address: Optional[str] = None
    state_name: Optional[str] = None
    state_code: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class SalesEnquiryOut(SalesEnquiryBase):
    id: int
    created_at: datetime
    quotations: List[QuotationOut] = []

    class Config:
        from_attributes = True
