from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime

from app.db.session import get_db
from app.models.service_work import ServiceWork
from app.schemas.service_work import ServiceWorkCreate, ServiceWorkUpdate, ServiceWorkOut
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

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
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=ServiceWorkOut)
def create_service_work(work: ServiceWorkCreate, db: Session = Depends(get_db)):
    if work.reported_date is None:
        work.reported_date = date.today()
    db_work = ServiceWork(**work.model_dump(exclude_unset=True))
    db.add(db_work)
    db.commit()
    db.refresh(db_work)
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
        # Set signed_at timestamp if not already set
        if not update_data.get("signed_at") and not db_work.signed_at:
            update_data["signed_at"] = datetime.utcnow()
    # ──────────────────────────────────────────────────────────────────────────

    # Auto-set resolved_date if status changes to resolved
    if new_status == "resolved" and db_work.status != "resolved":
        if "resolved_date" not in update_data or not update_data["resolved_date"]:
            update_data["resolved_date"] = date.today()

    for key, value in update_data.items():
        setattr(db_work, key, value)
        
    db.commit()
    db.refresh(db_work)
    return db_work

