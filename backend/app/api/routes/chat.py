import time
import logging
from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from google import genai
from google.genai import types

from app.db.session import get_db
from app.models.product import Product
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.amc import AmcContract
from app.models.service_work import ServiceWork
from app.models.sales import SalesEnquiry
from app.core.security import get_current_user
from app.core.config import get_settings

router = APIRouter(tags=["chat"], dependencies=[Depends(get_current_user)])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


def _build_direct_db_reply(user_query: str, db: Session) -> str:
    """Enhanced direct DB query engine providing detailed responses if GEMINI_API_KEY is absent."""
    query = user_query.lower()

    if any(k in query for k in ["inventory", "stock", "product", "item", "cctv", "cable", "switch"]):
        results = db.query(
            Product.category,
            func.count(Product.id).label("item_count"),
            func.sum(Product.stock_quantity).label("total_stock"),
            func.sum(Product.price * Product.stock_quantity).label("total_val")
        ).group_by(Product.category).all()

        total_items = db.query(Product).count()
        total_units = sum((r[2] or 0) for r in results)
        total_value = sum((r[3] or 0.0) for r in results)

        reply = (
            f"📊 **In-Depth Inventory Analysis:**\n\n"
            f"Your database contains **{total_items} distinct product models** with **{total_units:,} total stock units**, "
            f"representing a total inventory valuation of **₹{total_value:,.2f}**.\n\n"
            f"### Category Breakdown:\n"
        )
        for cat, count, total_stock, total_val in results:
            cat_name = cat or "Uncategorized"
            val = total_val or 0.0
            reply += f"* **{cat_name}:** {count} product types | {total_stock or 0:,} units in stock | Value: ₹{val:,.2f}\n"

        low_stock = db.query(Product).filter(Product.stock_quantity <= 5).limit(10).all()
        if low_stock:
            reply += f"\n⚠️ **Low Stock Alert (<= 5 units):**\n"
            for p in low_stock:
                reply += f"* **{p.name}:** Only {p.stock_quantity} {p.unit} remaining (₹{p.price:,.2f})\n"

        return reply

    if any(k in query for k in ["invoice", "billing", "revenue", "sale", "profit", "payment"]):
        invoices = db.query(Invoice).order_by(Invoice.date.desc()).limit(10).all()
        total_count = db.query(Invoice).count()
        paid_count = db.query(Invoice).filter(Invoice.status == "paid").count()
        pending_count = db.query(Invoice).filter(Invoice.status == "pending").count()
        total_rev = db.query(func.sum(Invoice.grand_total)).scalar() or 0.0

        reply = (
            f"💰 **Financial & Billing Breakdown:**\n\n"
            f"* **Total Invoices Issued:** {total_count}\n"
            f"* **Total Revenue:** ₹{total_rev:,.2f}\n"
            f"* **Paid Invoices:** {paid_count} ✅\n"
            f"* **Pending Invoices:** {pending_count} ⏳\n\n"
            f"### Recent Invoices:\n"
        )
        for inv in invoices:
            cust_name = inv.customer.company_name if inv.customer else f"Customer #{inv.customer_id}"
            reply += f"* **Invoice #{inv.invoice_number}** ({cust_name}): ₹{inv.grand_total:,.2f} — Status: `{inv.status.upper()}`\n"
        return reply

    if any(k in query for k in ["customer", "client", "buyer"]):
        count = db.query(Customer).count()
        customers = db.query(Customer).limit(10).all()
        reply = f"👥 **Customer Directory & Accounts ({count} Total):**\n\n"
        for c in customers:
            reply += f"* **{c.company_name}** | Contact: {c.contact_person} | Phone: {c.phone} | GSTIN: {c.gstin or 'N/A'}\n"
        return reply

    if any(k in query for k in ["amc", "contract", "maintenance"]):
        amcs = db.query(AmcContract).all()
        active = [a for a in amcs if a.status == "active"]
        expired = [a for a in amcs if a.status == "expired"]
        cancelled = [a for a in amcs if a.status == "cancelled"]
        total_val = sum(a.amount for a in amcs)

        reply = (
            f"🛡️ **Annual Maintenance Contracts (AMC) Portfolio:**\n\n"
            f"* **Total Contracts:** {len(amcs)} (Valued at ₹{total_val:,.2f})\n"
            f"* **Active Coverage:** {len(active)} 🟢\n"
            f"* **Expired (Needs Renewal):** {len(expired)} 🟡\n"
            f"* **Cancelled:** {len(cancelled)} 🔴\n\n"
            f"### Contract List:\n"
        )
        for a in amcs[:10]:
            cust_name = a.customer.company_name if a.customer else f"Client #{a.customer_id}"
            reply += f"* **#{a.contract_number}** ({cust_name}): ₹{a.amount:,.2f} — Ends: {a.end_date} (`{a.status.upper()}`)\n"
        return reply

    if any(k in query for k in ["service", "ticket", "repair", "fault", "work"]):
        tickets = db.query(ServiceWork).all()
        open_t = [t for t in tickets if t.status in ["open", "in_progress", "pending"]]
        reply = f"🔧 **Service Work Tickets ({len(tickets)} Total):**\n\nPending/Open Tickets: **{len(open_t)}**\n\n"
        for t in tickets[:10]:
            reply += f"* **SW-{t.id:04d}:** {t.title} | Priority: `{t.priority.upper()}` | Status: `{t.status.upper()}`\n"
        return reply

    if any(k in query for k in ["enquiry", "lead", "sales", "quote", "quotation"]):
        enquiries = db.query(SalesEnquiry).all()
        active = [e for e in enquiries if e.status in ["new", "quoted", "pending", "approved"]]
        reply = f"📢 **Sales Enquiries & Lead Pipeline ({len(enquiries)} Total):**\n\nActive Pipeline Leads: **{len(active)}**\n\n"
        for e in enquiries[:10]:
            reply += f"* **{e.company_name}:** Contact {e.contact_person} ({e.phone}) — Status: `{e.status.upper()}`\n"
        return reply

    return (
        "🤖 **Vodacom ERP AI Assistant:**\n\n"
        "I have complete real-time access to your entire database! Ask me anything about:\n"
        "* **📦 Detailed Inventory & Stock Valuation**\n"
        "* **💰 Revenue, Profit Margins & Invoices**\n"
        "* **👥 Customer Directory & Contacts**\n"
        "* **🛡️ AMC Contracts & Expiries**\n"
        "* **🔧 Service Work Tickets**\n"
        "* **📢 Sales Enquiries & Quotations**"
    )


