from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from datetime import date, timedelta, datetime
from pydantic import BaseModel
import openpyxl
from openpyxl.worksheet.worksheet import Worksheet
import io
import re

from app.db.session import get_db
from app.models.amc import AmcContract, AmcItem
from app.models.product import Product
from app.models.customer import Customer
from app.schemas.amc import AmcCreate, AmcUpdate, AmcOut, AddProductToAmcRequest
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


class AmcRenewRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    amount: Optional[float] = None
    notes: Optional[str] = None


class AmcImportRow(BaseModel):
    customer_id: Optional[Any] = None
    client_company: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    company_address: Optional[str] = None
    coverage_start: Optional[Any] = None
    coverage_end: Optional[Any] = None
    contract_amount: Optional[Any] = None
    status: Optional[str] = "active"
    additional_notes: Optional[str] = None
    # Aliases
    start_date: Optional[Any] = None
    end_date: Optional[Any] = None
    amount: Optional[Any] = None
    notes: Optional[str] = None


class AmcImportSaveRequest(BaseModel):
    contracts: List[AmcImportRow]


def _generate_amc_contract_number(db: Session) -> str:
    year = datetime.now().year
    prefix = f"AMC-{year}-"
    existing = db.query(AmcContract.contract_number).filter(AmcContract.contract_number.like(f"{prefix}%")).all()
    max_num = 0
    for (num_str,) in existing:
        try:
            val = int(num_str.split("-")[-1])
            if val > max_num:
                max_num = val
        except (ValueError, IndexError):
            pass
    if max_num == 0:
        max_num = db.query(AmcContract).count()
    counter = max_num + 1
    candidate = f"{prefix}{counter:04d}"
    while db.query(AmcContract).filter(AmcContract.contract_number == candidate).first():
        counter += 1
        candidate = f"{prefix}{counter:04d}"
    return candidate


def _parse_amount(val) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    cleaned = str(val).replace(",", "").strip()
    match = re.search(r'[-+]?\d+(?:\.\d+)?', cleaned)
    if match:
        try:
            return float(match.group(0))
        except (ValueError, TypeError):
            pass
    return 0.0


def _parse_date(date_val) -> Optional[date]:
    if not date_val:
        return None
    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, date):
        return date_val
    if isinstance(date_val, (int, float)):
        try:
            return (datetime(1899, 12, 30) + timedelta(days=float(date_val))).date()
        except:
            pass
    date_str = str(date_val).strip()
    if not date_str or date_str.lower() in ("none", "null", "nan", "n/a", "-"):
        return None
    try:
        date_str = date_str.split(" ")[0]
    except:
        pass
    for fmt in [
        "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y",
        "%d.%m.%Y", "%d-%b-%Y", "%d-%b-%y", "%d/%m/%y", "%d-%m-%y"
    ]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            pass
    return None


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
    from sqlalchemy.orm import joinedload
    _auto_expire_contracts(db)
    return db.query(AmcContract).options(joinedload(AmcContract.customer), joinedload(AmcContract.items)).order_by(AmcContract.id.desc()).offset(skip).limit(limit).all()


@router.get("/next-number")
def get_next_amc_number(db: Session = Depends(get_db)):
    return {"contract_number": _generate_amc_contract_number(db)}


@router.post("/", response_model=AmcOut)
def create_amc(amc: AmcCreate, db: Session = Depends(get_db)):
    amc_data = amc.model_dump()
    items_data = amc_data.pop("items", [])
    
    if not amc_data.get("contract_number") or not str(amc_data["contract_number"]).strip():
        amc_data["contract_number"] = _generate_amc_contract_number(db)
        
    db_amc = AmcContract(**amc_data)
    if db_amc.end_date < date.today() and db_amc.status == "active":
        db_amc.status = "expired"
        
    db.add(db_amc)
    db.flush()

    for item in items_data:
        total = item.get("total_amount") or (item.get("quantity", 1) * item.get("unit_price", 0.0))
        db_item = AmcItem(
            amc_id=db_amc.id,
            product_id=item.get("product_id"),
            product_name=item["product_name"],
            quantity=item.get("quantity", 1),
            unit_price=item.get("unit_price", 0.0),
            total_amount=total,
            added_date=date.today()
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_amc)
    return db_amc


