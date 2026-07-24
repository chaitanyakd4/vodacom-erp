from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List, Dict, Any

from app.db.session import get_db
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.amc import AmcContract
from app.models.service_work import ServiceWork
from app.models.sales import SalesEnquiry

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _auto_expire_amcs(db: Session):
    today = date.today()
    expired = db.query(AmcContract).filter(
        AmcContract.status == "active",
        AmcContract.end_date < today
    ).all()
    if expired:
        for a in expired:
            a.status = "expired"
        db.commit()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    _auto_expire_amcs(db)
    today = date.today()
    in_30_days = today + timedelta(days=30)

    total_customers = db.query(Customer).count()
    total_products = db.query(Product).count()
    pending_invoices = db.query(Invoice).filter(Invoice.status == "pending").count()
    active_amcs = db.query(AmcContract).filter(AmcContract.status == "active").count()
    expired_amcs = db.query(AmcContract).filter(
        (AmcContract.status == "expired") | ((AmcContract.status == "active") & (AmcContract.end_date < today))
    ).count()
    expiring_soon_amcs = db.query(AmcContract).filter(
        AmcContract.status == "active",
        AmcContract.end_date >= today,
        AmcContract.end_date <= in_30_days
    ).count()
    open_service_work = db.query(ServiceWork).filter(ServiceWork.status.in_(["open", "in_progress", "pending"])).count()
    active_enquiries = db.query(SalesEnquiry).filter(SalesEnquiry.status.in_(["new", "quoted", "pending", "approved"])).count()

    return {
        "total_customers": total_customers,
        "total_products": total_products,
        "pending_invoices": pending_invoices,
        "active_amcs": active_amcs,
        "expired_amcs": expired_amcs,
        "expiring_soon_amcs": expiring_soon_amcs,
        "open_service_work": open_service_work,
        "active_enquiries": active_enquiries,
    }


@router.get("/reminders")
def get_reminders(db: Session = Depends(get_db)):
    _auto_expire_amcs(db)
    today = date.today()
    in_30_days = today + timedelta(days=30)
    in_7_days = today + timedelta(days=7)

    # AMC Expiring Soon (within 30 days)
    amc_expiring_soon = db.query(AmcContract).filter(
        AmcContract.status == "active",
        AmcContract.end_date >= today,
        AmcContract.end_date <= in_30_days
    ).all()

    # Expired AMCs
    amc_expired = db.query(AmcContract).filter(
        (AmcContract.status == "expired") | ((AmcContract.status == "active") & (AmcContract.end_date < today))
    ).all()

    # Overdue Service Work
    service_work_overdue = db.query(ServiceWork).filter(
        ServiceWork.status.in_(["open", "in_progress", "pending"]),
        ServiceWork.due_date < today
    ).all()

    # Service Work Due Soon (within 7 days)
    service_work_due_soon = db.query(ServiceWork).filter(
        ServiceWork.status.in_(["open", "in_progress", "pending"]),
        ServiceWork.due_date >= today,
        ServiceWork.due_date <= in_7_days
    ).all()

    # In-Progress / Pending Service Work
    service_work_in_progress = db.query(ServiceWork).filter(
        ServiceWork.status.in_(["open", "in_progress", "pending"])
    ).all()

    # Pending Sales Enquiries
    pending_enquiries = db.query(SalesEnquiry).filter(
        SalesEnquiry.status.in_(["new", "quoted", "pending", "approved"])
    ).all()

    return {
        "amc_expiring_soon": [
            {
                "id": a.id,
                "contract_number": a.contract_number,
                "customer_name": a.customer.company_name if a.customer else "Unknown",
                "end_date": str(a.end_date),
                "amount": a.amount,
                "days_left": (a.end_date - today).days
            } for a in amc_expiring_soon
        ],
        "amc_expired": [
            {
                "id": a.id,
                "contract_number": a.contract_number,
                "customer_name": a.customer.company_name if a.customer else "Unknown",
                "end_date": str(a.end_date),
                "amount": a.amount
            } for a in amc_expired
        ],
        "service_work_overdue": [
            {
                "id": s.id,
                "ticket_number": f"SW-{s.id:04d}",
                "title": s.title,
                "status": s.status,
                "priority": s.priority,
                "due_date": str(s.due_date) if s.due_date else ""
            } for s in service_work_overdue
        ],
        "service_work_due_soon": [
            {
                "id": s.id,
                "ticket_number": f"SW-{s.id:04d}",
                "title": s.title,
                "status": s.status,
                "priority": s.priority,
                "due_date": str(s.due_date) if s.due_date else ""
            } for s in service_work_due_soon
        ],
        "service_work_in_progress": [
            {
                "id": s.id,
                "ticket_number": f"SW-{s.id:04d}",
                "title": s.title,
                "status": s.status,
                "priority": s.priority,
                "due_date": str(s.due_date) if s.due_date else ""
            } for s in service_work_in_progress
        ],
        "pending_enquiries": [
            {
                "id": e.id,
                "company_name": e.company_name,
                "contact_person": e.contact_person,
                "status": e.status,
                "date": str(e.created_at.date()) if hasattr(e, 'created_at') and e.created_at else ""
            } for e in pending_enquiries
        ],
    }