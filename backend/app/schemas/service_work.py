from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ServiceWorkBase(BaseModel):
    customer_id: int
    product_id: Optional[int] = None
    title: str
    person_on_duty: Optional[str] = None
    description: Optional[str] = None        # legacy field kept for backward compat
    priority: str = "medium"
    status: str = "open"
    reported_date: Optional[date] = None
    due_date: Optional[date] = None
    resolved_date: Optional[date] = None
    resolution_notes: Optional[str] = None
    # Digital signature fields
    signature_data: Optional[str] = None
    signer_name: Optional[str] = None
    signer_designation: Optional[str] = None
    signed_at: Optional[datetime] = None

class ServiceWorkCreate(ServiceWorkBase):
    pass

class ServiceWorkUpdate(ServiceWorkBase):
    customer_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None

class ServiceWorkOut(ServiceWorkBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

