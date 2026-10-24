from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ServiceWorkBase(BaseModel):
    customer_id: int
    product_id: Optional[int] = None
    title: str
    person_on_duty: Optional[str] = None
    technician_mobile: Optional[str] = None     # Mobile number for SMS/WhatsApp notifications
    created_by_email: Optional[str] = None
    description: Optional[str] = None        # legacy field kept for backward compat
    priority: str = "medium"
    status: str = "open"
    billing_type: Optional[str] = "billable"    # under_amc, billable, warranty, free_service
    amc_contract_number: Optional[str] = None
    estimated_charge: Optional[float] = 0.0
    reported_date: Optional[date] = None
    due_date: Optional[date] = None
    resolved_date: Optional[date] = None
    resolution_notes: Optional[str] = None
    # Site Visit Check-in fields
    reached_at: Optional[datetime] = None
    reached_location: Optional[str] = None
    # Digital signature fields
    signature_data: Optional[str] = None
    signer_name: Optional[str] = None
    signer_designation: Optional[str] = None
    signed_at: Optional[datetime] = None

class ServiceWorkCreate(ServiceWorkBase):
    notify_engineer: Optional[bool] = True      # Allow skipping self-notification when engineer logs own ticket

class ServiceWorkUpdate(BaseModel):
    customer_id: Optional[int] = None
    product_id: Optional[int] = None
    title: Optional[str] = None
    person_on_duty: Optional[str] = None
    technician_mobile: Optional[str] = None
    created_by_email: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    billing_type: Optional[str] = None
    amc_contract_number: Optional[str] = None
    estimated_charge: Optional[float] = None
    reported_date: Optional[date] = None
    due_date: Optional[date] = None
    resolved_date: Optional[date] = None
    resolution_notes: Optional[str] = None
    reached_at: Optional[datetime] = None
    reached_location: Optional[str] = None
    signature_data: Optional[str] = None
    signer_name: Optional[str] = None
    signer_designation: Optional[str] = None
    signed_at: Optional[datetime] = None

class ServiceWorkOut(ServiceWorkBase):
    id: int
    created_at: datetime
    whatsapp_sent: Optional[bool] = None
    whatsapp_error: Optional[str] = None
    wa_direct_url: Optional[str] = None
    
    class Config:
        from_attributes = True

