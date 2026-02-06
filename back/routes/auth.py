# routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from pydantic import BaseModel
from db import get_db, Base, engine
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Float, ForeignKey, JSON
import secrets
import logging
import os

SECRET_KEY = os.getenv("JWT_SECRET", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Pydantic models
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class AdminCreateUserRequest(BaseModel):
    email: str
    full_name: str | None = None
    phone: str | None = None
    role: str = "user"  # user | admin
    temp_password: str | None = None
    send_link: bool = True

class PromoteUser(BaseModel):
    email: str

class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    company: str | None = None
    website: str | None = None
    bio: str | None = None

#  User Model 
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)  # Admin role flag
    
    # Additional profile fields
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    company = Column(String, nullable=True)
    website = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Invoice Model
class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=True)
    client_address = Column(Text, nullable=True)
    client_phone = Column(String, nullable=True)
    
    # Invoice details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    
    # Status and dates
    status = Column(String, default="pending")  # pending, paid, overdue, cancelled
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    paid_date = Column(DateTime, nullable=True)
    
    # Relationships
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Invoice Item Model for line items
class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ZohoInvoice(Base):
    __tablename__ = "zoho_invoices"

    id = Column(Integer, primary_key=True, index=True)
    zoho_invoice_id = Column(String, unique=True, index=True, nullable=False)
    invoice_number = Column(String, index=True, nullable=False)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=True)
    client_address = Column(Text, nullable=True)
    client_phone = Column(String, nullable=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    balance = Column(Float, nullable=True)
    status = Column(String, default="pending")
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    paid_date = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class JobCard(Base):
    __tablename__ = "job_cards"

    id = Column(Integer, primary_key=True, index=True)
    job_card_number = Column(String, unique=True, index=True, nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    invoice_number = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    status = Column(String, default="pending")
    notes = Column(Text, nullable=True)
    selected_items = Column(JSON, nullable=True)
    total_selected_amount = Column(Float, default=0.0)
    work_logs = Column(JSON, nullable=True)
    attachments = Column(JSON, nullable=True)
    voice_note_path = Column(String, nullable=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_user_email = Column(String, nullable=True)
    assigned_user_name = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    link = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_email = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)


Base.metadata.create_all(bind=engine)


#  Utility functions 
def get_password_hash(password):
    # Ensure password is not longer than 72 characters for bcrypt
    if len(password) > 72:
        password = password[:72]
    try:
        return pwd_context.hash(password)
    except ValueError as e:
        if "password cannot be longer than 72 bytes" in str(e):
            # Fallback: manually truncate and try again
            password = password[:72]
            return pwd_context.hash(password)
        raise


def verify_password(plain_password, hashed_password):
    # Ensure password is not longer than 72 characters for bcrypt
    if len(plain_password) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


#  Routes    
@router.post("/register")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = get_password_hash(user_data.password)
    new_user = User(email=user_data.email, password=hashed_pw, full_name=user_data.full_name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully"}


@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.email})
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "email": user.email, 
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "role": "admin" if user.is_admin else "user"
        }
    }


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": "If the email exists, a reset link was sent."}

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)

    reset = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset)
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/?page=reset&token={token}"

    from routes.send_mail import send_email
    subject = "Reset Your Password"
    body = (
        "<p>We received a request to reset your password.</p>"
        f"<p><a href=\"{reset_link}\">Click here to reset your password</a></p>"
        "<p>This link expires in 1 hour.</p>"
    )
    try:
        await send_email([user.email], subject, body)
        return {"message": "If the email exists, a reset link was sent.", "version": "forgot-password-v2"}
    except Exception as e:
        logger.exception("Failed to send reset email")
        if os.getenv("DEBUG_EMAIL") == "1":
            return {"message": "Email send failed", "error": str(e), "version": "forgot-password-v2"}
        return {"message": "If the email exists, a reset link was sent.", "version": "forgot-password-v2"}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    token_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at >= datetime.utcnow()
    ).first()

    if not token_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == token_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = get_password_hash(payload.new_password)
    token_entry.used_at = datetime.utcnow()
    db.commit()

    return {"message": "Password reset successful"}


