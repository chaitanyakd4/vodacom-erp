"""
invoice_service.py - GST calc, invoice number gen, amount in words
"""
from datetime import date
from typing import Any, Dict, Iterable
from sqlalchemy.orm import Session

from app.models.invoice import Invoice

COMPANY_STATE = "07"  # Delhi


def calculate_invoice_totals(items_data: Iterable[Dict[str, Any]], customer_state: str | int = "07", discount: float = 0.0) -> Dict[str, Any]:
    """Calculate subtotal, taxes and grand total.

    items_data: iterable of dicts with keys: quantity, unit_price, gst_rate
    Returns a summary dict {subtotal, cgst, sgst, igst, grand_total}
    """
    subtotal = 0.0
    cgst = 0.0
    sgst = 0.0
    igst = 0.0

    is_intrastate = str(customer_state) == COMPANY_STATE

    for item in items_data:
        qty = float(item.get("quantity", 0))
        unit_price = float(item.get("unit_price", 0))
        gst_rate = float(item.get("gst_rate", 0))

        line = qty * unit_price
        subtotal += line
        gst_amount = line * gst_rate / 100.0

        if is_intrastate:
            cgst += gst_amount / 2.0
            sgst += gst_amount / 2.0
        else:
            igst += gst_amount

    subtotal_after_discount = max(0.0, subtotal - float(discount or 0.0))
    grand_total = subtotal_after_discount + cgst + sgst + igst

    return {
        "subtotal": round(subtotal, 2),
        "discount": round(float(discount or 0.0), 2),
        "cgst": round(cgst, 2),
        "sgst": round(sgst, 2),
        "igst": round(igst, 2),
        "grand_total": round(grand_total, 2),
    }


def generate_invoice_number(db: Session) -> str:
    """Generate sequential invoice number for current year."""
    year = date.today().year
    last = (
        db.query(Invoice)
        .filter(Invoice.invoice_number.like(f"VTC-{year}-%"))
        .order_by(Invoice.id.desc())
        .first()
    )

    seq = int(last.invoice_number.split("-")[-1]) + 1 if last and getattr(last, 'invoice_number', None) else 1
    return f"VTC-{year}-{seq:04d}"


def amount_in_words(amount: float) -> str:
    """Convert numeric amount to words (Rupees) using num2words."""
    try:
        amt = float(amount)
    except Exception:
        amt = 0.0
    # import inside function to avoid stub/type issues at top-level
    try:
        from num2words import num2words  # type: ignore[import]
        return f"{num2words(int(round(amt)), lang='en_IN').title()} Rupees Only"
    except Exception:
        return f"{int(round(amt))} Rupees Only"