@router.post("/import/preview")
async def import_amc_preview(file: UploadFile = File(...), db: Session = Depends(get_db)):
    import re
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    contents = await file.read()
    try:
        workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = workbook.active
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")
        
    rows = list(sheet.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        return {"rows": [], "warnings": ["File is empty or has only headers"]}
        
    raw_headers = [str(h).lower().strip() if h else "" for h in rows[0]]
    # Normalize headers: strip punctuation like '.' and collapse whitespace
    headers = [re.sub(r'[^a-z0-9 ]', '', h).strip() for h in raw_headers]
    
    company_cols = {"client company", "company", "client", "customer", "customer name", "company name", "firm name", "firm"}
    person_cols = {"contact person", "contact", "person", "name", "representative"}
    phone_cols = {"contact person ph", "contact person phone", "contact ph", "phone", "mobile", "contact no", "phone number", "ph"}
    email_cols = {"contact email", "email", "email address", "mail"}
    address_cols = {"company address", "address", "location", "billing address", "office address"}
    start_cols = {"coverage start", "start date", "start", "from date", "from"}
    end_cols = {"coverage end", "end date", "end", "to date", "to", "expiry", "expiry date"}
    amount_cols = {"contract amount", "amount", "contract value", "value", "price"}
    status_cols = {"status"}
    notes_cols = {"additional notes", "additional note", "notes", "remarks", "comments", "note"}
    
    def find_col(possible_names):
        for i, h in enumerate(headers):
            if h in possible_names:
                return i
        return -1
        
    c_idx = find_col(company_cols)
    cp_idx = find_col(person_cols)
    ph_idx = find_col(phone_cols)
    em_idx = find_col(email_cols)
    ad_idx = find_col(address_cols)
    s_idx = find_col(start_cols)
    e_idx = find_col(end_cols)
    a_idx = find_col(amount_cols)
    st_idx = find_col(status_cols)
    n_idx = find_col(notes_cols)
    
    if c_idx == -1 or s_idx == -1 or e_idx == -1 or a_idx == -1:
        missing = []
        if c_idx == -1: missing.append("Client Company")
        if s_idx == -1: missing.append("Coverage Start")
        if e_idx == -1: missing.append("Coverage End")
        if a_idx == -1: missing.append("Contract Amount")
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing)}")
        
    result_rows = []
    warnings = []
    
    for i, row in enumerate(rows[1:], start=2):
        if not any(row):
            continue
            
        client_company = str(row[c_idx]).strip() if c_idx != -1 and row[c_idx] is not None else ""
        contact_person = str(row[cp_idx]).strip() if cp_idx != -1 and row[cp_idx] is not None else ""
        contact_phone = str(row[ph_idx]).strip() if ph_idx != -1 and row[ph_idx] is not None else ""
        contact_email = str(row[em_idx]).strip() if em_idx != -1 and row[em_idx] is not None else ""
        company_address = str(row[ad_idx]).strip() if ad_idx != -1 and row[ad_idx] is not None else ""
        s_val = row[s_idx]
        e_val = row[e_idx]
        a_val = row[a_idx]
        status_val = str(row[st_idx]).strip().lower() if st_idx != -1 and row[st_idx] is not None else "active"
        notes_val = str(row[n_idx]).strip() if n_idx != -1 and row[n_idx] is not None else ""
        
        row_warns = []
        
        customer_id = None
        if client_company:
            customer = db.query(Customer).filter(Customer.company_name.ilike(client_company)).first()
            if customer:
                customer_id = customer.id
                if not contact_person and customer.contact_person:
                    contact_person = customer.contact_person
                if not contact_phone and customer.phone:
                    contact_phone = customer.phone
                if not contact_email and customer.email:
                    contact_email = customer.email
                if not company_address and customer.address:
                    company_address = customer.address
            else:
                row_warns.append(f"Client '{client_company}' is new (will be auto-created as customer profile on save).")
        else:
            row_warns.append("Client company name is missing.")
            
        start_date = _parse_date(s_val)
        if not start_date:
            row_warns.append(f"Invalid coverage start: {s_val}")
            
        end_date = _parse_date(e_val)
        if not end_date:
            row_warns.append(f"Invalid coverage end: {e_val}")
            
        amount = _parse_amount(a_val)
        if amount == 0.0 and a_val is not None and str(a_val).strip() not in ("0", "0.0", "", "none", "null", "None"):
            row_warns.append(f"Notice: contract amount evaluated as 0.0 from '{a_val}'")
            
        if row_warns:
            warnings.append(f"Row {i}: " + " | ".join(row_warns))
            
        result_rows.append({
            "customer_id": customer_id,
            "client_company": client_company,
            "contact_person": contact_person,
            "contact_phone": contact_phone,
            "contact_email": contact_email,
            "company_address": company_address,
            "coverage_start": str(start_date) if start_date else "",
            "coverage_end": str(end_date) if end_date else "",
            "contract_amount": amount,
            "status": status_val or "active",
            "additional_notes": notes_val or ""
        })
        
    return {"rows": result_rows, "warnings": warnings}


