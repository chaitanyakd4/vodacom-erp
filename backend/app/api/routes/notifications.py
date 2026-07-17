from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.models.notification import Notification

router = APIRouter()

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    reference_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationOut])
def get_unread_notifications(db: Session = Depends(get_db)):
    """Fetch all unread notifications, ordered by newest first."""
    return db.query(Notification).filter(Notification.is_read == False).order_by(Notification.created_at.desc()).all()

@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    """Marks a notification as read so it disappears from the dashboard."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    return {"status": "success"}

@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    """Deletes a notification entirely."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notif)
    db.commit()
    return {"status": "success"}
