import io
import os
import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
try:
    from num2words import num2words
except ImportError:
    num2words = None

from app.models.sales import Quotation, QuotationItem
from app.models.invoice import Invoice, InvoiceItem
from app.models.product import Product

# Path to the Vodacom logo image (stored in app/)
_LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "vodacom_logo.png")

def _get_tally_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='TallyNormal', fontName='Helvetica', fontSize=7.5, leading=9))
    styles.add(ParagraphStyle(name='TallyBold', fontName='Helvetica-Bold', fontSize=7.5, leading=9))
    styles.add(ParagraphStyle(name='TallyTitle', fontName='Helvetica-Bold', fontSize=10, leading=12, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name='TallyRight', fontName='Helvetica', fontSize=7.5, leading=9, alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='TallyCenter', fontName='Helvetica', fontSize=7.5, leading=9, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name='TallySmall', fontName='Helvetica', fontSize=6.5, leading=8))
    styles.add(ParagraphStyle(name='TallySmallItalic', fontName='Helvetica-Oblique', fontSize=7.5, leading=9, alignment=TA_RIGHT))
    return styles

def get_indian_number_format(number):
    try:
        s, *d = str(round(float(number), 2)).split(".")
        r = ",".join([s[x-2:x] for x in range(-3, -len(s), -2)][::-1] + [s[-3:]]) if len(s) > 3 else s
        return f"{r}.{d[0].ljust(2, '0') if d else '00'}"
    except:
        return str(number)

def convert_amount_to_words(amount):
    if num2words:
        words = num2words(amount, lang='en_IN').title()
        return f"INR {words} Only"
    return f"INR {amount}"

