"""
challan_pdf_service.py
Generates a Delivery Challan PDF that exactly matches the physical
Vodacom delivery challan format shown in the reference image.
Uses ReportLab canvas for pixel-precise layout.
"""
import io
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import simpleSplit
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from app.models.challan import Challan, ChallanItem
from app.models.product import Product

# ── Company constants ────────────────────────────────────────────────────────
COMPANY = {
    "name":       "Vodacom Technologies Pvt. Ltd.",
    "address1":   "205, Sant Nagar, Kailash Colony",
    "address2":   "New Delhi - 110065",
    "gstin":      "07AACCV8995J1ZI",
    "pan":        "AACCV8995J",
    "bank_ac":    "26680200000088",
    "ifsc":       "IOBA0002668",
    "state":      "Delhi",
    "state_code": "07",
}

PAGE_W, PAGE_H = A4   # 595.27 x 841.89 points
MARGIN_L = 12 * mm
MARGIN_R = 12 * mm
MARGIN_T = 10 * mm   # from top
BODY_W   = PAGE_W - MARGIN_L - MARGIN_R


def _fmt(n):
    """Format number with 2 decimals."""
    try:
        return f"{float(n):,.2f}"
    except Exception:
        return "0.00"


def _to_words(amount):
    """Convert amount to words (simple implementation)."""
    try:
        from num2words import num2words
        return num2words(float(amount), lang='en_IN').title() + " Only"
    except Exception:
        return f"{_fmt(amount)}"


def _draw_text(c, x, y, text, font="Helvetica", size=7, color=colors.black, align="left"):
    c.setFont(font, size)
    c.setFillColor(color)
    if align == "right":
        c.drawRightString(x, y, str(text))
    elif align == "center":
        c.drawCentredString(x, y, str(text))
    else:
        c.drawString(x, y, str(text))


def _wrap_text(c, x, y, text, max_width, font="Helvetica", size=7, line_height=9, color=colors.black):
    """Draw wrapped text, returns final y position."""
    c.setFont(font, size)
    c.setFillColor(color)
    lines = simpleSplit(str(text), font, size, max_width)
    for line in lines:
        c.drawString(x, y, line)
        y -= line_height
    return y


def _rect(c, x, y, w, h, stroke=True, fill=False, fill_color=None):
    """Draw rectangle. y is bottom-left in PDF coords."""
    if fill_color:
        c.setFillColor(fill_color)
        c.rect(x, y, w, h, stroke=1 if stroke else 0, fill=1)
        c.setFillColor(colors.black)
    else:
        c.rect(x, y, w, h, stroke=1 if stroke else 0, fill=1 if fill else 0)


def _hline(c, x1, y, x2, thickness=0.5):
    c.setLineWidth(thickness)
    c.line(x1, y, x2, y)


def _vline(c, x, y1, y2, thickness=0.5):
    c.setLineWidth(thickness)
    c.line(x, y1, x, y2)


