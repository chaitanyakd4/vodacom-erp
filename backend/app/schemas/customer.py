from pydantic import BaseModel, EmailStr
from typing import Optional

class CustomerBase(BaseModel):
    company_name: str
    contact_person: str
    email: Optional[EmailStr] = None
    phone: str
    address: str
    shipping_address: Optional[str] = None
    state_name: Optional[str] = None
    state_code: Optional[str] = None
    gstin: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    class Config:
        from_attributes = True
