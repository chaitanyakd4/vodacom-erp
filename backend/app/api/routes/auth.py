from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import logging

from app.db.session import get_db
from app.core import security
from app.models.user import User
from app.schemas.auth import Token, UserOut, UserCreate, ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_password_reset_email
from app.core.config import get_settings

router = APIRouter()

ALL_MODULES = [
    "dashboard", "customers", "products", "invoices",
    "challan", "amc", "service-work", "enquiries"
]

@router.post("/login", response_model=Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = security.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(security.get_current_user)):
    return current_user


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        try:
            token = security.create_password_reset_token(req.email)
            reset_link = f"{get_settings().FRONTEND_URL}/reset-password?token={token}"
            logging.info(f"Password reset requested for {req.email}. Link: {reset_link}")
            await send_password_reset_email(req.email, reset_link)
            logging.info(f"Password reset email successfully sent to {req.email}")
        except Exception as e:
            logging.error(f"Failed to send password reset email to {req.email}: {e}")
            # Still return generic message to not expose internal errors
    else:
        logging.info(f"Password reset requested for unknown email: {req.email}")
    
    # Always return success to prevent email enumeration
    return {"detail": "If the email is registered, a password reset link has been sent to it."}



@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = security.verify_password_reset_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = security.hash_password(req.new_password)
    db.commit()
    return {"detail": "Password has been reset successfully"}


# ── User Management (Superadmin Only) ────────────────────────────────────────

@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(security.require_superadmin)
):
    """List all users. Requires superadmin."""
    return db.query(User).order_by(User.id).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.require_superadmin)
):
    """Create a new user account. Requires superadmin."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")
    
    new_user = User(
        email=user_in.email,
        hashed_password=security.hash_password(user_in.password),
        is_active=True,
        is_superadmin=False,
        permissions="all",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.require_superadmin)
):
    """Delete a user account. Cannot delete yourself or another superadmin."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_superadmin:
        raise HTTPException(status_code=400, detail="Cannot delete another superadmin account.")
    
    db.delete(user)
    db.commit()


@router.patch("/users/{user_id}/permissions")
def update_user_permissions(
    user_id: int,
    permissions: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(security.require_superadmin)
):
    """
    Update a user's module permissions.
    permissions: comma-separated module slugs e.g. 'dashboard,customers,invoices'
                 or 'all' for full access.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_superadmin:
        raise HTTPException(status_code=400, detail="Cannot restrict a superadmin account.")
    
    # Validate module slugs
    if permissions != "all":
        slugs = [s.strip() for s in permissions.split(",") if s.strip()]
        invalid = [s for s in slugs if s not in ALL_MODULES]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid module slugs: {invalid}")
        permissions = ",".join(slugs)
    
    user.permissions = permissions
    db.commit()
    db.refresh(user)
    return {"detail": "Permissions updated.", "permissions": user.permissions}


@router.patch("/users/{user_id}/superadmin")
def toggle_superadmin(
    user_id: int,
    is_superadmin: bool = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(security.require_superadmin)
):
    """Promote or demote a user's superadmin status. Cannot demote yourself."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot change your own superadmin status.")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    user.is_superadmin = is_superadmin
    if is_superadmin:
        user.permissions = "all"  # Superadmins always get full access
    db.commit()
    db.refresh(user)
    return {"detail": f"User superadmin status set to {is_superadmin}.", "is_superadmin": user.is_superadmin}
