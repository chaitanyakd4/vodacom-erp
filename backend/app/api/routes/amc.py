from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from pydantic import BaseModel

from app.db.session import get_db
from app.models.amc import AmcContract
from app.schemas.amc import AmcCreate, AmcUpdate, AmcOut
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


class AmcRenewRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    amount: Optional[float] = None
    notes: Optional[str] = None


def _auto_expire_contracts(db: Session):
    """
    Auto-update status of active contracts whose end_date has passed to 'expired'.
    Cancelled contracts remain 'cancelled' and are never auto-expired.
    """
    today = date.today()
    expired_contracts = db.query(AmcContract).filter(
        AmcContract.status == "active",
        AmcContract.end_date < today
    ).all()
    if expired_contracts:
        for amc in expired_contracts:
            amc.status = "expired"
        db.commit()


@router.get("/", response_model=List[AmcOut])
def list_amcs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    _auto_expire_contracts(db)
    return db.query(AmcContract).offset(skip).limit(limit).all()


@router.post("/", response_model=AmcOut)
def create_amc(amc: AmcCreate, db: Session = Depends(get_db)):
    db_amc = AmcContract(**amc.model_dump())
    # If initial end_date is already in the past, mark as expired unless cancelled
    if db_amc.end_date < date.today() and db_amc.status == "active":
        db_amc.status = "expired"
    db.add(db_amc)
    db.commit()
    db.refresh(db_amc)
    return db_amc


@router.get("/{amc_id}", response_model=AmcOut)
def get_amc(amc_id: int, db: Session = Depends(get_db)):
    _auto_expire_contracts(db)
    amc = db.query(AmcContract).filter(AmcContract.id == amc_id).first()
    if not amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")
    return amc


@router.put("/{amc_id}", response_model=AmcOut)
def update_amc(amc_id: int, amc_update: AmcUpdate, db: Session = Depends(get_db)):
    db_amc = db.query(AmcContract).filter(AmcContract.id == amc_id).first()
    if not db_amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")
    for key, value in amc_update.model_dump().items():
        setattr(db_amc, key, value)
    
    # Re-evaluate auto-expiry if updated
    if db_amc.end_date < date.today() and db_amc.status == "active":
        db_amc.status = "expired"

    db.commit()
    db.refresh(db_amc)
    return db_amc


@router.post("/{amc_id}/renew", response_model=AmcOut)
def renew_amc(amc_id: int, req: Optional[AmcRenewRequest] = None, db: Session = Depends(get_db)):
    """
    Renews an expired or active AMC contract.
    Extends coverage dates and sets status back to 'active'.
    """
    amc = db.query(AmcContract).filter(AmcContract.id == amc_id).first()
    if not amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")

    today = date.today()
    new_start = req.start_date if (req and req.start_date) else (amc.end_date + timedelta(days=1) if amc.end_date >= today else today)
    new_end = req.end_date if (req and req.end_date) else (new_start + timedelta(days=365))
    new_amount = req.amount if (req and req.amount is not None) else amc.amount

    renewal_note = f"Renewed on {today}. Extended coverage: {new_start} to {new_end}."
    amc.start_date = new_start
    amc.end_date = new_end
    amc.amount = new_amount
    amc.status = "active"
    if req and req.notes:
        renewal_note += f" Notes: {req.notes}"
    amc.notes = f"{amc.notes}\n[{renewal_note}]" if amc.notes else renewal_note

    db.commit()
    db.refresh(amc)
    return amc


@router.post("/{amc_id}/cancel", response_model=AmcOut)
def cancel_amc(amc_id: int, db: Session = Depends(get_db)):
    """
    Cancels an AMC contract.
    Cancelled contracts are permanently marked 'cancelled' and are distinct from expired contracts.
    """
    amc = db.query(AmcContract).filter(AmcContract.id == amc_id).first()
    if not amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")
    
    amc.status = "cancelled"
    db.commit()
    db.refresh(amc)
    return amc


from app.models.notification import Notification

@router.post("/scan-expiries")
def scan_amc_expiries(db: Session = Depends(get_db)):
    _auto_expire_contracts(db)
    today = date.today()
    intervals = [30, 15, 7, 1]
    created = 0
    
    for days in intervals:
        target_date = today + timedelta(days=days)
        expiring_amcs = db.query(AmcContract).filter(
            AmcContract.end_date == target_date,
            AmcContract.status == "active"
        ).all()
        
        for amc in expiring_amcs:
            existing = db.query(Notification).filter(
                Notification.reference_id == amc.id,
                Notification.type == "amc_expiry",
                Notification.title.like(f"%in {days} days%")
            ).first()
            
            if not existing:
                notif = Notification(
                    title=f"AMC Expiring in {days} days",
                    message=f"Contract {amc.contract_number} for {amc.customer.company_name} is expiring on {amc.end_date}. Click to send a reminder.",
                    type="amc_expiry",
                    reference_id=amc.id
                )
                db.add(notif)
                created += 1
    
    db.commit()
    return {"status": "success", "notifications_created": created}


from app.services.email_service import send_amc_reminder_email
from app.models.amc import ReminderLog

@router.post("/{amc_id}/send-email")
async def send_amc_email(amc_id: int, db: Session = Depends(get_db)):
    amc = db.query(AmcContract).filter(AmcContract.id == amc_id).first()
    if not amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")
        
    customer = amc.customer
    try:
        await send_amc_reminder_email(
            to_email=customer.email,
            customer_name=customer.company_name,
            contract_number=amc.contract_number,
            expiry_date=str(amc.end_date)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    log = ReminderLog(
        contract_id=amc.id,
        reminder_type="manual_email"
    )
    db.add(log)
    db.commit()
    return {"status": "success"}
