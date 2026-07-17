import io
from typing import List, Optional

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet
from fastapi import APIRouter, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from app.core.security import get_current_user

router = APIRouter(prefix="/products", tags=["products"], dependencies=[Depends(get_current_user)])

@router.get("/", response_model=List[ProductOut])
def list_products(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    return db.query(Product).offset(skip).limit(limit).all()

def auto_categorize(name: str, description: Optional[str] = None) -> str:
    name_lower = name.lower()
    desc_lower = description.lower() if description else ""
    combined = f"{name_lower} {desc_lower}"
    
    if any(k in combined for k in ['camera', 'cctv', 'nvr', 'dvr', 'xvr', 'dome', 'bullet', 'video recorder', 'hard disc', 'seagate', 'skyhawk', 'wd hard']):
        return 'CCTV & Recording'
    elif any(k in combined for k in ['switch', 'router', 'patch pannel', 'access point', 'ap-', 'ap ', '-ap', 'wifi', 'networking', 'print server', 'krone', 'media connector', 'fiber patch cord']):
        return 'Networking Equipment'
    elif any(k in combined for k in ['cable', 'cord', 'connector', 'wire', 'hdmi', 'vga', 'rj45', 'face plate', 'gane box', 'gang box', 'pchi cord', 'booster cable', 'cat 6']):
        return 'Cables & Connectors'
    elif any(k in combined for k in ['power supply', 'adaptor', 'adapter', 'ups', ' dc', 'mcb', 'power mex', 'component adaptor']):
        return 'Power Supplies, Adapters & UPS'
    elif any(k in combined for k in ['hooter', 'fire alarm', 'smoke detector', 'door', 'attendance', 'biomatric', 'biometric', 'headphone', 'speaker', 'mic', 'microphone', 'em lock', 'push button', 'essl']):
        return 'Building Systems'
    elif any(k in combined for k in ['phone', 'handset', 'dect', 'ale', 'beetel', 'panasonic', 'alcatel', 'analog', 'binatone', 'lexstar', 'procel', 'gt210', '4008', '4018', '4019', '4028', '4029', '4039', '4068', '8001', '8008', '8012', '8018', '8029', '8039', '8068', '8088']):
        return 'Telephone Handsets'
    elif any(k in combined for k in ['card', 'module', 'sli', 'uai', 'amix', 'apa', 'daughter board', 'pra', 'blank slots']):
        return 'EPABX Cards & Modules'
    elif any(k in combined for k in ['cabinet', 'base station', 'mounting kit', 'rack mount', 'rack mounting', 'indoor bases', 'oxo connect', 'suite evolution']):
        return 'EPABX Cabinets & Switches'
    elif any(k in combined for k in ['gateway', 'fct', 'repeater', 'sip', 'voip', 'cellular terminal', 'phone recording']):
        return 'VoIP / SIP & Gateway Equipment'
    else:
        return 'CCTV & Recording'

@router.post("/", response_model=ProductOut)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    if product.category == "Uncategorized" or not product.category:
        product.category = auto_categorize(product.name, product.description)
        
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, product_update: ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in product_update.model_dump(exclude_unset=True).items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(db_product)
    db.commit()
    return {"detail": "Product deleted successfully"}

@router.post("/import/excel")
@router.post("/import/excel/")
async def import_from_excel(file: UploadFile, db: Session = Depends(get_db)):
    wb = openpyxl.load_workbook(io.BytesIO(await file.read()))
    ws: Optional[Worksheet] = wb.active

    if not ws:
        return {"message": "Empty workbook", "count": 0}

    header_rows = list(ws.iter_rows(min_row=1, max_row=1))
    if not header_rows:
        return {"message": "Empty workbook", "count": 0}

    header_row = header_rows[0]
    # Normalize headers: lowercase, strip whitespace, replace spaces with underscores
    headers = [str(cell.value).strip().lower().replace(" ", "_") if cell.value is not None else "" for cell in header_row]
    col_map = {name: idx for idx, name in enumerate(headers) if name}

    # Build flexible aliases so users can use different column names
    def get_cell(row, *possible_names):
        for pname in possible_names:
            if pname in col_map:
                val = row[col_map[pname]].value
                if val is not None:
                    return val
        return None

    imported = 0
    for row in ws.iter_rows(min_row=2):
        name = get_cell(row, "name", "product_name", "item_name", "product", "item", "service")
        if name is None:
            continue

        description = get_cell(row, "description", "desc", "details")
        hsn_code = get_cell(row, "hsn_code", "hsn", "hsn_sac", "sac_code")
        unit = get_cell(row, "unit", "uom", "unit_of_measure")

        # Parse numeric values safely
        raw_price = get_cell(row, "price", "unit_price", "rate", "mrp", "cost")
        raw_tax = get_cell(row, "tax_rate", "gst", "gst_rate", "tax", "tax_%", "gst_%")
        raw_stock = get_cell(row, "stock_quantity", "stock", "qty", "quantity", "opening_stock")
        category = get_cell(row, "category", "type", "group")

        try:
            price = float(raw_price) if raw_price is not None else 0.0
        except (ValueError, TypeError):
            price = 0.0

        try:
            tax_rate = float(raw_tax) if raw_tax is not None else 18.0
        except (ValueError, TypeError):
            tax_rate = 18.0

        try:
            stock_quantity = int(float(raw_stock)) if raw_stock is not None else 0
        except (ValueError, TypeError):
            stock_quantity = 0

        final_category = str(category).strip() if category else auto_categorize(str(name).strip(), str(description).strip() if description else None)

        product = Product(
            name=str(name).strip(),
            description=str(description).strip() if description else None,
            category=final_category,
            hsn_code=str(hsn_code).strip() if hsn_code else None,
            price=price,
            tax_rate=tax_rate,
            stock_quantity=stock_quantity,
            unit=str(unit).strip() if unit else "pcs",
        )
        db.add(product)
        imported += 1

    db.commit()
    return {"message": f"Successfully imported {imported} product(s) into inventory.", "count": imported}