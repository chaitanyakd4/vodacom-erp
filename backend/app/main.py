"""
main.py - FastAPI app, CORS, route registration
"""
from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import app.models  # ensure all models are imported and mappers configured
from app.api.routes.products import router as products_router
from app.api.routes.dashboard import router as dashboard_router
from app.db.session import engine, Base
import logging
import time

app = FastAPI(title="Vodacom ERP API")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"Validation error: {exc.errors()} \nBody: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(await request.body())},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

from app.api.routes.auth import router as auth_router
from app.api.routes.customers import router as customers_router
from app.api.routes.invoices import router as invoices_router
from app.api.routes.amc import router as amc_router
from app.api.routes.service_work import router as service_work_router
from app.api.routes.sales import router as sales_router
from app.api.routes.challan import router as challan_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.chat import router as chat_router
from app.api.routes.reminders import router as reminders_router
from app.api.routes.purchase_order import router as purchase_order_router

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(customers_router, prefix="/api/customers", tags=["customers"])
app.include_router(invoices_router, prefix="/api/invoices", tags=["invoices"])
app.include_router(amc_router, prefix="/api/amc", tags=["amc"])
app.include_router(service_work_router, prefix="/api/service-work", tags=["service_work"])
app.include_router(sales_router, prefix="/api/sales", tags=["sales"])
app.include_router(challan_router, prefix="/api/challan", tags=["challan"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(reminders_router, prefix="/api/reminders", tags=["reminders"])
app.include_router(purchase_order_router, prefix="/api/purchase-orders", tags=["purchase_orders"])



def _seed_admin():
    """Create/update the primary superadmin user in the database."""
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.core.security import hash_password
    from app.core.config import get_settings

    db = SessionLocal()
    try:
        settings = get_settings()
        primary_email = "chaitanya@vodacom.in".strip().lower()
        raw_pwd = settings.ADMIN_PASSWORD if settings.ADMIN_PASSWORD and settings.ADMIN_PASSWORD not in ("admin123", "") else "#king0490"
        primary_password = str(raw_pwd).strip().strip("'\"")

        # Upsert primary superadmin
        from sqlalchemy import func
        user = db.query(User).filter(func.lower(User.email) == primary_email).first()
        if not user:
            user = User(
                email=primary_email,
                hashed_password=hash_password(primary_password),
                is_active=True,
                is_superadmin=True,
                permissions="all"
            )
            db.add(user)
            logging.info(f"[SEED] Created superadmin: {primary_email}")
        else:
            user.hashed_password = hash_password(primary_password)
            user.is_active = True
            user.is_superadmin = True
            user.permissions = "all"
            logging.info(f"[SEED] Updated superadmin: {primary_email}")
        db.commit()
        return True, primary_email, primary_password
    except Exception as e:
        logging.error(f"[SEED] Failed: {e}")
        return False, None, str(e)
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok", "app": "Vodacom ERP API"}


@app.get("/api/setup")
def setup_database(secret: str = Query(...)):
    """
    One-time setup endpoint: creates DB tables and seeds the admin user.
    Protected by secret token. Call once after first deploy:
      GET /api/setup?secret=vodacom-setup-2024
    """
    if secret != "vodacom-setup-2024":
        return JSONResponse(status_code=403, content={"detail": "Invalid secret."})

    results = []

    # Step 1: Create tables
    for attempt in range(5):
        try:
            Base.metadata.create_all(bind=engine)
            results.append("✅ Database tables created/verified.")
            break
        except Exception as e:
            results.append(f"⚠️ Table creation attempt {attempt+1}/5: {str(e)[:100]}")
            if attempt < 4:
                time.sleep(3)

    # Step 2: Seed admin
    ok, email, info = _seed_admin()
    if ok:
        results.append(f"✅ Superadmin ready: {email}")
        results.append(f"🔑 Use ADMIN_PASSWORD env var (default: #king0490)")
    else:
        results.append(f"❌ Seed failed: {info}")

    return {"steps": results}


def _safe_execute_ddl(sql: str):
    """Execute DDL in its own transaction block to prevent PostgreSQL transaction abort chain."""
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(text(sql))
            logging.info(f"[MIGRATION] DDL executed: {sql[:60].strip()}...")
    except Exception as e:
        logging.warning(f"[MIGRATION] DDL notice: {e}")


def _safe_add_column(table: str, column: str, col_type: str):
    """Add a column safely to both PostgreSQL and SQLite in isolated transactions."""
    from sqlalchemy import text
    # 1. PostgreSQL syntax (ADD COLUMN IF NOT EXISTS)
    try:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type};"))
            logging.info(f"[MIGRATION] Added/verified column {table}.{column} (PostgreSQL)")
            return
    except Exception:
        pass

    # 2. SQLite syntax fallback (ADD COLUMN)
    try:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type};"))
            logging.info(f"[MIGRATION] Added column {table}.{column} (SQLite)")
    except Exception:
        pass


