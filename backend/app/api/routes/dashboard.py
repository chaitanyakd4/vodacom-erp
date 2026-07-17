from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.amc import AmcContract
from app.models.service_work import ServiceWork
from app.models.sales import SalesEnquiry
from datetime import date, timedelta

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_customers = db.query(Customer).count()
    total_products = db.query(Product).count()
    total_invoices = db.query(Invoice).count()
    active_amcs = db.query(AmcContract).filter(AmcContract.status == "active").count()
    open_service_work = db.query(ServiceWork).filter(ServiceWork.status.in_(["open", "in_progress"])).count()
    active_enquiries = db.query(SalesEnquiry).filter(SalesEnquiry.status.in_(["new", "quoted"])).count()

    return {
        "total_customers": total_customers,
        "total_products": total_products,
        "total_invoices": total_invoices,
        "active_amcs": active_amcs,
        "open_service_work": open_service_work,
        "active_enquiries": active_enquiries,
    }

@router.get("/reminders")
def get_reminders(db: Session = Depends(get_db)):
    today = date.today()
    in_30_days = today + timedelta(days=30)
    in_7_days = today + timedelta(days=7)

    # AMC Reminders
    amc_expiring_soon = db.query(AmcContract).filter(
        AmcContract.status == "active",
        AmcContract.end_date >= today,
        AmcContract.end_date <= in_30_days
    ).all()

    amc_expired = db.query(AmcContract).filter(
        AmcContract.status == "active",
        AmcContract.end_date < today
    ).all()

    # Service Work Reminders
    service_work_overdue = db.query(ServiceWork).filter(
        ServiceWork.status.in_(["open", "in_progress"]),
        ServiceWork.due_date < today
    ).all()

    service_work_due_soon = db.query(ServiceWork).filter(
        ServiceWork.status.in_(["open", "in_progress"]),
        ServiceWork.due_date >= today,
        ServiceWork.due_date <= in_7_days
    ).all()

    return {
        "amc_expiring_soon": amc_expiring_soon,
        "amc_expired": amc_expired,
        "service_work_overdue": service_work_overdue,
        "service_work_due_soon": service_work_due_soon,
    }