from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime

from app.db.session import get_db
from app.models.service_work import ServiceWork
from app.schemas.service_work import ServiceWorkCreate, ServiceWorkUpdate, ServiceWorkOut
from app.core.security import get_current_user

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

    # ── Fetch associated Customer ─────────────────────────────────────────────
    from app.models.customer import Customer  # local import to avoid circular
    customer = db.query(Customer).filter(Customer.id == db_work.customer_id).first()
    customer_name = customer.company_name if customer else f"Customer #{db_work.customer_id}"

    # ── 1. Send SMS/WhatsApp alert to Technician ──────────────────────────────
    if db_work.technician_mobile:
        try:
            from app.services.sms_service import send_ticket_notification  # lazy import
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
            logging.warning(f"[SMS] Ticket #{db_work.id} technician alert failed: {sms_err}")

    # ── 2. Send SMS/WhatsApp acknowledgment to Client / Customer ──────────────
    if customer and customer.phone:
        try:
            from app.services.sms_service import send_customer_ticket_ack  # lazy import
            send_customer_ticket_ack(
                to_number=customer.phone,
                ticket_id=db_work.id,
                customer_name=customer_name,
                title=db_work.title,
                priority=db_work.priority,
                person_on_duty=db_work.person_on_duty or "Vodacom Support Team",
            )
        except Exception as cust_sms_err:
            import logging
            logging.warning(f"[SMS] Ticket #{db_work.id} customer ack failed: {cust_sms_err}")
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
        if hasattr(db_work, key):   # skip fields not yet migrated into the DB schema
            setattr(db_work, key, value)

    try:
        db.commit()
        db.refresh(db_work)
    except Exception as commit_err:
        db.rollback()
        import logging
        logging.error(f"[SERVICE-WORK] Commit failed for ticket {work_id}: {commit_err}")
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(commit_err)}")

    # ── Send update SMS/WhatsApp to technician (unless ticket is now locked) ─
    mobile = db_work.technician_mobile
    if mobile and db_work.status not in ("resolved", "closed"):
        from app.models.customer import Customer
        customer = db.query(Customer).filter(Customer.id == db_work.customer_id).first()
        customer_name = customer.company_name if customer else f"Customer #{db_work.customer_id}"
        try:
            from app.services.sms_service import send_ticket_notification  # lazy import
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


class ReachSitePayload(BaseModel):
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two GPS points in kilometers."""
    import math
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def _geocode_address(address: str) -> tuple:
    """
    Use a free geocoding API to convert a text address into lat/lng.
    Returns (latitude, longitude) or (None, None) if it fails.
    """
    if not address or not address.strip():
        return None, None
    try:
        import httpx
        # Using Nominatim (OpenStreetMap) - free, no API key needed
        res = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": address, "format": "json", "limit": 1},
            headers={"User-Agent": "VodacomERP/1.0"},
            timeout=8.0
        )
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as geo_err:
        import logging
        logging.warning(f"[GEOCODE] Failed to geocode '{address}': {geo_err}")
    return None, None


@router.post("/{work_id}/reach-site", response_model=ServiceWorkOut)
def mark_technician_reached_site(
    work_id: int, 
    payload: Optional[ReachSitePayload] = None,
    db: Session = Depends(get_db)
):
    """
    Mark that the assigned technician has reached the site of visit.
    Records arrival timestamp, GPS location, calculates distance from client site (geofencing),
    and sends an instant alert to the Admin via WhatsApp & SMS.
    """
    db_work = db.query(ServiceWork).filter(ServiceWork.id == work_id).first()
    if not db_work:
        raise HTTPException(status_code=404, detail="Service ticket not found")

    if db_work.status in ("resolved", "closed"):
        raise HTTPException(status_code=400, detail="Cannot mark reached on a resolved/closed ticket")

    now = datetime.utcnow()
    db_work.reached_at = now
    db_work.status = "in_progress"

    tech_lat = None
    tech_lng = None

    if payload:
        if payload.location:
            db_work.reached_location = payload.location
        tech_lat = payload.latitude
        tech_lng = payload.longitude

    # ── Geofencing: Calculate distance from customer address ──────────────
    distance_km = None
    distance_warning = ""

    if tech_lat and tech_lng:
        from app.models.customer import Customer
        customer = db.query(Customer).filter(Customer.id == db_work.customer_id).first()

        if customer and customer.address:
            cust_lat, cust_lng = _geocode_address(customer.address)

            if cust_lat is not None and cust_lng is not None:
                distance_km = _haversine_km(tech_lat, tech_lng, cust_lat, cust_lng)

                if distance_km > 5.0:
                    distance_warning = f"⚠️ SUSPICIOUS — Technician checked in {distance_km} km AWAY from client site!"
                elif distance_km > 1.0:
                    distance_warning = f"⚡ Technician is {distance_km} km away from client site."
                else:
                    distance_warning = f"✅ Technician is within {distance_km} km of client site (Verified)."

    db.commit()
    db.refresh(db_work)

    # ── Notify Admin via WhatsApp ─────────────────────────────────────────
    from app.models.customer import Customer
    customer = db.query(Customer).filter(Customer.id == db_work.customer_id).first()
    customer_name = customer.company_name if customer else f"Customer #{db_work.customer_id}"

    try:
        from app.services.sms_service import send_technician_reached_notification
        time_str = now.strftime("%d-%b-%Y %I:%M %p")
        send_technician_reached_notification(
            ticket_id=db_work.id,
            customer_name=customer_name,
            title=db_work.title,
            person_on_duty=db_work.person_on_duty or "Assigned Technician",
            technician_mobile=db_work.technician_mobile or "",
            reached_time_str=time_str,
            location_str=db_work.reached_location or "",
            distance_warning=distance_warning
        )
    except Exception as notify_err:
        import logging
        logging.warning(f"[NOTIFY] Reached site alert failed for #{db_work.id}: {notify_err}")

    # Attach distance_km to the response for frontend display
    response_data = db_work.__dict__.copy()
    response_data["reached_distance_km"] = distance_km

    return db_work


