from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.session import get_db
from datetime import datetime
from app.models.sales import SalesEnquiry, Quotation, QuotationItem
from app.schemas.sales import SalesEnquiryCreate, SalesEnquiryUpdate, SalesEnquiryOut, QuotationCreate, QuotationOut
from app.models.invoice import Invoice, InvoiceItem
from app.schemas.invoice import InvoiceOut
from app.models.customer import Customer
from app.core.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])

# --- Enquiries ---
@router.get("/enquiries", response_model=List[SalesEnquiryOut])
def list_enquiries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(SalesEnquiry).offset(skip).limit(limit).all()

@router.post("/enquiries", response_model=SalesEnquiryOut)
def create_enquiry(enquiry: SalesEnquiryCreate, db: Session = Depends(get_db)):
    db_enquiry = SalesEnquiry(**enquiry.model_dump())
    db.add(db_enquiry)
    db.commit()
    db.refresh(db_enquiry)
    return db_enquiry

@router.get("/enquiries/{enquiry_id}", response_model=SalesEnquiryOut)
def get_enquiry(enquiry_id: int, db: Session = Depends(get_db)):
    enquiry = db.query(SalesEnquiry).filter(SalesEnquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return enquiry

@router.put("/enquiries/{enquiry_id}", response_model=SalesEnquiryOut)
def update_enquiry(enquiry_id: int, enquiry_update: SalesEnquiryUpdate, db: Session = Depends(get_db)):
    db_enquiry = db.query(SalesEnquiry).filter(SalesEnquiry.id == enquiry_id).first()
    if not db_enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    
    update_data = enquiry_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_enquiry, key, value)
        
    db.commit()
    db.refresh(db_enquiry)
    return db_enquiry

@router.delete("/enquiries/{enquiry_id}")
def delete_enquiry(enquiry_id: int, db: Session = Depends(get_db)):
    db_enquiry = db.query(SalesEnquiry).filter(SalesEnquiry.id == enquiry_id).first()
    if not db_enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    db.delete(db_enquiry)
    db.commit()
    return {"detail": "Enquiry deleted"}

@router.post("/enquiries/{enquiry_id}/convert")
def convert_enquiry(enquiry_id: int, db: Session = Depends(get_db)):
    from app.services.invoice_service import generate_invoice_number
    
    db_enquiry = db.query(SalesEnquiry).filter(SalesEnquiry.id == enquiry_id).first()
    if not db_enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
        
    if db_enquiry.status == "converted":
        raise HTTPException(status_code=400, detail="Enquiry is already converted")

    # Create Customer from Enquiry
    new_customer = Customer(
        company_name=db_enquiry.company_name,
        contact_person=db_enquiry.contact_person,
        email=db_enquiry.email,
        phone=db_enquiry.phone,
        address=db_enquiry.address,
        shipping_address=db_enquiry.shipping_address,
        state_name=db_enquiry.state_name,
        state_code=db_enquiry.state_code,
        gstin=""  # Will be added later if needed
    )
    db.add(new_customer)
    db.flush()  # Get customer ID before creating invoices
    
    # Auto-create real invoices from approved quotations
    created_invoices = []
    approved_quotations = (
        db.query(Quotation)
        .filter(Quotation.enquiry_id == enquiry_id, Quotation.status == "approved")
        .all()
    )
    
    for qt in approved_quotations:
        invoice_number = generate_invoice_number(db)
        invoice = Invoice(
            invoice_number=invoice_number,
            customer_id=new_customer.id,
            quotation_id=qt.id,
            is_dummy=False,
            date=datetime.utcnow(),
            status="pending",
            notes=f"Auto-generated from quotation {qt.quotation_number}",
            subtotal=qt.subtotal,
            tax_total=qt.tax_total,
            grand_total=qt.grand_total,
        )
        db.add(invoice)
        db.flush()  # Get invoice ID for items
        
        # Copy all line items from quotation to invoice
        for item in qt.items:
            inv_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_rate=item.tax_rate,
                total_amount=item.total_amount,
            )
            db.add(inv_item)
        
        created_invoices.append({
            "invoice_id": invoice.id,
            "invoice_number": invoice_number,
            "grand_total": qt.grand_total,
        })
    
    # Update enquiry status
    db_enquiry.status = "converted"
    db.commit()
    db.refresh(new_customer)
    
    return {
        "detail": "Successfully converted to customer",
        "customer_id": new_customer.id,
        "invoices_created": created_invoices,
    }


