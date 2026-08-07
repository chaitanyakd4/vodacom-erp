from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class POItemBase(BaseModel):
    product_id: Optional[int] = None
    description: Optional[str] = None
    hsn_sac: Optional[str] = None
    uom: str = "Nos"
    quantity: float = 1.0
    rate: float = 0.0
    tax_rate: float = 18.0
    total_amount: float = 0.0


class POItemCreate(POItemBase):
    pass


class POItemOut(POItemBase):
    id: int
    po_id: int

    class Config:
        from_attributes = True


class POBase(BaseModel):
    reverse_charge: bool = False
    invoice_ref: Optional[str] = None
    transportation_mode: Optional[str] = None
    vehicle_no: Optional[str] = None
    date_of_supply: Optional[datetime] = None
    place_of_supply: Optional[str] = None

    receiver_name: str
    receiver_address: Optional[str] = None
    receiver_gstin: Optional[str] = None
    receiver_state: Optional[str] = None
    receiver_state_code: Optional[str] = None
    payment_terms: Optional[str] = None

    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    consignee_gstin: Optional[str] = None
    consignee_state: Optional[str] = None
    consignee_state_code: Optional[str] = None
    other_reference: Optional[str] = None

    tax_rate: float = 18.0
    cgst_amount: float = 0.0
    sgst_amount: float = 0.0
    igst_amount: float = 0.0

    total_qty: float = 0.0
    subtotal: float = 0.0
    total_tax: float = 0.0
    total_amount: float = 0.0
    notes: Optional[str] = None
    status: str = "draft"


class POCreate(POBase):
    items: List[POItemCreate] = []


class POUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    other_reference: Optional[str] = None


class POOut(POBase):
    id: int
    po_number: str
    date: datetime
    items: List[POItemOut] = []

    class Config:
        from_attributes = True
