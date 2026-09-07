from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging
import os
from pydantic import BaseModel

from app.db.session import get_db
from app.models.reminder import ReminderLog
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.amc import AmcContract
from app.models.service_work import ServiceWork
from app.models.sales import SalesEnquiry
from app.models.challan import Challan
from app.models.purchase_order import PurchaseOrder
from app.schemas.reminder import ReminderSendRequest, ReminderLogOut
from app.services.email_service import send_custom_reminder_email, _send_via_smtplib, _get_ipv4_host, is_dummy_smtp
from app.core.config import get_settings
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/logs", response_model=List[ReminderLogOut])
def get_reminder_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve history log of all sent reminder emails."""
    return db.query(ReminderLog).order_by(ReminderLog.sent_at.desc()).offset(skip).limit(limit).all()


@router.get("/customer-items/{customer_id}")
def get_customer_linked_items(customer_id: int, db: Session = Depends(get_db)):
    """Fetch all tasks/contracts/invoices/challans linked to a specific customer to populate the reminder form."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    amcs = []
    try:
        amcs = db.query(AmcContract).filter(AmcContract.customer_id == customer_id).all()
    except Exception as e:
        logging.warning(f"Error fetching AMC items for customer {customer_id}: {e}")

    invoices = []
    try:
        invoices = db.query(Invoice).filter(Invoice.customer_id == customer_id, Invoice.status == "pending").all()
    except Exception as e:
        logging.warning(f"Error fetching Invoice items for customer {customer_id}: {e}")

    enquiries = []
    try:
        enquiries = db.query(SalesEnquiry).filter(
            (SalesEnquiry.company_name.ilike(f"%{customer.company_name}%")) |
            (SalesEnquiry.email == customer.email)
        ).all()
    except Exception as e:
        logging.warning(f"Error fetching Enquiry items for customer {customer_id}: {e}")

    service_tickets = []
    try:
        service_tickets = db.query(ServiceWork).filter(ServiceWork.customer_id == customer_id).all()
    except Exception as e:
        logging.warning(f"Error fetching ServiceWork items for customer {customer_id}: {e}")

    challans = []
    try:
        challans = db.query(Challan).filter(Challan.receiver_name.ilike(f"%{customer.company_name}%")).all()
    except Exception as e:
        logging.warning(f"Error fetching Challan items for customer {customer_id}: {e}")

    pos = []
    try:
        pos = db.query(PurchaseOrder).filter(PurchaseOrder.receiver_name.ilike(f"%{customer.company_name}%")).all()
    except Exception as e:
        logging.warning(f"Error fetching PurchaseOrder items for customer {customer_id}: {e}")

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
        ],
        "challans": [
            {
                "id": c.id,
                "ref_text": f"Challan #{c.challan_number} (Qty: {c.total_qty} - Status: {c.status.upper()})",
                "challan_number": c.challan_number,
                "status": c.status
            } for c in challans
        ],
        "purchase_orders": [
            {
                "id": p.id,
                "ref_text": f"Purchase Order #{p.po_number} (Total: ₹{p.total_amount:,.2f} - Status: {p.status.upper()})",
                "po_number": p.po_number,
                "status": p.status
            } for p in pos
        ]
    }


@router.get("/smtp-status")
def get_smtp_status():
    """Return currently configured sender email and SMTP configuration status."""
    settings = get_settings()
    from_name = (settings.SMTP_FROM_NAME or "Vodacom Technologies").strip('"\'')
    has_pwd = bool(settings.SMTP_PASSWORD and settings.SMTP_PASSWORD.strip() and settings.SMTP_PASSWORD != "dummy")
    return {
        "smtp_server": settings.SMTP_SERVER,
        "smtp_port": settings.SMTP_PORT,
        "smtp_username": settings.SMTP_USERNAME,
        "smtp_from_email": settings.SMTP_FROM_EMAIL,
        "smtp_from_name": from_name,
        "has_password": has_pwd,
        "is_configured": not is_dummy_smtp()
    }