@router.post("/admin/create-user")
async def admin_create_user(
    payload: AdminCreateUserRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    role = payload.role.lower()
    if role not in ["admin", "user"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = db.query(User).filter(User.email == payload.email).first()
    created = False

    if not user:
        password = payload.temp_password or secrets.token_urlsafe(16)
        user = User(
            email=payload.email,
            password=get_password_hash(password),
            full_name=payload.full_name,
            phone=payload.phone,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        created = True
    else:
        if payload.full_name:
            user.full_name = payload.full_name
        if payload.phone:
            user.phone = payload.phone
        if payload.temp_password:
            user.password = get_password_hash(payload.temp_password)
        db.commit()

    user.is_admin = role == "admin"
    db.commit()

    if payload.send_link:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        reset = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        db.add(reset)
        db.commit()

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_url}/?page=reset&token={token}"
        from routes.send_mail import send_email, send_sms
        subject = "Set Your Password"
        body = (
            "<p>Your account has been created by an administrator.</p>"
            f"<p><a href=\"{reset_link}\">Click here to set your password</a></p>"
            "<p>This link expires in 1 hour.</p>"
        )
        try:
            await send_email([user.email], subject, body)
        except Exception:
            pass
        if user.phone:
            try:
                await send_sms(
                    user.phone,
                    "Your account has been created. Use the email link to set your password.",
                    tag="new-user",
                )
            except Exception:
                pass

    return {
        "message": "User created" if created else "User updated",
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "role": "admin" if user.is_admin else "user",
        }
    }


@router.get("/me")
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        current_user.last_seen = datetime.utcnow()
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
    except Exception:
        db.rollback()
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_admin": current_user.is_admin,
        "role": "admin" if current_user.is_admin else "user",
        "phone": current_user.phone,
        "address": current_user.address,
        "company": current_user.company,
        "website": current_user.website,
        "bio": current_user.bio,
        "last_seen": current_user.last_seen.isoformat() if current_user.last_seen else None,
    }


@router.post("/promote-to-admin")
def promote_user_to_admin(
    promote_data: PromoteUser,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == promote_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_admin = True
    db.commit()
    return {"message": f"User {promote_data.email} has been promoted to admin"}


@router.get("/users")
def get_all_users(current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    superadmin_email = os.getenv("SUPERADMIN_EMAIL")
    query = db.query(User)
    if superadmin_email:
        query = query.filter(User.email != superadmin_email)
    users = query.all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "last_seen": getattr(user, "last_seen", None).isoformat() if getattr(user, "last_seen", None) else None,
        }
        for user in users
    ]


@router.delete("/admin/users/{user_id}")
def delete_user_permanently(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    superadmin_email = os.getenv("SUPERADMIN_EMAIL")
    if superadmin_email:
        superadmin = db.query(User).filter(User.email == superadmin_email).first()
        if superadmin and superadmin.id == user_id:
            raise HTTPException(status_code=403, detail="Cannot delete system administrator")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Null out assignments to avoid FK issues
        db.query(JobCard).filter(JobCard.assigned_user_id == user_id).update(
            {
                JobCard.assigned_user_id: None,
                JobCard.assigned_user_email: None,
                JobCard.assigned_user_name: None,
            },
            synchronize_session=False,
        )

        # Collect invoice ids created by user
        invoice_ids = [
            inv.id for inv in db.query(Invoice.id).filter(Invoice.created_by == user_id).all()
        ]
        if invoice_ids:
            db.query(JobCard).filter(JobCard.invoice_id.in_(invoice_ids)).delete(
                synchronize_session=False
            )
            db.query(InvoiceItem).filter(InvoiceItem.invoice_id.in_(invoice_ids)).delete(
                synchronize_session=False
            )
            db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).delete(
                synchronize_session=False
            )

        # Delete job cards created by user
        db.query(JobCard).filter(JobCard.created_by == user_id).delete(
            synchronize_session=False
        )

        # Delete zoho invoices created by user
        db.query(ZohoInvoice).filter(ZohoInvoice.created_by == user_id).delete(
            synchronize_session=False
        )

        # Delete notifications related to user
        db.query(Notification).filter(
            (Notification.created_by == user_id)
            | (Notification.recipient_id == user_id)
            | (Notification.recipient_email == user.email)
        ).delete(synchronize_session=False)

        # Delete password reset tokens
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete(
            synchronize_session=False
        )

        # Finally delete user
        db.delete(user)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Failed to delete user")
        raise HTTPException(status_code=500, detail="Failed to delete user")

    return {"success": True, "message": "User deleted"}


@router.get("/users/list")
def get_users_list(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": "admin" if user.is_admin else "user",
        }
        for user in users
    ]


@router.put("/profile")
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user profile
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "address": user.address,
            "company": user.company,
            "website": user.website,
            "bio": user.bio,
            "is_admin": user.is_admin
        }
    }
