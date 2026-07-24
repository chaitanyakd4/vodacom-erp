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
from app.core.security import get_current_user
from app.core.config import get_settings

router = APIRouter(tags=["chat"], dependencies=[Depends(get_current_user)])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


def _build_direct_db_reply(user_query: str, db: Session) -> str:
    """Fallback direct DB engine if GEMINI_API_KEY is not configured."""
    query = user_query.lower()

    if any(k in query for k in ["inventory", "stock", "product", "item"]):
        results = db.query(
            Product.category,
            func.count(Product.id).label("item_count"),
            func.sum(Product.stock_quantity).label("total_stock"),
        ).group_by(Product.category).all()

        total_items = db.query(Product).count()
        total_units = sum((r[2] or 0) for r in results)

        reply = f"📦 **Live Inventory Summary:**\n\nThere are **{total_items} product models** with **{total_units} total stock units** in your database:\n\n"
        for cat, count, total_stock in results:
            cat_name = cat or "Uncategorized"
            reply += f"#### {cat_name}\n* **Item Types:** {count} models ({total_stock or 0} total units)\n\n"
        return reply

    if any(k in query for k in ["invoice", "billing", "revenue", "sale"]):
        invoices = db.query(Invoice).order_by(Invoice.desc() if hasattr(Invoice, 'desc') else Invoice.id.desc()).limit(5).all()
        total_count = db.query(Invoice).count()
        reply = f"📄 **Invoices & Billing Summary:**\n\nFound **{total_count} total invoices** in the system.\n\n#### Recent Invoices\n"
        for inv in invoices:
            reply += f"* **Invoice #{inv.invoice_number}:** ₹{inv.grand_total:,.2f} ({inv.status.upper()})\n"
        return reply

    if any(k in query for k in ["customer", "client", "buyer"]):
        count = db.query(Customer).count()
        customers = db.query(Customer).limit(5).all()
        reply = f"👥 **Customer Directory Summary:**\n\nTotal registered customers: **{count}**\n\n#### Recent Customer Accounts\n"
        for c in customers:
            reply += f"* **{c.company_name}:** {c.contact_person} ({c.phone})\n"
        return reply

    if any(k in query for k in ["amc", "contract", "maintenance"]):
        amcs = db.query(AmcContract).all()
        active = [a for a in amcs if a.status == "active"]
        reply = f"🤝 **AMC Contracts Summary:**\n\nTotal contracts: **{len(amcs)}** | Active: **{len(active)}**\n\n"
        for a in active[:5]:
            reply += f"* **Contract #{a.contract_number}:** ₹{a.amount:,.2f} (Ends: {a.end_date})\n"
        return reply

    return (
        "👋 **Vodacom ERP Assistant:**\n\n"
        "I am ready to query your live database! Try asking about:\n"
        "* **📦 Inventory Summary**\n"
        "* **📄 Recent Invoices**\n"
        "* **👥 Customer Directory**\n"
        "* **🤝 Active AMCs**"
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

    # ── DB tool functions for Gemini ─────────────────────────────────────────

    def get_inventory_overview() -> list:
        """Returns the item count and total stock units for every inventory category."""
        results = db.query(
            Product.category,
            func.count(Product.id).label("item_count"),
            func.sum(Product.stock_quantity).label("total_stock"),
        ).group_by(Product.category).all()
        return [
            {
                "category": cat or "Uncategorized",
                "unique_product_types": int(count or 0),
                "total_stock_units": int(total_stock or 0),
            }
            for cat, count, total_stock in results
        ]

    def get_products_by_category(category_keyword: str) -> dict:
        """Finds all products matching a category name or keyword."""
        kw = f"%{category_keyword.strip()}%"
        products = db.query(Product).filter(
            (Product.category.ilike(kw)) | (Product.name.ilike(kw))
        ).all()
        total_stock = sum(p.stock_quantity for p in products)
        items = [
            {"name": p.name, "category": p.category, "stock": p.stock_quantity, "unit": p.unit, "price": p.price}
            for p in products
        ]
        return {
            "query_keyword": category_keyword,
            "matching_items_count": len(items),
            "total_stock_quantity": total_stock,
            "items": items,
        }

    def search_inventory(query: str) -> dict:
        """Searches product names, descriptions, or categories for a query string."""
        kw = f"%{query.strip()}%"
        products = db.query(Product).filter(
            (Product.name.ilike(kw)) | (Product.description.ilike(kw)) | (Product.category.ilike(kw))
        ).limit(50).all()
        total_stock = sum(p.stock_quantity for p in products)
        items = [{"name": p.name, "category": p.category, "stock": p.stock_quantity, "unit": p.unit} for p in products]
        return {
            "search_query": query,
            "matching_items_count": len(items),
            "total_stock_quantity": total_stock,
            "items": items,
        }

    def get_customer_summary() -> dict:
        """Returns customer metrics and customer list."""
        customers = db.query(Customer).limit(20).all()
        return {
            "total_customers": db.query(Customer).count(),
            "customers": [{"id": c.id, "company": c.company_name, "phone": c.phone} for c in customers],
        }

    def get_amc_summary() -> dict:
        """Returns details about Annual Maintenance Contracts (AMCs)."""
        amcs = db.query(AmcContract).all()
        active = [a for a in amcs if a.status == "active"]
        expired = [a for a in amcs if a.status == "expired"]
        return {
            "total_amcs": len(amcs),
            "active_count": len(active),
            "expired_count": len(expired),
            "active_contracts": [
                {"id": a.id, "contract_number": a.contract_number, "amount": a.amount, "end_date": str(a.end_date)}
                for a in active
            ],
        }

    def get_recent_sales_invoices() -> dict:
        """Returns summary of recent invoices."""
        invoices = db.query(Invoice).order_by(Invoice.date.desc()).limit(10).all()
        total_revenue = sum(i.grand_total for i in invoices)
        return {
            "invoice_count": len(invoices),
            "total_recent_revenue": total_revenue,
            "invoices": [
                {"number": i.invoice_number, "status": i.status, "amount": i.grand_total, "date": str(i.date)}
                for i in invoices
            ],
        }

    TOOL_MAP = {
        "get_inventory_overview": get_inventory_overview,
        "get_products_by_category": get_products_by_category,
        "search_inventory": search_inventory,
        "get_customer_summary": get_customer_summary,
        "get_amc_summary": get_amc_summary,
        "get_recent_sales_invoices": get_recent_sales_invoices,
    }

    tools = list(TOOL_MAP.values())

    system_instruction = (
        "You are the Vodacom ERP AI Assistant. Help the user by querying the database using your tools. "
        "When asked about inventory, stock, or specific items, ALWAYS use get_inventory_overview or get_products_by_category "
        "to fetch complete live data.\n"
        "FORMATTING RULES:\n"
        "1. Start with a brief summary sentence.\n"
        "2. Group products by category using #### Category Name headers.\n"
        "3. List every product as a bullet point: * **Product Name:** quantity unit\n"
        "4. End with a total summary line."
    )

    contents: List[types.Content] = []
    for m in request.messages:
        role = "user" if m.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=m.content)]))

    # Standard model names
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
                        temperature=0.3,
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
                    return {"reply": final_text or "Query complete."}

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

            return {"reply": "Completed database query."}

        except Exception as e:
            err_str = str(e)
            logging.warning(f"[CHAT] Gemini model {model_name} error: {err_str[:150]}")
            if any(kw in err_str for kw in ["RESOURCE_EXHAUSTED", "429", "503", "UNAVAILABLE"]):
                time.sleep(1)
                continue
            break

    # Fallback to direct DB reply if Gemini fails or is rate limited
    return {"reply": _build_direct_db_reply(user_query, db)}
