from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from typing import List
import datetime

from app.db.session import get_db
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.product import Product
from app.schemas.purchase_order import POCreate, POOut, POUpdate
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


def _generate_po_number(db: Session) -> str:
    year = datetime.datetime.utcnow().year
    prefix = f"PO/{year}/"
    pos = db.query(PurchaseOrder.po_number).filter(PurchaseOrder.po_number.like(f"{prefix}%")).all()
    max_num = 0
    for (num_str,) in pos:
        try:
            val = int(num_str.split("/")[-1])
            if val > max_num:
                max_num = val
        except (ValueError, IndexError):
            pass
    if max_num == 0:
        max_num = db.query(PurchaseOrder).count()
    candidate = f"PO/{year}/{(max_num + 1):04d}"
    counter = max_num + 1
    while db.query(PurchaseOrder).filter(PurchaseOrder.po_number == candidate).first():
        counter += 1
        candidate = f"PO/{year}/{counter:04d}"
    return candidate


@router.get("", response_model=List[POOut])
@router.get("/", response_model=List[POOut])
def list_purchase_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return (
        db.query(PurchaseOrder)
        .options(joinedload(PurchaseOrder.items))
        .order_by(PurchaseOrder.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("", response_model=POOut)
@router.post("/", response_model=POOut)
def create_purchase_order(po: POCreate, db: Session = Depends(get_db)):
    po_number = _generate_po_number(db)
    dos = po.date_of_supply
    if dos and hasattr(dos, 'tzinfo') and dos.tzinfo:
        dos = dos.replace(tzinfo=None)
    db_po = PurchaseOrder(
        po_number=po_number,
        date=datetime.datetime.utcnow(),
        reverse_charge=po.reverse_charge,
        invoice_ref=po.invoice_ref,
        transportation_mode=po.transportation_mode,
        vehicle_no=po.vehicle_no,
        date_of_supply=dos,
        place_of_supply=po.place_of_supply,
        receiver_name=po.receiver_name,
        receiver_address=po.receiver_address,
        receiver_gstin=po.receiver_gstin,
        receiver_state=po.receiver_state,
        receiver_state_code=po.receiver_state_code,
        payment_terms=po.payment_terms,
        consignee_name=po.consignee_name,
        consignee_address=po.consignee_address,
        consignee_gstin=po.consignee_gstin,
        consignee_state=po.consignee_state,
        consignee_state_code=po.consignee_state_code,
        other_reference=po.other_reference,
        tax_rate=po.tax_rate,
        cgst_amount=po.cgst_amount,
        sgst_amount=po.sgst_amount,
        igst_amount=po.igst_amount,
        total_qty=po.total_qty,
        subtotal=po.subtotal,
        total_tax=po.total_tax,
        total_amount=po.total_amount,
        notes=po.notes,
        status=po.status,
    )
    db.add(db_po)
    db.flush()

    total_qty = 0.0
    subtotal = 0.0

    for item in po.items:
        prod_name = item.description
        hsn = item.hsn_sac
        uom = item.uom
        rate = item.rate
        tax_rate = item.tax_rate

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

        item_total = round(item.quantity * rate, 2)
        total_qty += item.quantity
        subtotal += item_total

        db_item = PurchaseOrderItem(
            po_id=db_po.id,
            product_id=item.product_id,
            description=prod_name,
            hsn_sac=hsn,
            uom=uom,
            quantity=item.quantity,
            rate=rate,
            tax_rate=tax_rate,
            total_amount=item_total,
        )
        db.add(db_item)

    # Recalculate totals server-side for accuracy
    # Determine CGST/SGST vs IGST based on place of supply (same state = CGST+SGST, else IGST)
    is_same_state = (po.place_of_supply or "").strip().lower() in ("delhi", "new delhi", "07", "")
    tax_pct = po.tax_rate / 100
    tax_amount = round(subtotal * tax_pct, 2)
    cgst = round(tax_amount / 2, 2) if is_same_state else 0.0
    sgst = round(tax_amount / 2, 2) if is_same_state else 0.0
    igst = tax_amount if not is_same_state else 0.0
    grand_total = round(subtotal + tax_amount, 2)

    db_po.total_qty = total_qty
    db_po.subtotal = subtotal
    db_po.cgst_amount = cgst
    db_po.sgst_amount = sgst
    db_po.igst_amount = igst
    db_po.total_tax = tax_amount
    db_po.total_amount = grand_total

    db.commit()
    created = (
        db.query(PurchaseOrder)
        .options(joinedload(PurchaseOrder.items))
        .filter(PurchaseOrder.id == db_po.id)
        .first()
    )
    return created


@router.get("/{po_id}", response_model=POOut)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.items)).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po


@router.put("/{po_id}", response_model=POOut)
def update_purchase_order(po_id: int, update: POUpdate, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    update_data = update.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)

    for key, value in update_data.items():
        if hasattr(po, key):
            setattr(po, key, value)

    if items_data is not None:
        # Clear existing items
        db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po_id).delete()
        total_qty = 0.0
        subtotal = 0.0

        for item in items_data:
            prod_name = item.get("description")
            hsn = item.get("hsn_sac")
            uom = item.get("uom", "Nos")
            rate = item.get("rate", 0.0)
            quantity = item.get("quantity", 1.0)
            tax_rate = item.get("tax_rate", po.tax_rate)
            prod_id = item.get("product_id")

            if prod_id:
                prod = db.query(Product).filter(Product.id == prod_id).first()
                if prod:
                    if not prod_name:
                        prod_name = prod.name
                    if not hsn:
                        hsn = prod.hsn_code or ""
                    if not uom or uom == "Nos":
                        uom = prod.unit or "Nos"
                    if rate == 0:
                        rate = prod.price

            item_total = round(quantity * rate, 2)
            total_qty += quantity
            subtotal += item_total

            db_item = PurchaseOrderItem(
                po_id=po.id,
                product_id=prod_id,
                description=prod_name or "Item",
                hsn_sac=hsn or "",
                uom=uom or "Nos",
                quantity=quantity,
                rate=rate,
                tax_rate=tax_rate,
                total_amount=item_total,
            )
            db.add(db_item)

        is_same_state = (po.place_of_supply or "").strip().lower() in ("delhi", "new delhi", "07", "")
        tax_pct = (po.tax_rate or 18.0) / 100
        tax_amount = round(subtotal * tax_pct, 2)
        cgst = round(tax_amount / 2, 2) if is_same_state else 0.0
        sgst = round(tax_amount / 2, 2) if is_same_state else 0.0
        igst = tax_amount if not is_same_state else 0.0
        grand_total = round(subtotal + tax_amount, 2)

        po.total_qty = total_qty
        po.subtotal = subtotal
        po.cgst_amount = cgst
        po.sgst_amount = sgst
        po.igst_amount = igst
        po.total_tax = tax_amount
        po.total_amount = grand_total

    db.commit()
    return db.query(PurchaseOrder).options(joinedload(PurchaseOrder.items)).filter(PurchaseOrder.id == po.id).first()



@router.delete("/{po_id}")
def delete_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    db.delete(po)
    db.commit()
    return {"detail": "Purchase Order deleted"}


@router.get("/{po_id}/pdf")
def download_po_pdf(po_id: int, db: Session = Depends(get_db)):
    from app.services.po_pdf_service import generate_po_pdf
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    try:
        pdf_bytes = generate_po_pdf(po_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
    filename = f"PO_{po.po_number.replace('/', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