class TestSmtpRequest(BaseModel):
    test_email: Optional[str] = None


@router.post("/test-smtp")
def test_smtp(req: Optional[TestSmtpRequest] = None):
    """Diagnose SMTP settings and test connection to the mail server."""
    settings = get_settings()
    if is_dummy_smtp():
        return {
            "success": False,
            "status": "not_configured",
            "message": "SMTP credentials are not configured or set to dummy values in .env.",
            "server": f"{settings.SMTP_SERVER}:{settings.SMTP_PORT}",
            "from_email": settings.SMTP_FROM_EMAIL,
            "username": settings.SMTP_USERNAME
        }

    import smtplib
    test_email = req.test_email if req else None
    try:
        ipv4_target = _get_ipv4_host(settings.SMTP_SERVER)
        server = smtplib.SMTP(timeout=10)
        server.connect(ipv4_target, settings.SMTP_PORT)
        server.ehlo()
        server.starttls()
        server.ehlo()
        password = settings.SMTP_PASSWORD.replace(" ", "")
        server.login(settings.SMTP_USERNAME, password)

        sent_test = False
        if test_email and "@" in test_email:
            from email.mime.text import MIMEText
            from_name = (settings.SMTP_FROM_NAME or "Vodacom Technologies").strip('"\'')
            msg = MIMEText(
                "Hello!\n\nThis is a diagnostic verification email sent from your Vodacom ERP system.\n"
                f"SMTP Server: {settings.SMTP_SERVER}:{settings.SMTP_PORT}\n"
                f"Sender Email: {settings.SMTP_FROM_EMAIL}\n\n"
                "Your SMTP email configuration is active and working properly!",
                "plain"
            )
            msg["Subject"] = "[Vodacom ERP] SMTP Diagnostic Test Email"
            msg["From"] = f"{from_name} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = test_email
            server.sendmail(settings.SMTP_FROM_EMAIL, [test_email], msg.as_string())
            sent_test = True

        server.quit()
        return {
            "success": True,
            "status": "connected",
            "message": f"SMTP server connected and authenticated successfully!{' Verification email sent to ' + test_email if sent_test else ''}",
            "server": f"{settings.SMTP_SERVER}:{settings.SMTP_PORT}",
            "from_email": settings.SMTP_FROM_EMAIL,
            "username": settings.SMTP_USERNAME
        }
    except smtplib.SMTPAuthenticationError as auth_err:
        return {
            "success": False,
            "status": "auth_failed",
            "message": "Gmail rejected your credentials (Error 535: Bad Credentials).",
            "detail": str(auth_err),
            "server": f"{settings.SMTP_SERVER}:{settings.SMTP_PORT}",
            "username": settings.SMTP_USERNAME,
            "from_email": settings.SMTP_FROM_EMAIL,
            "hint": "Generate a 16-character Google App Password at https://myaccount.google.com/apppasswords and update SMTP_PASSWORD."
        }
    except Exception as e:
        return {
            "success": False,
            "status": "connection_failed",
            "message": f"SMTP Connection error: {str(e)}",
            "detail": str(e),
            "server": f"{settings.SMTP_SERVER}:{settings.SMTP_PORT}",
            "username": settings.SMTP_USERNAME,
            "from_email": settings.SMTP_FROM_EMAIL
        }


class SmtpConfigUpdate(BaseModel):
    smtp_username: str
    smtp_password: str
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = "Vodacom Technologies"
    smtp_server: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587