# --- Quotations ---
@router.get("/enquiries/{enquiry_id}/quotations", response_model=List[QuotationOut])
def list_quotations_for_enquiry(enquiry_id: int, db: Session = Depends(get_db)):
    enquiry = db.query(SalesEnquiry).filter(SalesEnquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return db.query(Quotation).filter(Quotation.enquiry_id == enquiry_id).all()

@router.get("/quotations/{quotation_id}", response_model=QuotationOut)
def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation

@router.put("/quotations/{quotation_id}", response_model=QuotationOut)
def update_quotation(quotation_id: int, update_data: dict, db: Session = Depends(get_db)):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    for key, value in update_data.items():
        if hasattr(quotation, key):
            setattr(quotation, key, value)
    db.commit()
    db.refresh(quotation)
    return quotation

@router.post("/quotations", response_model=QuotationOut)
def create_quotation(quotation: QuotationCreate, db: Session = Depends(get_db)):
    import uuid
    # Generate simple unique string for Quotation
    quotation_num = f"QT-{uuid.uuid4().hex[:6].upper()}"
    
    db_quotation = Quotation(
        quotation_number=quotation_num,
        enquiry_id=quotation.enquiry_id,
        date=quotation.date,
        valid_until=quotation.valid_until,
        status=quotation.status,
        notes=quotation.notes,
        subtotal=quotation.subtotal,
        tax_total=quotation.tax_total,
        grand_total=quotation.grand_total,
        total_cost=quotation.total_cost,
        total_profit=quotation.total_profit,
        overall_margin_percent=quotation.overall_margin_percent
    )
    db.add(db_quotation)
    db.flush() # flush to get the id
    
    for item in quotation.items:
        db_item = QuotationItem(
            quotation_id=db_quotation.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            total_amount=item.total_amount,
            unit_cost=item.unit_cost,
            margin_percent=item.margin_percent
        )
        db.add(db_item)
        
    db.commit()
    db.refresh(db_quotation)
    return db_quotation

@router.delete("/quotations/{quotation_id}")
def delete_quotation(quotation_id: int, db: Session = Depends(get_db)):
    db_quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not db_quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    db.delete(db_quotation)
    db.commit()
    return {"detail": "Quotation deleted"}

@router.post("/quotations/{quotation_id}/dummy-invoice", response_model=InvoiceOut)
def create_dummy_invoice(quotation_id: int, db: Session = Depends(get_db)):
    # Retrieve quotation
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if quotation.status != "approved":
        raise HTTPException(status_code=400, detail="Quotation must be approved to generate dummy invoice")
    # Generate invoice number
    import uuid
    inv_number = f"INV-DUMMY-{uuid.uuid4().hex[:6].upper()}"
    # Create dummy invoice
    dummy_invoice = Invoice(
        invoice_number=inv_number,
        customer_id=None,  # No real customer, dummy
        quotation_id=quotation.id,
        is_dummy=True,
        date=datetime.utcnow(),
        status="draft",
        notes="Dummy invoice generated from quotation",
        subtotal=quotation.subtotal,
        tax_total=quotation.tax_total,
        grand_total=quotation.grand_total,
    )
    db.add(dummy_invoice)
    db.flush()  # to get id
    # Copy items
    for item in quotation.items:
        inv_item = InvoiceItem(
            invoice_id=dummy_invoice.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            total_amount=item.total_amount,
        )
        db.add(inv_item)
    db.commit()
    db.refresh(dummy_invoice)
    return dummy_invoice


# --- PDF Downloads ---
@router.get("/quotations/{quotation_id}/pdf")
def download_quotation_pdf(quotation_id: int, db: Session = Depends(get_db)):
    from app.services.pdf_service import generate_quotation_pdf
    try:
        pdf_bytes = generate_quotation_pdf(quotation_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    filename = f"Quotation_{quotation.quotation_number}.pdf" if quotation else "Quotation.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    from app.services.pdf_service import generate_invoice_pdf
    try:
        pdf_bytes = generate_invoice_pdf(invoice_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    filename = f"Invoice_{invoice.invoice_number}.pdf" if invoice else "Invoice.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