def generate_challan_pdf(challan_id: int, db) -> bytes:
    challan = db.query(Challan).filter(Challan.id == challan_id).first()
    if not challan:
        raise ValueError("Challan not found")

    items = db.query(ChallanItem).filter(ChallanItem.challan_id == challan_id).all()

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)

    # Current Y position (starts from top, moves down)
    # In ReportLab canvas, (0,0) is bottom-left. We track from top.
    def top(y_from_top):
        return PAGE_H - y_from_top

    y_offset = MARGIN_T  # current distance from top of page

    # ────────────────────────────────────────────────────────────────────────
    # 1. HEADER: Logo left | Company details right
    # ────────────────────────────────────────────────────────────────────────
    header_top = y_offset
    header_h   = 22 * mm

    # ── LOGO IMAGE (left column) ──────────────────────────────────────────────
    logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "vodacom_logo.png")
    logo_img_w = 45 * mm
    logo_img_h = 13.5 * mm  # maintain aspect ratio (359:107 ≈ 3.35:1)
    logo_x = MARGIN_L
    logo_y = top(header_top + header_h / 2 + logo_img_h / 2 - 1 * mm)
    c.drawImage(logo_path, logo_x, logo_y, width=logo_img_w, height=logo_img_h, preserveAspectRatio=True, mask='auto')

    # ── COMPANY DETAILS (right-aligned) ──────────────────────────────────────
    comp_right_edge = MARGIN_L + BODY_W
    cy = top(header_top + 4 * mm)

    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(colors.black)
    c.drawRightString(comp_right_edge, cy, COMPANY["name"])
    cy -= 12

    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#222222"))
    c.drawRightString(comp_right_edge, cy, COMPANY["address1"])
    cy -= 9
    c.drawRightString(comp_right_edge, cy, COMPANY["address2"])
    cy -= 9
    c.drawRightString(comp_right_edge, cy, f"GSTIN : {COMPANY['gstin']}")
    cy -= 9
    c.drawRightString(comp_right_edge, cy, f"PAN : {COMPANY['pan']}")

    y_offset = header_top + header_h

    # Horizontal rule under header
    c.setLineWidth(0.8)
    c.setStrokeColor(colors.black)
    _hline(c, MARGIN_L, top(y_offset), MARGIN_L + BODY_W)
    y_offset += 1 * mm

    # ────────────────────────────────────────────────────────────────────────
    # 2. DOCUMENT TITLE: "Delivery Challan (dc)" & Checkboxes
    # ────────────────────────────────────────────────────────────────────────
    title_h = 12 * mm
    title_y = top(y_offset + title_h)
    
    # border box
    c.setLineWidth(0.5)
    c.rect(MARGIN_L, title_y, BODY_W, title_h, stroke=1, fill=0)
    
    # vertical divider for checkboxes
    chk_box_w = 48 * mm
    chk_box_x = MARGIN_L + BODY_W - chk_box_w
    _vline(c, chk_box_x, title_y, title_y + title_h)
    
    # Document Title (centered in the left area)
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.black)
    c.drawCentredString(MARGIN_L + (BODY_W - chk_box_w) / 2, title_y + 4.5 * mm, "Delivery Challan (dc)")
    
    # Checkboxes inside the right area
    labels = [
        "Original for Recipient",
        "Duplicate for Supplier/ Transporter",
        "Triplicate for Supplier",
    ]
    
    # 3 horizontal segments within the checkbox area
    seg_h = title_h / 3
    for i, label in enumerate(labels):
        by = title_y + title_h - (i + 1) * seg_h
        if i < 2:
            _hline(c, chk_box_x, by, MARGIN_L + BODY_W)
        
        c.setLineWidth(0.5)
        # Checkbox square
        c.rect(chk_box_x + 2 * mm, by + 1.2 * mm, 5, 5, stroke=1, fill=0)
        c.setFont("Helvetica", 6)
        c.drawString(chk_box_x + 4.5 * mm, by + 1.5 * mm, label)

    y_offset += title_h

    # ────────────────────────────────────────────────────────────────────────
    # 3. META ROW: Left (RC/Invoice/Date/State) | Right (Transport/Vehicle/Supply)
    # ────────────────────────────────────────────────────────────────────────
    date_str = challan.date.strftime("%d/%m/%Y") if challan.date else ""
    dos_str  = challan.date_of_supply.strftime("%d/%m/%Y") if challan.date_of_supply else date_str
    inv_no   = challan.invoice_ref or ""
    rc       = "Yes" if challan.reverse_charge else "No"
    trans    = challan.transportation_mode or ""
    vehicle  = challan.vehicle_no or ""
    pos      = challan.place_of_supply or ""

    meta_row_h = 18 * mm
    meta_top   = top(y_offset + meta_row_h)
    half_w     = BODY_W / 2
    meta_left_x  = MARGIN_L
    meta_right_x = MARGIN_L + half_w

    # Box around entire meta row
    c.setLineWidth(0.5)
    c.rect(MARGIN_L, meta_top, BODY_W, meta_row_h, stroke=1, fill=0)
    # Divider between left and right halves
    _vline(c, meta_right_x, meta_top, meta_top + meta_row_h)

    def _kv_line(cx, cy, key, val, key_w=28*mm):
        """Draw a key: value pair. Returns new y."""
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(colors.black)
        c.drawString(cx + 2, cy, key)
        c.setFont("Helvetica", 7)
        c.drawString(cx + key_w, cy, f":  {val}")
        return cy - 9

    # Left column: RC, Invoice, Date, State
    lx = meta_left_x
    ly = meta_top + meta_row_h - 4 * mm - 2
    ly = _kv_line(lx, ly, "Reverse Charge", rc, 28*mm)
    ly = _kv_line(lx, ly, "Invoice No.", inv_no, 28*mm)
    ly = _kv_line(lx, ly, "Date", date_str, 28*mm)
    # State row with State Code
    c.setFont("Helvetica-Bold", 7)
    c.drawString(lx + 2, ly, "State")
    c.setFont("Helvetica", 7)
    c.drawString(lx + 28*mm, ly, f":  {COMPANY['state']}")
    c.setFont("Helvetica-Bold", 7)
    c.drawString(lx + 60*mm, ly, "State Code")
    c.setFont("Helvetica", 7)
    c.drawString(lx + 83*mm, ly, f":  {COMPANY['state_code']}")

    # Right column: Transport, Vehicle, Date of Supply, Place of Supply
    rx = meta_right_x
    ry = meta_top + meta_row_h - 4 * mm - 2
    ry = _kv_line(rx, ry, "Transportation Mode", trans, 35*mm)
    ry = _kv_line(rx, ry, "Vehicle No", vehicle, 35*mm)
    ry = _kv_line(rx, ry, "Date of Supply", dos_str, 35*mm)
    ry = _kv_line(rx, ry, "Place of Supply", pos, 35*mm)

    y_offset += meta_row_h

    # ────────────────────────────────────────────────────────────────────────
    # 4. PARTY SECTION: Receiver (left) | Consignee (right)
    # ────────────────────────────────────────────────────────────────────────
    party_h  = 36 * mm
    party_top = top(y_offset + party_h)
    party_left_x  = MARGIN_L
    party_right_x = MARGIN_L + half_w

    # Outer box
    c.setLineWidth(0.5)
    c.rect(MARGIN_L, party_top, BODY_W, party_h, stroke=1, fill=0)
    # Divider
    _vline(c, party_right_x, party_top, party_top + party_h)

    def _party_block(bx, bw, bh, btop, heading, name, address, gstin, state, state_code, extra_label, extra_val):
        # Heading background
        hdr_h = 5 * mm
        hdr_y = btop + bh - hdr_h
        c.setFillColor(colors.HexColor("#f0f0f0"))
        c.rect(bx, hdr_y, bw, hdr_h, stroke=0, fill=1)
        c.setFillColor(colors.black)
        _hline(c, bx, hdr_y, bx + bw)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawCentredString(bx + bw / 2, hdr_y + 1.5 * mm, heading)

        # Fields
        fy = hdr_y - 3 * mm
        pad = 3

        def _field(label, value, indent=0):
            nonlocal fy
            c.setFont("Helvetica-Bold", 7)
            c.drawString(bx + pad + indent, fy, label)
            c.setFont("Helvetica", 7)
            # Wrap value
            val_x = bx + pad + indent + 22 * mm
            val_w = bw - pad - indent - 22 * mm - 2
            lines = simpleSplit(str(value or ""), "Helvetica", 7, val_w)
            for i, ln in enumerate(lines[:2]):  # max 2 lines
                c.drawString(val_x, fy - (i * 9 if i > 0 else 0), f":  {ln}" if i == 0 else f"   {ln}")
            fy -= 9 * max(1, min(len(lines), 2))

        _field("Name", name)
        _field("Address", (address or "").replace("\n", " "))
        c.setFont("Helvetica", 7)
        # Extra blank line for address overflow area
        fy -= 2
        _field("GSTIN", gstin)
        # State and State Code on same line
        c.setFont("Helvetica-Bold", 7)
        c.drawString(bx + pad, fy, "State")
        c.setFont("Helvetica", 7)
        c.drawString(bx + pad + 22*mm, fy, f":  {state or ''}")
        c.setFont("Helvetica-Bold", 7)
        c.drawString(bx + bw/2, fy, "State Code")
        c.setFont("Helvetica", 7)
        c.drawString(bx + bw/2 + 18*mm, fy, f":  {state_code or ''}")
        fy -= 9
        _field(extra_label, extra_val)

    _party_block(
        party_left_x, half_w, party_h, party_top,
        "Details of Receiver | Billed to :",
        challan.receiver_name,
        challan.receiver_address,
        challan.receiver_gstin,
        challan.receiver_state,
        challan.receiver_state_code,
        "Payment Terms",
        challan.payment_terms or ""
    )
    _party_block(
        party_right_x, half_w, party_h, party_top,
        "Details of Consignee | Shipped to :",
        challan.consignee_name or challan.receiver_name,
        challan.consignee_address or challan.receiver_address,
        challan.consignee_gstin or challan.receiver_gstin,
        challan.consignee_state or challan.receiver_state,
        challan.consignee_state_code or challan.receiver_state_code,
        "Other Reference",
        challan.other_reference or ""
    )

    y_offset += party_h

    # ────────────────────────────────────────────────────────────────────────
    # 5. ITEMS TABLE
    # ────────────────────────────────────────────────────────────────────────
    # Column widths (must sum to BODY_W ~186mm)
    # Sr | Name/Service | HSN SAC | UOM | Qty | Rate | Total
    c_sr   = 9 * mm
    c_name = 73 * mm
    c_hsn  = 20 * mm
    c_uom  = 18 * mm
    c_qty  = 18 * mm
    c_rate = 22 * mm
    c_tot  = BODY_W - c_sr - c_name - c_hsn - c_uom - c_qty - c_rate

    col_xs = [
        MARGIN_L,
        MARGIN_L + c_sr,
        MARGIN_L + c_sr + c_name,
        MARGIN_L + c_sr + c_name + c_hsn,
        MARGIN_L + c_sr + c_name + c_hsn + c_uom,
        MARGIN_L + c_sr + c_name + c_hsn + c_uom + c_qty,
        MARGIN_L + c_sr + c_name + c_hsn + c_uom + c_qty + c_rate,
        MARGIN_L + BODY_W,  # right edge
    ]

    ROW_H = 5 * mm
    HDR_H = 7 * mm
    MIN_ROWS = 10

    # Header row
    hdr_row_y = top(y_offset + HDR_H)
    c.setLineWidth(0.5)
    c.rect(MARGIN_L, hdr_row_y, BODY_W, HDR_H, stroke=1, fill=0)
    c.setFillColor(colors.HexColor("#f5f5f5"))
    c.rect(MARGIN_L, hdr_row_y, BODY_W, HDR_H, stroke=0, fill=1)
    c.setFillColor(colors.black)

    # Draw all column vertical lines
    for cx in col_xs[1:-1]:
        _vline(c, cx, hdr_row_y, hdr_row_y + HDR_H)

    def _th(col_idx, text, multiline=False):
        x = col_xs[col_idx]
        w = col_xs[col_idx + 1] - x
        mid_x = x + w / 2
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(colors.black)
        if multiline:
            parts = text.split("\n")
            top_line_y = hdr_row_y + HDR_H - 3.5 * mm
            c.drawCentredString(mid_x, top_line_y, parts[0])
            if len(parts) > 1:
                c.drawCentredString(mid_x, top_line_y - 8, parts[1])
        else:
            c.drawCentredString(mid_x, hdr_row_y + HDR_H / 2 - 3, text)

    _th(0, "Sr\nNo.", multiline=True)
    _th(1, "Name of Product / Service")
    _th(2, "HSN\nSAC", multiline=True)
    _th(3, "UOM")
    _th(4, "Qty")
    _th(5, "Rate")
    _th(6, "Total")
    y_offset += HDR_H

    # Item rows
    total_qty_sum = 0.0
    total_amt_sum = 0.0

    # Calculate row heights and multiline text for each item
    item_rows_info = []
    for i, item in enumerate(items):
        qty = float(item.quantity or 0)
        rate = float(item.rate or 0)
        amt = float(item.total_amount or qty * rate)
        total_qty_sum += qty
        total_amt_sum += amt

        prod = db.query(Product).filter(Product.id == item.product_id).first() if item.product_id else None
        main_desc = item.description or (prod.name if prod else f"Item {i+1}")
        sub_desc  = prod.description if prod and prod.description else ""

        desc_lines = simpleSplit(main_desc, "Helvetica-Bold", 7, c_name - 4)
        sub_lines = simpleSplit(sub_desc, "Helvetica-Oblique", 6, c_name - 4) if sub_desc else []

        # Dynamic row height based on content
        content_h = (len(desc_lines) * 8.5) + (len(sub_lines) * 7.5) + 4
        row_h = max(ROW_H, content_h)

        item_rows_info.append({
            "item": item,
            "qty": qty,
            "rate": rate,
            "amt": amt,
            "desc_lines": desc_lines,
            "sub_lines": sub_lines,
            "row_h": row_h
        })

    # Add blank filler rows to reach MIN_ROWS if needed
    num_blank = max(0, MIN_ROWS - len(items))
    blank_row_h = ROW_H
    table_body_h = sum(r["row_h"] for r in item_rows_info) + (num_blank * blank_row_h)

    # Draw the outer table box for all body rows
    tbl_body_top = top(y_offset + table_body_h)
    c.setLineWidth(0.5)
    c.rect(MARGIN_L, tbl_body_top, BODY_W, table_body_h, stroke=1, fill=0)

    # Draw vertical lines for all columns
    for cx in col_xs[1:-1]:
        _vline(c, cx, tbl_body_top, tbl_body_top + table_body_h)

    current_top = tbl_body_top + table_body_h
    # Populate item rows
    for i, rinfo in enumerate(item_rows_info):
        row_h = rinfo["row_h"]
        row_top = current_top - row_h
        current_top = row_top

        # Draw horizontal line below each row
        _hline(c, MARGIN_L, row_top, MARGIN_L + BODY_W)

        # Baseline calculation for centered columns
        mid_y = row_top + row_h / 2 - 2.5

        def _td_center(col_idx, text):
            x = col_xs[col_idx]
            w = col_xs[col_idx + 1] - x
            c.setFont("Helvetica", 7)
            c.setFillColor(colors.black)
            c.drawCentredString(x + w / 2, mid_y, str(text))

        def _td_right(col_idx, text):
            x = col_xs[col_idx + 1] - 2
            c.setFont("Helvetica", 7)
            c.setFillColor(colors.black)
            c.drawRightString(x, mid_y, str(text))

        _td_center(0, str(i + 1))

        # Multiline Description cell
        name_x = col_xs[1] + 2
        text_y = row_top + row_h - 7
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(colors.black)
        for ln in rinfo["desc_lines"]:
            c.drawString(name_x, text_y, ln)
            text_y -= 8.5

        if rinfo["sub_lines"]:
            c.setFont("Helvetica-Oblique", 6)
            c.setFillColor(colors.HexColor("#555555"))
            for sln in rinfo["sub_lines"]:
                c.drawString(name_x, text_y, sln)
                text_y -= 7.5
            c.setFillColor(colors.black)

        _td_center(2, rinfo["item"].hsn_sac or "")
        _td_center(3, rinfo["item"].uom or "Nos")
        _td_right(4, _fmt(rinfo["qty"]))
        _td_right(5, _fmt(rinfo["rate"]))
        _td_right(6, _fmt(rinfo["amt"]))

    # Empty rows (padding)
    for i in range(num_blank):
        row_top = current_top - blank_row_h
        current_top = row_top
        if i < num_blank - 1:
            _hline(c, MARGIN_L, row_top, MARGIN_L + BODY_W)

    y_offset += table_body_h

    # Total row
    total_row_h = 6 * mm
    total_row_top = top(y_offset + total_row_h)
    c.setLineWidth(0.5)
    c.rect(MARGIN_L, total_row_top, BODY_W, total_row_h, stroke=1, fill=0)

    for cx in col_xs[1:-1]:
        _vline(c, cx, total_row_top, total_row_top + total_row_h)

    total_text_y = total_row_top + total_row_h / 2 - 3

    # "Total" label (right-aligned up to Qty column)
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(colors.black)
    c.drawRightString(col_xs[4] - 2, total_text_y, "Total")
    # Qty total
    c.drawRightString(col_xs[5] - 2, total_text_y, _fmt(total_qty_sum))
    # Amount total
    c.drawRightString(col_xs[7] - 2, total_text_y, _fmt(total_amt_sum))
    y_offset += total_row_h

    # ────────────────────────────────────────────────────────────────────────
    # 6. FOOTER SECTION
    # ────────────────────────────────────────────────────────────────────────
    # Left footer: Amount in words + Bank Details + E&OE + Receiver sign
    # Right footer: Total Before Tax | Total Amount | Authorised Signatory

    footer_h  = 45 * mm
    footer_top = top(y_offset + footer_h)
    half_fw   = BODY_W * 0.55   # left column ~55% of width
    right_fw  = BODY_W - half_fw

    # Outer box
    c.setLineWidth(0.5)
    c.rect(MARGIN_L, footer_top, BODY_W, footer_h, stroke=1, fill=0)
    # Vertical divider
    div_x = MARGIN_L + half_fw
    _vline(c, div_x, footer_top, footer_top + footer_h)

    # LEFT FOOTER CONTENT
    lf_x = MARGIN_L + 3
    lf_y = footer_top + footer_h - 4 * mm

    c.setFont("Helvetica-Bold", 7)
    c.drawString(lf_x, lf_y, "Total Invoice Amount in Words:")
    lf_y -= 9
    words = _to_words(total_amt_sum)
    c.setFont("Helvetica", 7)
    lines = simpleSplit(f"Rupees :  {words}", "Helvetica", 7, half_fw - 6)
    for ln in lines[:2]:
        c.drawString(lf_x, lf_y, ln)
        lf_y -= 9

    lf_y -= 3
    c.setFont("Helvetica-Bold", 7)
    c.drawString(lf_x, lf_y, "Bank Details :")
    lf_y -= 9
    c.setFont("Helvetica", 7)
    c.drawString(lf_x, lf_y, f"Bank A/c No. : {COMPANY['bank_ac']}")
    lf_y -= 9
    c.drawString(lf_x, lf_y, f"Ifsc Code: {COMPANY['ifsc']}")
    lf_y -= 9
    c.drawString(lf_x, lf_y, "E.& O.e.")

    # Horizontal line before "Receiver" section
    recv_sign_y = footer_top + 10 * mm
    _hline(c, MARGIN_L, recv_sign_y, div_x)
    c.setFont("Helvetica", 7)
    c.drawCentredString(MARGIN_L + half_fw / 2, footer_top + 3 * mm, "(Receivers Name and Sign)")

    # RIGHT FOOTER CONTENT
    rf_x = div_x + 3
    rf_w = right_fw - 6
    rf_y = footer_top + footer_h - 4 * mm

    # "Total Amount Before Tax" row
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(rf_x, rf_y, "Total Amount Before Tax")
    c.drawRightString(div_x + right_fw - 3, rf_y, _fmt(total_amt_sum))
    rf_y -= 10

    # Horizontal separator
    _hline(c, div_x, rf_y + 2, div_x + right_fw)
    rf_y -= 3

    # Authorised signatory text
    c.setFont("Helvetica", 6.5)
    c.setFillColor(colors.HexColor("#444444"))
    c.drawString(rf_x, rf_y, "Certified that the particulars given above")
    rf_y -= 8
    c.drawString(rf_x, rf_y, "are true and correct.")
    rf_y -= 9
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.black)
    c.drawString(rf_x, rf_y, COMPANY["name"])
    rf_y -= 9
    c.setFont("Helvetica", 7)
    c.drawString(rf_x, rf_y, "(Authorised Signatory)")

    # "Total Amount" line (pinned near bottom of right footer)
    total_line_y = footer_top + 8 * mm
    _hline(c, div_x, total_line_y + 6 * mm, div_x + right_fw)
    _hline(c, div_x, total_line_y, div_x + right_fw)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.black)
    c.drawString(div_x + 3, total_line_y + 2, "Total Amount")
    c.drawRightString(div_x + right_fw - 3, total_line_y + 2, f"Rs. {_fmt(total_amt_sum)}")

    y_offset += footer_h

    # ────────────────────────────────────────────────────────────────────────
    # 7. FOOTER NOTE + PAGE NUMBER
    # ────────────────────────────────────────────────────────────────────────
    note_y = top(y_offset + 6 * mm)
    c.setFont("Helvetica-Oblique", 6.5)
    c.setFillColor(colors.HexColor("#666666"))
    c.drawCentredString(PAGE_W / 2, note_y + 2 * mm,
                        "This is a computer generated document and does not require any signature")
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.black)
    c.drawRightString(MARGIN_L + BODY_W, note_y + 2 * mm, "Page 1 of 1")

    c.save()
    return buf.getvalue()
