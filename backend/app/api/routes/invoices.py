from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import datetime

from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceItem
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceOut
from app.core.security import get_current_user
from app.services.invoice_service import generate_invoice_number

router = APIRouter(dependencies=[Depends(get_current_user)])

@router.get("/", response_model=List[InvoiceOut])
def list_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Invoice).offset(skip).limit(limit).all()

@router.post("/", response_model=InvoiceOut)
def create_invoice(invoice: InvoiceCreate, db: Session = Depends(get_db)):
    try:
        invoice_number = generate_invoice_number(db)
        db_invoice = Invoice(
            customer_id=invoice.customer_id,
            invoice_number=invoice_number,
            date=datetime.datetime.utcnow(),
            status=invoice.status,
            notes=invoice.notes,
            subtotal=invoice.subtotal,
            tax_total=invoice.tax_total,
            grand_total=invoice.grand_total
        )
        db.add(db_invoice)
        db.commit()
        db.refresh(db_invoice)
        
        for item in invoice.items:
            item_dict = item.model_dump()
            db_item = InvoiceItem(
                invoice_id=db_invoice.id,
                product_id=item_dict.get("product_id"),
                quantity=item_dict.get("quantity", 1),
                unit_price=item_dict.get("unit_price", 0.0),
                cost_price=item_dict.get("cost_price", 0.0),
                profit_margin=item_dict.get("profit_margin", 0.0),
                tax_rate=item_dict.get("tax_rate", 0.0),
                total_amount=item_dict.get("total_amount", 0.0)
            )
            db.add(db_item)
        db.commit()
        db.refresh(db_invoice)
        return db_invoice
    except Exception as e:
        db.rollback()
        import logging
        logging.error(f"[INVOICE_CREATE_ERROR] Failed to create invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Invoice generation failed: {str(e)}")


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import Response
    from app.services.pdf_service import generate_invoice_pdf
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    try:
        pdf_bytes = generate_invoice_pdf(invoice_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
    filename = f"Invoice_{invoice.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.post("/{invoice_id}/pay", response_model=InvoiceOut)
def mark_invoice_as_paid(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = "paid"
    db.commit()
    db.refresh(invoice)
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(invoice_id: int, update: InvoiceUpdate, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_dict = update.model_dump(exclude_unset=True)
    items_data = update_dict.pop("items", None)

    for key, value in update_dict.items():
        if hasattr(invoice, key):
            setattr(invoice, key, value)

    if items_data is not None:
        # Clear existing items
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
        subtotal = 0.0
        tax_total = 0.0
        for item in items_data:
            qty = item.get("quantity", 1)
            unit_price = item.get("unit_price", 0.0)
            cost_price = item.get("cost_price", 0.0)
            profit_margin = item.get("profit_margin", 0.0)
            tax_rate = item.get("tax_rate", 0.0)
            item_total = item.get("total_amount", round(qty * unit_price * (1 + tax_rate / 100), 2))
            
            subtotal += qty * unit_price
            tax_total += (qty * unit_price) * (tax_rate / 100)

            db_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=item.get("product_id"),
                quantity=qty,
                unit_price=unit_price,
                cost_price=cost_price,
                profit_margin=profit_margin,
                tax_rate=tax_rate,
                total_amount=item_total
            )
            db.add(db_item)

        # Update totals if not explicitly provided in update_dict
        if "subtotal" not in update_dict:
            invoice.subtotal = round(subtotal, 2)
            invoice.tax_total = round(tax_total, 2)
            invoice.grand_total = round(subtotal + tax_total, 2)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
    db.delete(invoice)
    db.commit()
    return {"detail": "Invoice deleted"}

