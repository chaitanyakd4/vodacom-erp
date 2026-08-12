from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime

from app.db.session import get_db
from app.models.service_work import ServiceWork
from app.schemas.service_work import ServiceWorkCreate, ServiceWorkUpdate, ServiceWorkOut
from app.core.security import get_current_user
from app.services.sms_service import send_ticket_notification

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[ServiceWorkOut])
@router.get("/", response_model=List[ServiceWorkOut])
def list_service_work(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db)
):
    query = db.query(ServiceWork)
    if status:
        query = query.filter(ServiceWork.status == status)
    return query.order_by(ServiceWork.id.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=ServiceWorkOut)
@router.post("/", response_model=ServiceWorkOut)
def create_service_work(work: ServiceWorkCreate, db: Session = Depends(get_db)):
    data = work.model_dump()
    
    if not data.get("reported_date"):
        data["reported_date"] = date.today()
    if not data.get("due_date"):
        data["due_date"] = None
    if not data.get("product_id"):
        data["product_id"] = None

    db_work = ServiceWork(**data)
    db.add(db_work)
    db.commit()
    db.refresh(db_work)

    # ── Send SMS/WhatsApp notification to technician ─────────────────────────
    if db_work.technician_mobile:
        # fetch customer name for the message
        from app.models.customer import Customer  # local import to avoid circular
        customer = db.query(Customer).filter(Customer.id == db_work.customer_id).first()
        customer_name = customer.company_name if customer else f"Customer #{db_work.customer_id}"
        try:
            send_ticket_notification(
                to_number=db_work.technician_mobile,
                ticket_id=db_work.id,
                customer_name=customer_name,
                title=db_work.title,
                priority=db_work.priority,
                action="created",
                person_on_duty=db_work.person_on_duty or "",
            )
        except Exception as sms_err:
            import logging
            logging.warning(f"[SMS] Ticket #{db_work.id} notification failed: {sms_err}")
    # ─────────────────────────────────────────────────────────────────────────

    return db_work


@router.get("/{work_id}", response_model=ServiceWorkOut)
def get_service_work(work_id: int, db: Session = Depends(get_db)):
    work = db.query(ServiceWork).filter(ServiceWork.id == work_id).first()
    if not work:
        raise HTTPException(status_code=404, detail="Service work ticket not found")
    return work


@router.put("/{work_id}", response_model=ServiceWorkOut)
def update_service_work(work_id: int, work_update: ServiceWorkUpdate, db: Session = Depends(get_db)):
    db_work = db.query(ServiceWork).filter(ServiceWork.id == work_id).first()
    if not db_work:
        raise HTTPException(status_code=404, detail="Service work ticket not found")
    
    # ── TICKET LOCKING RULE ──────────────────────────────────────────────────
    # Once a service work ticket is resolved or closed, it is permanently locked and non-editable.
    if db_work.status in ("resolved", "closed"):
        raise HTTPException(
            status_code=400,
            detail=f"This service work ticket is already {db_work.status.upper()} and cannot be edited or modified."
        )
    # ──────────────────────────────────────────────────────────────────────────

    update_data = work_update.model_dump(exclude_unset=True)
    new_status = update_data.get("status")

    # ─── SIGNATURE ENFORCEMENT ─────────────────────────────────────────────────
    # Tickets can ONLY be resolved or closed when a valid digital signature is attached.
    if new_status in ("resolved", "closed") and db_work.status not in ("resolved", "closed"):
        sig = update_data.get("signature_data") or db_work.signature_data
        name = update_data.get("signer_name") or db_work.signer_name
        desig = update_data.get("signer_designation") or db_work.signer_designation
        if not sig or not name or not desig:
            raise HTTPException(
                status_code=422,
                detail="A valid client digital signature with signer name and designation is required to resolve or close a ticket."
            )
        if not update_data.get("signed_at") and not db_work.signed_at:
            update_data["signed_at"] = datetime.utcnow()
    # ──────────────────────────────────────────────────────────────────────────

    if new_status == "resolved" and db_work.status != "resolved":
        if "resolved_date" not in update_data or not update_data["resolved_date"]:
            update_data["resolved_date"] = date.today()

    for key, value in update_data.items():
        setattr(db_work, key, value)

    db.commit()
    db.refresh(db_work)

    # ── Send update SMS/WhatsApp to technician (unless ticket is now locked) ─
    mobile = db_work.technician_mobile
    if mobile and db_work.status not in ("resolved", "closed"):
        from app.models.customer import Customer
        customer = db.query(Customer).filter(Customer.id == db_work.customer_id).first()
        customer_name = customer.company_name if customer else f"Customer #{db_work.customer_id}"
        try:
            send_ticket_notification(
                to_number=mobile,
                ticket_id=db_work.id,
                customer_name=customer_name,
                title=db_work.title,
                priority=db_work.priority,
                action="updated",
                person_on_duty=db_work.person_on_duty or "",
            )
        except Exception as sms_err:
            import logging
            logging.warning(f"[SMS] Ticket #{db_work.id} update notification failed: {sms_err}")
    # ─────────────────────────────────────────────────────────────────────────

    return db_work
