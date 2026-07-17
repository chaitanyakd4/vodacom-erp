from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
import datetime
import uuid

from app.db.session import get_db
from app.models.challan import Challan, ChallanItem
from app.models.product import Product
from app.schemas.challan import ChallanCreate, ChallanOut
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


def _generate_challan_number(db: Session) -> str:
    year = datetime.datetime.utcnow().year
    count = db.query(Challan).count() + 1
    return f"DC/{year}/{count:04d}"


@router.get("", response_model=List[ChallanOut])
@router.get("/", response_model=List[ChallanOut])
def list_challans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    return db.query(Challan).options(joinedload(Challan.items)).order_by(Challan.id.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=ChallanOut)
@router.post("/", response_model=ChallanOut)
def create_challan(challan: ChallanCreate, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    challan_number = _generate_challan_number(db)
    db_challan = Challan(
        challan_number=challan_number,
        date=datetime.datetime.utcnow(),
        reverse_charge=challan.reverse_charge,
        invoice_ref=challan.invoice_ref,
        transportation_mode=challan.transportation_mode,
        vehicle_no=challan.vehicle_no,
        date_of_supply=challan.date_of_supply,
        place_of_supply=challan.place_of_supply,
        receiver_name=challan.receiver_name,
        receiver_address=challan.receiver_address,
        receiver_gstin=challan.receiver_gstin,
        receiver_state=challan.receiver_state,
        receiver_state_code=challan.receiver_state_code,
        payment_terms=challan.payment_terms,
        consignee_name=challan.consignee_name,
        consignee_address=challan.consignee_address,
        consignee_gstin=challan.consignee_gstin,
        consignee_state=challan.consignee_state,
        consignee_state_code=challan.consignee_state_code,
        other_reference=challan.other_reference,
        total_qty=challan.total_qty,
        total_amount=challan.total_amount,
        notes=challan.notes,
        status=challan.status,
    )
    db.add(db_challan)
    db.flush()

    for item in challan.items:
        # Auto-fill from product if product_id given and fields are empty
        prod_name = item.description
        hsn = item.hsn_sac
        uom = item.uom
        rate = item.rate
        if item.product_id:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            if prod:
                if not prod_name:
                    prod_name = prod.name
                if not hsn:
                    hsn = prod.hsn_code or ""
                if not uom or uom == "Nos":
                    uom = prod.unit or "Nos"
                if rate == 0:
                    rate = prod.price
        total = item.quantity * rate
        db_item = ChallanItem(
            challan_id=db_challan.id,
            product_id=item.product_id,
            description=prod_name,
            hsn_sac=hsn,
            uom=uom,
            quantity=item.quantity,
            rate=rate,
            total_amount=total,
        )
        db.add(db_item)

    db.commit()
    # Re-query with items eagerly loaded so the response_model has items
    created = db.query(Challan).options(joinedload(Challan.items)).filter(Challan.id == db_challan.id).first()
    return created


@router.get("/{challan_id}", response_model=ChallanOut)
def get_challan(challan_id: int, db: Session = Depends(get_db)):
    challan = db.query(Challan).filter(Challan.id == challan_id).first()
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
    return challan


@router.put("/{challan_id}", response_model=ChallanOut)
def update_challan_status(challan_id: int, update: dict, db: Session = Depends(get_db)):
    challan = db.query(Challan).filter(Challan.id == challan_id).first()
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
    for key, value in update.items():
        if hasattr(challan, key):
            setattr(challan, key, value)
    db.commit()
    db.refresh(challan)
    return challan


@router.delete("/{challan_id}")
def delete_challan(challan_id: int, db: Session = Depends(get_db)):
    challan = db.query(Challan).filter(Challan.id == challan_id).first()
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
    db.delete(challan)
    db.commit()
    return {"detail": "Challan deleted"}


@router.get("/{challan_id}/pdf")
def download_challan_pdf(challan_id: int, db: Session = Depends(get_db)):
    from app.services.challan_pdf_service import generate_challan_pdf
    challan = db.query(Challan).filter(Challan.id == challan_id).first()
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
    try:
        pdf_bytes = generate_challan_pdf(challan_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
    filename = f"Challan_{challan.challan_number.replace('/', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
