from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging

from app.db.session import get_db
from app.models.reminder import ReminderLog
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.amc import AmcContract
from app.models.service_work import ServiceWork
from app.models.sales import SalesEnquiry
from app.schemas.reminder import ReminderSendRequest, ReminderLogOut
from app.services.email_service import send_custom_reminder_email
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/logs", response_model=List[ReminderLogOut])
def get_reminder_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve history log of all sent reminder emails."""
    return db.query(ReminderLog).order_by(ReminderLog.sent_at.desc()).offset(skip).limit(limit).all()


@router.get("/customer-items/{customer_id}")
def get_customer_linked_items(customer_id: int, db: Session = Depends(get_db)):
    """Fetch all tasks/contracts/invoices linked to a specific customer to populate the reminder form."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    amcs = db.query(AmcContract).filter(AmcContract.customer_id == customer_id).all()
    invoices = db.query(Invoice).filter(Invoice.customer_id == customer_id, Invoice.status == "pending").all()
    
    # Enquiries matched by email or company_name
    enquiries = db.query(SalesEnquiry).filter(
        (SalesEnquiry.company_name.ilike(f"%{customer.company_name}%")) |
        (SalesEnquiry.email == customer.email)
    ).all()

    # Service work matched by customer_id
    service_tickets = db.query(ServiceWork).filter(ServiceWork.customer_id == customer_id).all()

    return {
        "customer": {
            "id": customer.id,
            "company_name": customer.company_name,
            "contact_person": customer.contact_person,
            "email": customer.email,
            "phone": customer.phone
        },
        "amcs": [
            {
                "id": a.id,
                "ref_text": f"AMC #{a.contract_number} (₹{a.amount:,.2f} - Status: {a.status.upper()})",
                "contract_number": a.contract_number,
                "amount": a.amount,
                "end_date": str(a.end_date),
                "status": a.status
            } for a in amcs
        ],
        "invoices": [
            {
                "id": i.id,
                "ref_text": f"Pending Invoice #{i.invoice_number} (Grand Total: ₹{i.grand_total:,.2f})",
                "invoice_number": i.invoice_number,
                "grand_total": i.grand_total,
                "date": str(i.date.date()) if i.date else ""
            } for i in invoices
        ],
        "enquiries": [
            {
                "id": e.id,
                "ref_text": f"Sales Lead: {e.company_name} (Contact: {e.contact_person} - {e.status.upper()})",
                "company_name": e.company_name,
                "status": e.status
            } for e in enquiries
        ],
        "service_work": [
            {
                "id": s.id,
                "ref_text": f"Service Ticket #SW-{s.id:04d}: {s.title} ({s.status.upper()})",
                "title": s.title,
                "status": s.status,
                "due_date": str(s.due_date) if s.due_date else ""
            } for s in service_tickets
        ]
    }


@router.post("/send", response_model=ReminderLogOut)
async def send_reminder(req: ReminderSendRequest, db: Session = Depends(get_db)):
    """Dispatch an email reminder to a designated customer contact and log the record."""
    status = "sent"
    try:
        await send_custom_reminder_email(
            to_email=req.recipient_email,
            subject=req.subject,
            body_text=req.message
        )
    except Exception as e:
        logging.error(f"[REMINDER_SEND_ERROR] {e}")
        status = "failed"

    log_entry = ReminderLog(
        customer_id=req.customer_id,
        recipient_email=req.recipient_email,
        category=req.category,
        reference_text=req.reference_text,
        subject=req.subject,
        message=req.message,
        status=status
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    if status == "failed":
        raise HTTPException(status_code=500, detail="Failed to send email via SMTP server.")

    return log_entry