def _run_auto_migrations():
    """Ensure newly added columns exist in existing PostgreSQL/SQLite tables."""
    _safe_add_column("invoice_items", "cost_price", "FLOAT DEFAULT 0.0")
    _safe_add_column("invoice_items", "profit_margin", "FLOAT DEFAULT 0.0")
    _safe_add_column("service_work", "technician_mobile", "VARCHAR(20)")
    _safe_add_column("service_work", "reached_at", "TIMESTAMP")
    _safe_add_column("service_work", "reached_location", "VARCHAR(255)")

    # Execute raw PostgreSQL DDL fallback only when using PostgreSQL engine
    if engine.dialect.name == "postgresql":
        _safe_execute_ddl("""
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id SERIAL PRIMARY KEY,
                po_number VARCHAR(50) UNIQUE NOT NULL,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reverse_charge BOOLEAN DEFAULT FALSE,
                invoice_ref VARCHAR(100),
                transportation_mode VARCHAR(100),
                vehicle_no VARCHAR(100),
                date_of_supply TIMESTAMP,
                place_of_supply VARCHAR(100),
                receiver_name VARCHAR(255) NOT NULL,
                receiver_address VARCHAR(500),
                receiver_gstin VARCHAR(50),
                receiver_state VARCHAR(100),
                receiver_state_code VARCHAR(10),
                payment_terms VARCHAR(255),
                consignee_name VARCHAR(255),
                consignee_address VARCHAR(500),
                consignee_gstin VARCHAR(50),
                consignee_state VARCHAR(100),
                consignee_state_code VARCHAR(10),
                other_reference VARCHAR(255),
                tax_rate FLOAT DEFAULT 18.0,
                cgst_amount FLOAT DEFAULT 0.0,
                sgst_amount FLOAT DEFAULT 0.0,
                igst_amount FLOAT DEFAULT 0.0,
                total_qty FLOAT DEFAULT 0.0,
                subtotal FLOAT DEFAULT 0.0,
                total_tax FLOAT DEFAULT 0.0,
                total_amount FLOAT DEFAULT 0.0,
                notes TEXT,
                status VARCHAR(50) DEFAULT 'draft'
            );
        """)

        _safe_execute_ddl("""
            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id SERIAL PRIMARY KEY,
                po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id),
                description VARCHAR(255),
                hsn_sac VARCHAR(50),
                uom VARCHAR(30) DEFAULT 'Nos',
                quantity FLOAT DEFAULT 1.0,
                rate FLOAT DEFAULT 0.0,
                tax_rate FLOAT DEFAULT 18.0,
                total_amount FLOAT DEFAULT 0.0
            );
        """)


@app.on_event("startup")
def startup():
    import app.models  # noqa: F401

    # Try to create tables with retries
    for attempt in range(5):
        try:
            Base.metadata.create_all(bind=engine)
            _run_auto_migrations()
            logging.info("[STARTUP] Database tables & columns verified/created.")
            break
        except Exception as e:
            logging.warning(f"[STARTUP] Table creation attempt {attempt+1}/5 failed: {str(e)[:120]}")
            if attempt < 4:
                time.sleep(5)
            else:
                logging.warning("[STARTUP] Could not create tables. Call /api/setup?secret=vodacom-setup-2024 to retry.")

    # Auto-seed admin user
    ok, email, info = _seed_admin()
    if ok:
        logging.info(f"[STARTUP] Admin ready: {email}")
    else:
        logging.warning(f"[STARTUP] Admin seed failed. Call /api/setup?secret=vodacom-setup-2024 to retry. Error: {info}")

