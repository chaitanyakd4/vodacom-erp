from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import datetime

from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceItem
from app.schemas.invoice import InvoiceCreate, InvoiceOut
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