@router.post("")
@router.post("/")
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY
    user_query = request.messages[-1].content if request.messages else ""

    # ── Fallback if GEMINI_API_KEY is not configured on Render ──────────────
    if not api_key:
        logging.info("[CHAT] GEMINI_API_KEY not configured. Using direct DB fallback.")
        return {"reply": _build_direct_db_reply(user_query, db)}

    try:
        client = genai.Client(api_key=api_key)
    except Exception as ie:
        logging.warning(f"[CHAT] Gemini client init error: {ie}")
        return {"reply": _build_direct_db_reply(user_query, db)}

    # ── Full In-Depth DB Tool Functions ─────────────────────────────────────

    def get_full_inventory_analysis() -> dict:
        """Returns deep category breakdown, total inventory stock count, total valuation, and low-stock items."""
        results = db.query(
            Product.category,
            func.count(Product.id).label("item_count"),
            func.sum(Product.stock_quantity).label("total_stock"),
            func.sum(Product.price * Product.stock_quantity).label("total_val")
        ).group_by(Product.category).all()

        low_stock = db.query(Product).filter(Product.stock_quantity <= 5).all()

        return {
            "total_product_models": db.query(Product).count(),
            "total_units_in_stock": sum((r[2] or 0) for r in results),
            "total_inventory_value": sum((r[3] or 0.0) for r in results),
            "categories": [
                {
                    "category": cat or "Uncategorized",
                    "product_count": int(count or 0),
                    "stock_units": int(total_stock or 0),
                    "category_valuation": float(total_val or 0.0)
                } for cat, count, total_stock, total_val in results
            ],
            "low_stock_alerts": [
                {"name": p.name, "stock": p.stock_quantity, "unit": p.unit, "price": p.price}
                for p in low_stock
            ]
        }

    def search_products_in_depth(keyword: str) -> dict:
        """Finds all products matching a keyword with complete details: stock, unit price, cost price, profit margin, SKU, and HSN code."""
        kw = f"%{keyword.strip()}%"
        products = db.query(Product).filter(
            (Product.name.ilike(kw)) | (Product.category.ilike(kw)) | (Product.description.ilike(kw))
        ).limit(100).all()

        return {
            "query": keyword,
            "match_count": len(products),
            "products": [
                {
                    "id": p.id,
                    "name": p.name,
                    "category": p.category,
                    "sku": p.sku,
                    "hsn_code": p.hsn_code,
                    "stock": p.stock_quantity,
                    "unit": p.unit,
                    "selling_price": p.price,
                    "cost_price": getattr(p, 'cost_price', p.price),
                    "profit_margin": getattr(p, 'profit_margin', 0.0),
                    "tax_rate": p.tax_rate
                } for p in products
            ]
        }

    def get_financial_and_invoice_analysis() -> dict:
        """Returns deep invoice financial metrics: total revenue, paid vs pending invoice totals, recent invoices, and customer billing."""
        invoices = db.query(Invoice).order_by(Invoice.date.desc()).limit(20).all()
        total_rev = db.query(func.sum(Invoice.grand_total)).scalar() or 0.0
        paid_rev = db.query(func.sum(Invoice.grand_total)).filter(Invoice.status == "paid").scalar() or 0.0
        pending_rev = db.query(func.sum(Invoice.grand_total)).filter(Invoice.status == "pending").scalar() or 0.0

        return {
            "total_invoices_count": db.query(Invoice).count(),
            "total_revenue": total_rev,
            "paid_revenue": paid_rev,
            "pending_revenue": pending_rev,
            "recent_invoices": [
                {
                    "invoice_number": i.invoice_number,
                    "customer_name": i.customer.company_name if i.customer else "Unknown",
                    "amount": i.grand_total,
                    "status": i.status,
                    "date": str(i.date)
                } for i in invoices
            ]
        }

    def get_amc_contracts_in_depth() -> dict:
        """Returns complete AMC contract details: active, expired, upcoming expiries, and total contract portfolio value."""
        amcs = db.query(AmcContract).all()
        today = time.strftime("%Y-%m-%d")
        return {
            "total_contracts": len(amcs),
            "portfolio_value": sum(a.amount for a in amcs),
            "active_count": len([a for a in amcs if a.status == "active"]),
            "expired_count": len([a for a in amcs if a.status == "expired"]),
            "cancelled_count": len([a for a in amcs if a.status == "cancelled"]),
            "contracts": [
                {
                    "id": a.id,
                    "contract_number": a.contract_number,
                    "customer": a.customer.company_name if a.customer else "Unknown",
                    "amount": a.amount,
                    "start_date": str(a.start_date),
                    "end_date": str(a.end_date),
                    "status": a.status,
                    "notes": a.notes
                } for a in amcs
            ]
        }

    def get_service_work_and_tickets() -> dict:
        """Returns all open, pending, and in-progress service work tickets."""
        tickets = db.query(ServiceWork).all()
        return {
            "total_tickets": len(tickets),
            "open_count": len([t for t in tickets if t.status in ["open", "in_progress", "pending"]]),
            "tickets": [
                {
                    "id": t.id,
                    "ticket_number": f"SW-{t.id:04d}",
                    "title": t.title,
                    "customer": t.customer.company_name if t.customer else "Unknown",
                    "priority": t.priority,
                    "status": t.status,
                    "due_date": str(t.due_date) if t.due_date else ""
                } for t in tickets
            ]
        }

    def get_sales_enquiries_and_leads() -> dict:
        """Returns all sales leads, enquiries, and quotation conversion data."""
        enquiries = db.query(SalesEnquiry).all()
        return {
            "total_leads": len(enquiries),
            "active_leads": len([e for e in enquiries if e.status in ["new", "quoted", "pending", "approved"]]),
            "leads": [
                {
                    "id": e.id,
                    "company_name": e.company_name,
                    "contact_person": e.contact_person,
                    "email": e.email,
                    "phone": e.phone,
                    "status": e.status,
                    "notes": e.notes
                } for e in enquiries
            ]
        }

    TOOL_MAP = {
        "get_full_inventory_analysis": get_full_inventory_analysis,
        "search_products_in_depth": search_products_in_depth,
        "get_financial_and_invoice_analysis": get_financial_and_invoice_analysis,
        "get_amc_contracts_in_depth": get_amc_contracts_in_depth,
        "get_service_work_and_tickets": get_service_work_and_tickets,
        "get_sales_enquiries_and_leads": get_sales_enquiries_and_leads,
    }

    tools = list(TOOL_MAP.values())

    system_instruction = (
        "You are the senior Vodacom ERP AI Business Consultant. You have complete, direct access to the live ERP database.\n"
        "GOAL: Provide thorough, detailed, professional, and in-depth analytical responses to the user's queries.\n\n"
        "INSTRUCTIONS:\n"
        "1. ALWAYS call your database tools to retrieve full, accurate, up-to-date live data before answering.\n"
        "2. Structure your answers clearly using bold headings, bullet points, financial figures (in ₹), and stock counts.\n"
        "3. Provide rich context: highlight key insights, stock warnings, profit margin opportunities, and actionable advice.\n"
        "4. Be articulate, polite, and precise."
    )

    contents: List[types.Content] = []
    for m in request.messages:
        role = "user" if m.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=m.content)]))

    models_to_try = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]

    for model_name in models_to_try:
        try:
            current_contents = list(contents)

            for _turn in range(5):
                response = client.models.generate_content(
                    model=model_name,
                    contents=current_contents,
                    config=types.GenerateContentConfig(
                        tools=tools,
                        system_instruction=system_instruction,
                        temperature=0.2,
                    ),
                )

                candidate = response.candidates[0] if response.candidates else None
                if not candidate:
                    break

                has_function_call = any(
                    hasattr(part, "function_call") and part.function_call
                    for part in candidate.content.parts
                )

                if not has_function_call:
                    final_text = response.text or ""
                    if not final_text:
                        for part in candidate.content.parts:
                            if hasattr(part, "text") and part.text:
                                final_text += part.text
                    return {"reply": final_text or "Analysis complete."}

                model_parts = candidate.content.parts
                function_response_parts = []

                for part in model_parts:
                    if hasattr(part, "function_call") and part.function_call:
                        fc = part.function_call
                        fn_name = fc.name
                        fn_args = dict(fc.args) if fc.args else {}

                        if fn_name in TOOL_MAP:
                            try:
                                tool_result = TOOL_MAP[fn_name](**fn_args)
                            except Exception as te:
                                tool_result = {"error": str(te)}
                        else:
                            tool_result = {"error": f"Unknown tool: {fn_name}"}

                        function_response_parts.append(
                            types.Part.from_function_response(
                                name=fn_name,
                                response={"result": tool_result},
                            )
                        )

                current_contents.append(candidate.content)
                current_contents.append(
                    types.Content(role="tool", parts=function_response_parts)
                )

            return {"reply": "Completed database analysis."}

        except Exception as e:
            err_str = str(e)
            logging.warning(f"[CHAT] Gemini model {model_name} error: {err_str[:150]}")
            if any(kw in err_str for kw in ["RESOURCE_EXHAUSTED", "429", "503", "UNAVAILABLE"]):
                time.sleep(1)
                continue
            break

    return {"reply": _build_direct_db_reply(user_query, db)}
