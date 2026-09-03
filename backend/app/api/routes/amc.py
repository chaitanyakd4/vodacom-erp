from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta, datetime
from pydantic import BaseModel
import openpyxl
from openpyxl.worksheet.worksheet import Worksheet
import io

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
    customer_id: int
    start_date: date
    end_date: date
    amount: float
    status: str = "active"
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


def _parse_date(date_val) -> Optional[date]:
    if not date_val:
        return None
    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, date):
        return date_val
    date_str = str(date_val).strip()
    # Try just parsing time string
    try:
        date_str = date_str.split(" ")[0]
    except:
        pass
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"]:
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
    _auto_expire_contracts(db)
    return db.query(AmcContract).offset(skip).limit(limit).all()


@router.post("/", response_model=AmcOut)
def create_amc(amc: AmcCreate, db: Session = Depends(get_db)):
    amc_data = amc.model_dump()
    items_data = amc_data.pop("items", [])
    
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
        
    headers = [str(h).lower().strip() if h else "" for h in rows[0]]
    
    customer_cols = {"customer_name", "customer", "client", "company", "company_name"}
    start_cols = {"start_date", "start", "from_date", "from"}
    end_cols = {"end_date", "end", "to_date", "to", "expiry", "expiry_date"}
    amount_cols = {"amount", "contract_amount", "value", "price"}
    status_cols = {"status"}
    notes_cols = {"notes", "remarks", "comments"}
    
    def find_col(possible_names):
        for i, h in enumerate(headers):
            if h in possible_names:
                return i
        return -1
        
    c_idx = find_col(customer_cols)
    s_idx = find_col(start_cols)
    e_idx = find_col(end_cols)
    a_idx = find_col(amount_cols)
    st_idx = find_col(status_cols)
    n_idx = find_col(notes_cols)
    
    if c_idx == -1 or s_idx == -1 or e_idx == -1 or a_idx == -1:
        missing = []
        if c_idx == -1: missing.append("Customer Name")
        if s_idx == -1: missing.append("Start Date")
        if e_idx == -1: missing.append("End Date")
        if a_idx == -1: missing.append("Amount")
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing)}")
        
    result_rows = []
    warnings = []
    
    for i, row in enumerate(rows[1:], start=2):
        if not any(row):
            continue
            
        c_val = row[c_idx]
        s_val = row[s_idx]
        e_val = row[e_idx]
        a_val = row[a_idx]
        st_val = row[st_idx] if st_idx != -1 else "active"
        n_val = row[n_idx] if n_idx != -1 else None
        
        row_warns = []
        
        customer_id = None
        customer_name = str(c_val).strip() if c_val else ""
        if customer_name:
            customer = db.query(Customer).filter(Customer.company_name.ilike(customer_name)).first()
            if customer:
                customer_id = customer.id
            else:
                row_warns.append(f"Customer '{customer_name}' not found.")
        else:
            row_warns.append("Customer name is missing.")
            
        start_date = _parse_date(s_val)
        if not start_date:
            row_warns.append(f"Invalid start date: {s_val}")
            
        end_date = _parse_date(e_val)
        if not end_date:
            row_warns.append(f"Invalid end date: {e_val}")
            
        try:
            amount = float(a_val)
        except (ValueError, TypeError):
            row_warns.append(f"Invalid amount: {a_val}")
            amount = 0.0
            
        if row_warns:
            warnings.append(f"Row {i}: " + " | ".join(row_warns))
            
        result_rows.append({
            "customer_id": customer_id,
            "customer_name": customer_name,
            "start_date": start_date,
            "end_date": end_date,
            "amount": amount,
            "status": str(st_val).strip().lower() if st_val and str(st_val).strip() else "active",
            "notes": str(n_val).strip() if n_val else None
        })
        
    return {"rows": result_rows, "warnings": warnings}


@router.post("/import/save")
def import_amc_save(payload: AmcImportSaveRequest, db: Session = Depends(get_db)):
    contracts_created = 0
    for row in payload.contracts:
        contract_number = _generate_amc_contract_number(db)
        
        db_amc = AmcContract(
            customer_id=row.customer_id,
            contract_number=contract_number,
            start_date=row.start_date,
            end_date=row.end_date,
            amount=row.amount,
            status=row.status,
            notes=row.notes
        )
        db.add(db_amc)
        db.commit()
        contracts_created += 1
        
    return {"message": "Import successful", "count": contracts_created}


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
