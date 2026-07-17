from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.amc import AmcContract
from app.schemas.amc import AmcCreate, AmcUpdate, AmcOut
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

@router.get("/", response_model=List[AmcOut])
def list_amcs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(AmcContract).offset(skip).limit(limit).all()

@router.post("/", response_model=AmcOut)
def create_amc(amc: AmcCreate, db: Session = Depends(get_db)):
    db_amc = AmcContract(**amc.model_dump())
    db.add(db_amc)
    db.commit()
    db.refresh(db_amc)
    return db_amc

@router.get("/{amc_id}", response_model=AmcOut)
def get_amc(amc_id: int, db: Session = Depends(get_db)):
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
    db.commit()
    db.refresh(db_amc)
    return db_amc

from datetime import date, timedelta
from app.models.notification import Notification

@router.post("/scan-expiries")
def scan_amc_expiries(db: Session = Depends(get_db)):
    """
    Scans for AMCs expiring in 30, 15, 7, or 1 days.
    Creates internal notifications for the dashboard.
    """
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
            # Check if notification already exists
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
    """
    Triggered when the user clicks 'Send Reminder' on the dashboard.
    Actually fires the email and logs it.
    """
    amc = db.query(AmcContract).filter(AmcContract.id == amc_id).first()
    if not amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")
        
    customer = amc.customer
    # Send email
    try:
        await send_amc_reminder_email(
            to_email=customer.email,
            customer_name=customer.company_name,
            contract_number=amc.contract_number,
            expiry_date=str(amc.end_date)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # Log it
    log = ReminderLog(
        contract_id=amc.id,
        reminder_type="manual_email"
    )
    db.add(log)
    db.commit()
    return {"status": "success"}