@router.post("/import/save")
def import_amc_save(payload: AmcImportSaveRequest, db: Session = Depends(get_db)):
    contracts_created = 0
    today = date.today()
    for row in payload.contracts:
        raw_start = row.coverage_start if row.coverage_start is not None else row.start_date
        raw_end = row.coverage_end if row.coverage_end is not None else row.end_date
        raw_amt = row.contract_amount if row.contract_amount is not None else row.amount
        st = (str(row.status) if row.status else "active").strip().lower()
        if st not in ("active", "expired", "cancelled"):
            st = "active"
        notes_text = str(row.additional_notes or row.notes or "").strip() or None

        start_dt = _parse_date(raw_start) or today
        end_dt = _parse_date(raw_end) or (start_dt + timedelta(days=365))
        amt = _parse_amount(raw_amt)

        cust_id = None
        if row.customer_id:
            try:
                cust_id = int(row.customer_id)
            except (ValueError, TypeError):
                cust_id = None

        company_name = (row.client_company or "").strip()
        if not cust_id and company_name:
            existing_cust = db.query(Customer).filter(Customer.company_name.ilike(company_name)).first()
            if existing_cust:
                cust_id = existing_cust.id
            else:
                new_cust = Customer(
                    company_name=company_name,
                    contact_person=(row.contact_person or "Unknown Contact").strip(),
                    phone=(row.contact_phone or "N/A").strip(),
                    email=str(row.contact_email).strip() if row.contact_email else None,
                    address=(row.company_address or "N/A").strip(),
                )
                db.add(new_cust)
                db.flush()
                cust_id = new_cust.id

        if not cust_id:
            continue

        contract_number = _generate_amc_contract_number(db)
        db_amc = AmcContract(
            customer_id=cust_id,
            contract_number=contract_number,
            start_date=start_dt,
            end_date=end_dt,
            amount=amt,
            status=st,
            notes=notes_text
        )
        db.add(db_amc)
        db.commit()
        contracts_created += 1
        
    return {"message": "Import successful", "count": contracts_created}


@router.get("/{amc_id}", response_model=AmcOut)
def get_amc(amc_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    _auto_expire_contracts(db)
    amc = db.query(AmcContract).options(joinedload(AmcContract.customer), joinedload(AmcContract.items)).filter(AmcContract.id == amc_id).first()
    if not amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")
    return amc


@router.put("/{amc_id}", response_model=AmcOut)
def update_amc(amc_id: int, amc_update: AmcUpdate, db: Session = Depends(get_db)):
    db_amc = db.query(AmcContract).filter(AmcContract.id == amc_id).first()
    if not db_amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")
    
    update_data = amc_update.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)

    for key, value in update_data.items():
        setattr(db_amc, key, value)
    
    if items_data is not None:
        db.query(AmcItem).filter(AmcItem.amc_id == amc_id).delete()
        for item in items_data:
            total = item.get("total_amount") or (item.get("quantity", 1) * item.get("unit_price", 0.0))
            db_item = AmcItem(
                amc_id=db_amc.id,
                product_id=item.get("product_id"),
                product_name=item["product_name"],
                quantity=item.get("quantity", 1),
                unit_price=item.get("unit_price", 0.0),
                total_amount=total,
                added_date=date.today()
            )
            db.add(db_item)

    if db_amc.end_date < date.today() and db_amc.status == "active":
        db_amc.status = "expired"

    db.commit()
    db.refresh(db_amc)
    return db_amc


@router.post("/{amc_id}/add-product", response_model=AmcOut)
def add_product_to_amc(amc_id: int, req: AddProductToAmcRequest, db: Session = Depends(get_db)):
    """
    Enlists and adds an inventory item under an existing AMC contract.
    Optionally increases contract amount and logs the pricing update with timestamp.
    """
    amc = db.query(AmcContract).filter(AmcContract.id == amc_id).first()
    if not amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")

    item_total = req.quantity * req.unit_price
    amc_item = AmcItem(
        amc_id=amc.id,
        product_id=req.product_id,
        product_name=req.product_name,
        quantity=req.quantity,
        unit_price=req.unit_price,
        total_amount=item_total,
        added_date=date.today()
    )
    db.add(amc_item)

    log_entry = f"Added '{req.product_name}' (Qty: {req.quantity}, Price: ₹{item_total:,.2f}) on {date.today()}."

    if req.increase_contract_amount and item_total > 0:
        old_amount = amc.amount
        amc.amount += item_total
        log_entry += f" Updated contract pricing from ₹{old_amount:,.2f} to ₹{amc.amount:,.2f}."

    amc.notes = f"{amc.notes}\n[{log_entry}]" if amc.notes else log_entry
    db.commit()
    db.refresh(amc)
    return amc


@router.delete("/{amc_id}/items/{item_id}", response_model=AmcOut)
def delete_amc_item(amc_id: int, item_id: int, db: Session = Depends(get_db)):
    amc = db.query(AmcContract).filter(AmcContract.id == amc_id).first()
    if not amc:
        raise HTTPException(status_code=404, detail="AMC Contract not found")

    item = db.query(AmcItem).filter(AmcItem.id == item_id, AmcItem.amc_id == amc_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="AMC covered item not found")

    db.delete(item)
    db.commit()
    db.refresh(amc)
    return amc


@router.post("/{amc_id}/renew", response_model=AmcOut)
def renew_amc(amc_id: int, req: Optional[AmcRenewRequest] = None, db: Session = Depends(get_db)):
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
