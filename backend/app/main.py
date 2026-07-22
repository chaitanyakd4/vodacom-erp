"""
main.py - FastAPI app, CORS, route registration
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models  # ensure all models are imported and mappers configured
from app.api.routes.products import router as products_router
from app.api.routes.dashboard import router as dashboard_router
from app.db.session import engine, Base

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

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

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(customers_router, prefix="/api/customers", tags=["customers"])
app.include_router(invoices_router, prefix="/api/invoices", tags=["invoices"])
app.include_router(amc_router, prefix="/api/amc", tags=["amc"])
app.include_router(service_work_router, prefix="/api/service-work", tags=["service_work"])
app.include_router(sales_router, prefix="/api/sales", tags=["sales"])
app.include_router(challan_router, prefix="/api/challan", tags=["challan"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])

@app.get("/")
def root():
    return {"status": "ok"}

@app.on_event("startup")
def startup():
    # Import models here to ensure they are registered with SQLAlchemy
    import app.models  # noqa: F401
    import time
    # Try to create tables with retries – Supabase free tier may be briefly sleeping
    tables_created = False
    for attempt in range(3):
        try:
            Base.metadata.create_all(bind=engine)
            logging.info("Database tables verified/created successfully.")
            tables_created = True
            break
        except Exception as e:
            logging.warning(f"Startup DB check attempt {attempt+1}/3 failed: {e}")
            if attempt < 2:
                time.sleep(3)
            else:
                logging.warning("Could not verify DB tables on startup. Server will still run.")

    # Auto-seed designated superadmin user
    try:
        from app.db.session import SessionLocal
        from app.models.user import User
        from app.core.security import hash_password
        from app.core.config import get_settings
        
        db = SessionLocal()
        settings = get_settings()
        
        primary_email = "chaitanya@vodacom.in"
        primary_password = settings.ADMIN_PASSWORD if settings.ADMIN_PASSWORD and settings.ADMIN_PASSWORD != "admin123" else "#king0490"
        
        # 1. Primary superadmin user
        user = db.query(User).filter(User.email == primary_email).first()
        if not user:
            user = User(
                email=primary_email,
                hashed_password=hash_password(primary_password),
                is_active=True,
                is_superadmin=True,
                permissions="all"
            )
            db.add(user)
            db.commit()
            logging.info(f"Auto-seeded superadmin: {primary_email}")
        else:
            # Always ensure correct password, active status, and superadmin rights
            user.hashed_password = hash_password(primary_password)
            user.is_active = True
            user.is_superadmin = True
            user.permissions = "all"
            db.commit()
            logging.info(f"Updated superadmin credentials: {primary_email}")

        # 2. Also ensure backup emails exist if configured
        backup_emails = ["chaitanya.kumar0480@gmail.com", "admin@vodacom.in"]
        for b_email in backup_emails:
            if b_email != primary_email:
                b_user = db.query(User).filter(User.email == b_email).first()
                if not b_user:
                    db.add(User(
                        email=b_email,
                        hashed_password=hash_password("#king0490"),
                        is_active=True,
                        is_superadmin=True,
                        permissions="all"
                    ))
                    db.commit()
        db.close()
    except Exception as se:
        logging.warning(f"Auto-seed check: {se}")