@router.post("/smtp-config")
def update_smtp_config(cfg: SmtpConfigUpdate):
    """Update SMTP settings in .env and refresh app configuration in memory."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env")

    clean_user = cfg.smtp_username.strip()
    clean_pw = cfg.smtp_password.strip().replace(" ", "")
    clean_from = (cfg.smtp_from_email or clean_user).strip()
    clean_name = (cfg.smtp_from_name or "Vodacom Technologies").strip().replace('"', '')
    clean_server = (cfg.smtp_server or "smtp.gmail.com").strip()
    clean_port = cfg.smtp_port or 587

    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    keys_to_update = {
        "SMTP_USERNAME": clean_user,
        "SMTP_PASSWORD": clean_pw,
        "SMTP_SERVER": clean_server,
        "SMTP_PORT": str(clean_port),
        "SMTP_FROM_EMAIL": clean_from,
        "SMTP_FROM_NAME": f'"{clean_name}"',
    }

    new_lines = []
    found_keys = set()
    for line in lines:
        matched = False
        for k, v in keys_to_update.items():
            if line.strip().startswith(f"{k}=") or line.strip().startswith(f"{k} ="):
                new_lines.append(f"{k}={v}\n")
                found_keys.add(k)
                matched = True
                break
        if not matched:
            new_lines.append(line)

    for k, v in keys_to_update.items():
        if k not in found_keys:
            new_lines.append(f"{k}={v}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    get_settings.cache_clear()

    return {
        "status": "success",
        "message": "SMTP configuration updated successfully! Changes take effect immediately.",
        "username": clean_user,
        "from_email": clean_from
    }


@router.post("/send", response_model=ReminderLogOut)
async def send_reminder(request: Request, db: Session = Depends(get_db)):
    """Dispatch an email reminder with optional attachments to a designated customer contact and log the record."""
    content_type = request.headers.get("content-type", "")

    customer_id = None
    recipient_email = ""
    category = "General"
    reference_text = ""
    subject = ""
    message = ""
    attachments = []
    attachment_filenames = []

    if "multipart/form-data" in content_type:
        form = await request.form()
        cid = form.get("customer_id")
        if cid and str(cid).strip() and str(cid).strip() not in ("null", "undefined"):
            try:
                customer_id = int(str(cid).strip())
            except ValueError:
                customer_id = None
        recipient_email = str(form.get("recipient_email", "")).strip()
        category = str(form.get("category", "General")).strip()
        reference_text = str(form.get("reference_text", "")).strip()
        subject = str(form.get("subject", "")).strip()
        message = str(form.get("message", "")).strip()

        # Extract files
        files = form.getlist("files")
        for f in files:
            if hasattr(f, "read") and hasattr(f, "filename") and f.filename:
                content = await f.read()
                if content and len(content) > 0:
                    attachments.append((f.filename, content, getattr(f, "content_type", "application/octet-stream")))
                    attachment_filenames.append(f.filename)
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        customer_id = body.get("customer_id")
        recipient_email = str(body.get("recipient_email", "")).strip()
        category = str(body.get("category", "General")).strip()
        reference_text = str(body.get("reference_text", "")).strip()
        subject = str(body.get("subject", "")).strip()
        message = str(body.get("message", "")).strip()

    if not recipient_email or "@" not in recipient_email:
        raise HTTPException(status_code=400, detail="A valid recipient email address is required.")
    if not subject:
        raise HTTPException(status_code=400, detail="Email subject cannot be blank.")
    if not message:
        raise HTTPException(status_code=400, detail="Email message cannot be blank.")

    status = "sent"
    err_detail = ""
    try:
        await send_custom_reminder_email(
            to_email=recipient_email,
            subject=subject,
            body_text=message,
            attachments=attachments
        )
    except Exception as e:
        logging.error(f"[REMINDER_SEND_ERROR] {e}")
        status = "failed"
        err_detail = str(e)

    logged_ref = reference_text or ""
    if attachment_filenames:
        att_str = f" [Attached: {', '.join(attachment_filenames)}]"
        logged_ref = f"{logged_ref}{att_str}".strip()

    log_entry = ReminderLog(
        customer_id=customer_id,
        recipient_email=recipient_email,
        category=category,
        reference_text=logged_ref[:255] if logged_ref else None,
        subject=subject[:255],
        message=message,
        status=status
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    if status == "failed":
        msg = f"Failed to send email via SMTP server: {err_detail}" if err_detail else "Failed to send email via SMTP server."
        raise HTTPException(status_code=500, detail=msg)

    return log_entry