def _build_tally_pdf(doc_title, doc_number, doc_date, company_details, bill_to, ship_to, items, subtotal, tax_total, grand_total, is_quotation=False, extra_notes=""):
    styles = _get_tally_styles()
    buffer = io.BytesIO()
    
    story = []

    # ── LOGO HEADER ROW ─────────────────────────────────────────────────────
    # Logo on left (45mm wide), doc title centred, blank on right
    logo_img = Image(_LOGO_PATH, width=45*mm, height=13.5*mm)
    logo_header = Table(
        [[logo_img, Paragraph(doc_title, styles['TallyTitle']), '']],
        colWidths=[50*mm, 90*mm, 50*mm]
    )
    logo_header.setStyle(TableStyle([
        ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',        (1, 0), (1,  0),  'CENTER'),
        ('LEFTPADDING',  (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING',   (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 4),
        ('LINEBELOW',    (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    story.append(logo_header)
    story.append(Spacer(1, 2*mm))


    # ---------------- Top Section ----------------
    comp_p = [
        Paragraph(f"<b>{company_details.get('name', '')}</b>", styles['TallyBold']),
        Paragraph(company_details.get("address", "").replace('\n', '<br/>'), styles['TallyNormal']),
        Paragraph(f"GSTIN/UIN: <b>{company_details.get('gstin', '')}</b>", styles['TallyNormal']),
        Paragraph(f"State Name : {company_details.get('state', '')}, Code : {company_details.get('state_code', '')}", styles['TallyNormal']),
        Paragraph(f"E-Mail : {company_details.get('email', '')}", styles['TallyNormal']),
    ]
    
    consignee_p = [
        Paragraph("Consignee (Ship to)", styles['TallySmall']),
        Paragraph(f"<b>{ship_to.get('name', '')}</b>", styles['TallyBold']),
        Paragraph(ship_to.get("address", "").replace('\n', '<br/>'), styles['TallyNormal']),
        Paragraph(f"GSTIN/UIN  : <b>{ship_to.get('gstin', '')}</b>", styles['TallyNormal']),
        Paragraph(f"State Name : {ship_to.get('state_name', '')}, Code : {ship_to.get('state_code', '')}", styles['TallyNormal'])
    ]
    
    buyer_p = [
        Paragraph("Buyer (Bill to)", styles['TallySmall']),
        Paragraph(f"<b>{bill_to.get('name', '')}</b>", styles['TallyBold']),
        Paragraph(bill_to.get("address", "").replace('\n', '<br/>'), styles['TallyNormal']),
        Paragraph(f"GSTIN/UIN  : <b>{bill_to.get('gstin', '')}</b>", styles['TallyNormal']),
        Paragraph(f"State Name : {bill_to.get('state_name', '')}, Code : {bill_to.get('state_code', '')}", styles['TallyNormal'])
    ]
    
    left_side = Table([
        [comp_p],
        [consignee_p],
        [buyer_p]
    ], colWidths=[95*mm])
    left_side.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    
    date_str = doc_date.strftime('%d-%b-%y') if doc_date else ''
    right_side = Table([
        [Paragraph(f"{'Quotation' if is_quotation else 'Invoice'} No.<br/><b>{doc_number}</b>", styles['TallyNormal']), Paragraph(f"Dated<br/><b>{date_str}</b>", styles['TallyNormal'])],
        [Paragraph("Delivery Note", styles['TallyNormal']), Paragraph("Mode/Terms of Payment", styles['TallyNormal'])],
        [Paragraph("Reference No. & Date.", styles['TallyNormal']), Paragraph("Other References", styles['TallyNormal'])],
        [Paragraph("Buyer's Order No.", styles['TallyNormal']), Paragraph("Dated", styles['TallyNormal'])],
        [Paragraph("Dispatch Doc No.", styles['TallyNormal']), Paragraph("Delivery Note Date", styles['TallyNormal'])],
        [Paragraph("Dispatched through", styles['TallyNormal']), Paragraph("Destination", styles['TallyNormal'])],
        [Paragraph("Terms of Delivery", styles['TallyNormal']), '']
    ], colWidths=[47.5*mm, 47.5*mm])
    right_side.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
        ('SPAN', (0,6), (-1,6)),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    
    header_table = Table([[left_side, right_side]], colWidths=[95*mm, 95*mm])
    header_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    
    # ---------------- Items Table ----------------
    item_header = [
        Paragraph("Sl<br/>No.", styles['TallyCenter']),
        Paragraph("Description of Goods", styles['TallyCenter']),
        Paragraph("HSN/SAC", styles['TallyCenter']),
        Paragraph("Quantity", styles['TallyCenter']),
        Paragraph("Rate", styles['TallyCenter']),
        Paragraph("per", styles['TallyCenter']),
        Paragraph("Amount", styles['TallyCenter']),
    ]
    item_data = [item_header]
    
    cgst_total = 0
    sgst_total = 0
    
    for idx, item in enumerate(items, 1):
        item_data.append([
            Paragraph(str(idx), styles['TallyCenter']), 
            Paragraph(f"<b>{item.get('name', '')}</b>", styles['TallyNormal']), 
            Paragraph(item.get("hsn", ""), styles['TallyCenter']), 
            Paragraph(f"<b>{item.get('qty', 0)}</b> Nos", styles['TallyRight']), 
            Paragraph(f"<b>{get_indian_number_format(item.get('rate', 0))}</b>", styles['TallyRight']), 
            Paragraph("Nos", styles['TallyCenter']), 
            Paragraph(f"<b>{get_indian_number_format(item.get('amount', 0))}</b>", styles['TallyRight'])
        ])
        
        tax_rate = item.get('tax_rate', 0)
        tax_amount = item.get('amount', 0) * tax_rate / 100
        cgst_total += tax_amount / 2
        sgst_total += tax_amount / 2
        
    for _ in range(max(0, 5 - len(items))):
        item_data.append(["", "", "", "", "", "", ""])
        
    item_data.append(["", Paragraph("<b>CGST OUTPUT</b>", styles['TallyNormal']), "", "", "", "", Paragraph(f"<b>{get_indian_number_format(cgst_total)}</b>", styles['TallyRight'])])
    item_data.append(["", Paragraph("<b>SGST OUTPUT</b>", styles['TallyNormal']), "", "", "", "", Paragraph(f"<b>{get_indian_number_format(sgst_total)}</b>", styles['TallyRight'])])
    
    # Padding rows for the layout to look taller like Tally
    for _ in range(5):
        item_data.append(["", "", "", "", "", "", ""])

    # Bottom total row for the items table
    item_data.append([
        Paragraph("Total", styles['TallyRight']), 
        "", 
        "", 
        "", 
        Paragraph(f"<b>{get_indian_number_format(subtotal)}</b>", styles['TallyRight']), 
        "", 
        Paragraph(f"<b>{get_indian_number_format(grand_total)}</b>", styles['TallyRight'])
    ])
    
    # Amount chargeable in words
    item_data.append([Paragraph(f"Amount Chargeable (in words)<br/><b>{convert_amount_to_words(grand_total)}</b>", styles['TallyNormal']), "", "", "", "", "", ""])

    item_widths = [10*mm, 80*mm, 18*mm, 22*mm, 20*mm, 10*mm, 30*mm]
    item_table = Table(item_data, colWidths=item_widths)
    
    ts_no_horiz = [
        ('BOX', (0,0), (-1,-1), 0.5, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.black),
    ]
    # Vertical lines for items rows
    for col in range(1, 7):
        ts_no_horiz.append(('LINEBEFORE', (col,0), (col,-3), 0.5, colors.black))
        
    ts_no_horiz.extend([
        # The Total row
        ('SPAN', (0,-2), (3,-2)), # span 'Total' over sl, desc, hsn, qty
        ('LINEABOVE', (0,-2), (-1,-2), 0.5, colors.black),
        ('LINEBELOW', (0,-2), (-1,-2), 0.5, colors.black),
        ('LINEBEFORE', (4,-2), (4,-2), 0.5, colors.black), # line before Rate (where subtotal is shown)
        ('LINEBEFORE', (6,-2), (6,-2), 0.5, colors.black), # line before grand_total
        
        # The Amount in words row
        ('SPAN', (0,-1), (-1,-1)),
    ])
    item_table.setStyle(TableStyle(ts_no_horiz))
    story.append(item_table)
    
    # ---------------- Tax Details Table ----------------
    tax_header1 = [
        Paragraph("HSN/SAC", styles['TallyCenter']),
        Paragraph("Taxable<br/>Value", styles['TallyCenter']),
        Paragraph("CGST", styles['TallyCenter']),
        "",
        Paragraph("SGST/UTGST", styles['TallyCenter']),
        "",
        Paragraph("Total<br/>Tax Amount", styles['TallyCenter']),
    ]
    tax_header2 = [
        "",
        "",
        Paragraph("Rate", styles['TallyCenter']),
        Paragraph("Amount", styles['TallyCenter']),
        Paragraph("Rate", styles['TallyCenter']),
        Paragraph("Amount", styles['TallyCenter']),
        ""
    ]
    tax_data = [tax_header1, tax_header2]
    
    tax_groups = {}
    for item in items:
        key = (item.get("hsn", ""), item.get("tax_rate", 0))
        if key not in tax_groups:
            tax_groups[key] = {"taxable": 0, "tax_amt": 0}
        tax_groups[key]["taxable"] += item.get("amount", 0)
        tax_groups[key]["tax_amt"] += item.get("amount", 0) * item.get("tax_rate", 0) / 100
        
    for (hsn, rate), totals in tax_groups.items():
        half_rate = rate / 2
        half_tax = totals["tax_amt"] / 2
        tax_data.append([
            Paragraph(hsn, styles['TallyNormal']),
            Paragraph(get_indian_number_format(totals["taxable"]), styles['TallyRight']),
            Paragraph(f"{half_rate}%", styles['TallyRight']),
            Paragraph(get_indian_number_format(half_tax), styles['TallyRight']),
            Paragraph(f"{half_rate}%", styles['TallyRight']),
            Paragraph(get_indian_number_format(half_tax), styles['TallyRight']),
            Paragraph(get_indian_number_format(totals["tax_amt"]), styles['TallyRight'])
        ])
    
    tax_data.append([
        Paragraph("Total", styles['TallyRight']),
        Paragraph(f"<b>{get_indian_number_format(subtotal)}</b>", styles['TallyRight']),
        "",
        Paragraph(f"<b>{get_indian_number_format(cgst_total)}</b>", styles['TallyRight']),
        "",
        Paragraph(f"<b>{get_indian_number_format(sgst_total)}</b>", styles['TallyRight']),
        Paragraph(f"<b>{get_indian_number_format(cgst_total + sgst_total)}</b>", styles['TallyRight'])
    ])
    
    tax_data.append([Paragraph(f"Tax Amount (in words) : <b>{convert_amount_to_words(cgst_total + sgst_total)}</b>", styles['TallyNormal']), "", "", "", "", "", ""])
    
    tax_table = Table(tax_data, colWidths=[25*mm, 35*mm, 15*mm, 25*mm, 15*mm, 25*mm, 50*mm])
    tax_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-2), 0.5, colors.black),
        ('BOX', (0,0), (-1,-1), 0.5, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('SPAN', (0,0), (0,1)),
        ('SPAN', (1,0), (1,1)),
        ('SPAN', (2,0), (3,0)),
        ('SPAN', (4,0), (5,0)),
        ('SPAN', (6,0), (6,1)),
        ('SPAN', (0,-1), (-1,-1)),
        ('GRID', (0,-1), (-1,-1), 0.5, colors.black),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(tax_table)
    
    # ---------------- Bank & Footer ----------------
    bank_details = [
        Paragraph("Company's Bank Details", styles['TallySmall']),
        Paragraph(f"A/c Holder's Name: <b>{company_details.get('name', '')}</b>", styles['TallyNormal']),
        Paragraph("Bank Name      : <b>Indian Overseas Bank (East Of Kailash)</b>", styles['TallyNormal']),
        Paragraph("A/c No.        : <b>266802000000088</b>", styles['TallyNormal']),
        Paragraph("Branch & IFS Code: <b>Eok & IOBA0002668</b>", styles['TallyNormal']),
        Paragraph("SWIFT Code     :", styles['TallyNormal']),
    ]
    if extra_notes:
        bank_details.append(Paragraph("Notes: " + extra_notes, styles['TallyNormal']))
        
    decl_details = [
        Paragraph("<u>Declaration</u>", styles['TallyNormal']),
        Paragraph("We declare that this invoice shows the actual price of the<br/>goods described and that all particulars are true and correct.", styles['TallyNormal']),
        Spacer(1, 15*mm),
        Paragraph("<b>This is a Computer Generated Invoice</b>", styles['TallyNormal'])
    ]
    
    sign_details = [
        Paragraph(f"for <b>{company_details.get('name', '')}</b>", styles['TallyBold']),
        Spacer(1, 15*mm),
        Paragraph("Authorised Signatory", styles['TallyRight'])
    ]
    
    right_footer = Table([
        [bank_details],
        [sign_details]
    ], colWidths=[95*mm])
    right_footer.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (0,0), 0.5, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (0,1), (0,1), 'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    
    footer_table = Table([
        [decl_details, right_footer]
    ], colWidths=[95*mm, 95*mm])
    
    footer_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.black),
        ('LINEBEFORE', (1,0), (1,0), 0.5, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(footer_table)
    
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=10*mm, bottomMargin=10*mm, leftMargin=10*mm, rightMargin=10*mm)
    doc.build(story)
    
    return buffer.getvalue()

def generate_quotation_pdf(quotation_id: int, db) -> bytes:
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise ValueError("Quotation not found")

    items = db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).all()
    enquiry = quotation.enquiry
    
    company_details = {
        "name": "Vodacom Technologies Pvt Ltd- (from 1-Apr-25)",
        "address": "205, Basement, Sant Nagar\nEast of Kailash, Near Sanatan Mandir\nNew Delhi-110065",
        "gstin": "07AACC...",
        "state": "Delhi",
        "state_code": "07",
        "email": "rajeev@vodacom.in"
    }
    
    bill_to = {}
    ship_to = {}
    if enquiry:
        bill_to = {
            "name": enquiry.company_name,
            "address": enquiry.address,
            "gstin": "N/A",  # Not strictly in enquiry right now
            "state_name": enquiry.state_name or "",
            "state_code": enquiry.state_code or ""
        }
        ship_to = {
            "name": enquiry.company_name,
            "address": enquiry.shipping_address or enquiry.address,
            "gstin": "N/A",
            "state_name": enquiry.state_name or "",
            "state_code": enquiry.state_code or ""
        }
        
    doc_items = []
    for item in items:
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        prod_name = prod.name if prod else f"Product #{item.product_id}"
        doc_items.append({
            "name": prod_name,
            "hsn": "8517", # Dummy HSN
            "qty": item.quantity,
            "rate": item.unit_price,
            "amount": item.total_amount,
            "tax_rate": item.tax_rate
        })
        
    return _build_tally_pdf(
        doc_title="QUOTATION",
        doc_number=quotation.quotation_number,
        doc_date=quotation.date,
        company_details=company_details,
        bill_to=bill_to,
        ship_to=ship_to,
        items=doc_items,
        subtotal=quotation.subtotal,
        tax_total=quotation.tax_total,
        grand_total=quotation.grand_total,
        is_quotation=True,
        extra_notes=quotation.notes or ""
    )

def generate_invoice_pdf(invoice_id: int, db) -> bytes:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise ValueError("Invoice not found")

    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).all()
    
    company_details = {
        "name": "Vodacom Technologies Pvt Ltd- (from 1-Apr-25)",
        "address": "205, Basement, Sant Nagar\nEast of Kailash, Near Sanatan Mandir\nNew Delhi-110065",
        "gstin": "07AACC...",
        "state": "Delhi",
        "state_code": "07",
        "email": "rajeev@vodacom.in"
    }
    
    bill_to = {}
    ship_to = {}
    
    if invoice.customer:
        customer = invoice.customer
        bill_to = {
            "name": customer.company_name,
            "address": customer.address,
            "gstin": customer.gstin or "N/A",
            "state_name": customer.state_name or "",
            "state_code": customer.state_code or ""
        }
        ship_to = {
            "name": customer.company_name,
            "address": customer.shipping_address or customer.address,
            "gstin": customer.gstin or "N/A",
            "state_name": customer.state_name or "",
            "state_code": customer.state_code or ""
        }
    elif invoice.is_dummy and invoice.quotation and invoice.quotation.enquiry:
        enquiry = invoice.quotation.enquiry
        bill_to = {
            "name": enquiry.company_name,
            "address": enquiry.address,
            "gstin": "N/A",
            "state_name": enquiry.state_name or "",
            "state_code": enquiry.state_code or ""
        }
        ship_to = {
            "name": enquiry.company_name,
            "address": enquiry.shipping_address or enquiry.address,
            "gstin": "N/A",
            "state_name": enquiry.state_name or "",
            "state_code": enquiry.state_code or ""
        }
        
    doc_items = []
    for item in items:
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        prod_name = prod.name if prod else f"Product #{item.product_id}"
        doc_items.append({
            "name": prod_name,
            "hsn": "8517", 
            "qty": item.quantity,
            "rate": item.unit_price,
            "amount": item.total_amount,
            "tax_rate": item.tax_rate
        })
        
    doc_title = "DUMMY INVOICE" if invoice.is_dummy else "TAX INVOICE"
    
    return _build_tally_pdf(
        doc_title=doc_title,
        doc_number=invoice.invoice_number,
        doc_date=invoice.date,
        company_details=company_details,
        bill_to=bill_to,
        ship_to=ship_to,
        items=doc_items,
        subtotal=invoice.subtotal,
        tax_total=invoice.tax_total,
        grand_total=invoice.grand_total,
        is_quotation=False,
        extra_notes=invoice.notes or ""
    )

