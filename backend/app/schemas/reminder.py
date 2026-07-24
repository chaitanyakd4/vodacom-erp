from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReminderSendRequest(BaseModel):
    customer_id: Optional[int] = None
    recipient_email: str
    category: str  # AMC, Invoice, Enquiry, ServiceWork
    reference_text: Optional[str] = None
    subject: str
    message: str

class ReminderLogOut(BaseModel):
    id: int
    customer_id: Optional[int] = None
    recipient_email: str
    category: str
    reference_text: Optional[str] = None
    subject: str
    message: str
    status: str
    sent_at: datetime

    class Config:
        from_attributes = True
