# routes/invoices.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from db import get_db
from routes.auth import get_current_user, User, Invoice, InvoiceItem

security = HTTPBearer()

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# Pydantic models
class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float
    unit_price: float

class InvoiceCreate(BaseModel):
    client_name: str
    client_email: str | None = None
    client_address: str | None = None
    client_phone: str | None = None
    title: str
    description: str | None = None
    amount: float
    tax_rate: float = 0.0
    due_date: datetime | None = None
    items: list[InvoiceItemCreate] = []

class InvoiceUpdate(BaseModel):
    client_name: str | None = None
    client_email: str | None = None
    client_address: str | None = None
    client_phone: str | None = None
    title: str | None = None
    description: str | None = None
    amount: float | None = None
    tax_rate: float | None = None
    status: str | None = None
    due_date: datetime | None = None
    items: list[InvoiceItemCreate] | None = None

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    client_name: str
    client_email: str | None
    client_address: str | None
    client_phone: str | None
    title: str
    description: str | None
    amount: float
    tax_rate: float
    total_amount: float
    status: str
    issue_date: datetime
    due_date: datetime | None
    paid_date: datetime | None
    created_by: int
    created_at: datetime
    updated_at: datetime
    items: list[dict] = []

    class Config:
        from_attributes = True

# Utility functions
def generate_invoice_number(db: Session) -> str:
    """Generate unique invoice number"""
    year = datetime.now().year
    month = datetime.now().month
    
    # Get count of invoices this month
    count = db.query(Invoice).filter(
        Invoice.issue_date >= datetime(year, month, 1),
        Invoice.issue_date < datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    ).count()
    
    return f"INV-{year}-{month:02d}-{count + 1:04d}"

# Routes
@router.post("/", response_model=InvoiceResponse)
def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice_number = generate_invoice_number(db)
    
    # Calculate total amount with tax
    subtotal = invoice_data.amount
    tax_amount = subtotal * (invoice_data.tax_rate / 100)
    total = subtotal + tax_amount
    
    # Create invoice
    db_invoice = Invoice(
        invoice_number=invoice_number,
        client_name=invoice_data.client_name,
        client_email=invoice_data.client_email,
        client_address=invoice_data.client_address,
        client_phone=invoice_data.client_phone,
        title=invoice_data.title,
        description=invoice_data.description,
        amount=subtotal,
        tax_rate=invoice_data.tax_rate,
        total_amount=total,
        due_date=invoice_data.due_date,
        created_by=current_user.id
    )
    
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    
    # Add invoice items if provided
    if invoice_data.items:
        for item in invoice_data.items:
            item_total = item.quantity * item.unit_price
            db_item = InvoiceItem(
                invoice_id=db_invoice.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item_total
            )
            db.add(db_item)
        
        db.commit()
    
    return db_invoice

@router.get("/", response_model=list[InvoiceResponse])
def get_invoices(
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Invoice).filter(Invoice.created_by == current_user.id)
    
    if status:
        query = query.filter(Invoice.status == status)
    
    invoices = query.offset(skip).limit(limit).all()
    return invoices

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.created_by == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.created_by == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update invoice fields
    update_data = invoice_data.dict(exclude_unset=True)
    
    # Recalculate total if amount or tax_rate changed
    if "amount" in update_data or "tax_rate" in update_data:
        amount = update_data.get("amount", invoice.amount)
        tax_rate = update_data.get("tax_rate", invoice.tax_rate)
        tax_amount = amount * (tax_rate / 100)
        update_data["total_amount"] = amount + tax_amount
    
    for field, value in update_data.items():
        if field != "items":  # Handle items separately
            setattr(invoice, field, value)
    
    invoice.updated_at = datetime.utcnow()
    
    # Update items if provided
    if "items" in update_data and update_data["items"] is not None:
        # Remove existing items
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
        
        # Add new items
        for item in update_data["items"]:
            item_total = item.quantity * item.unit_price
            db_item = InvoiceItem(
                invoice_id=invoice.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item_total
            )
            db.add(db_item)
    
    db.commit()
    db.refresh(invoice)
    return invoice

@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.created_by == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Delete invoice items first
    db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
    
    # Delete invoice
    db.delete(invoice)
    db.commit()
    
    return {"message": "Invoice deleted successfully"}

@router.post("/{invoice_id}/mark-paid")
def mark_invoice_paid(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.created_by == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.status = "paid"
    invoice.paid_date = datetime.utcnow()
    invoice.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(invoice)
    
    return {"message": "Invoice marked as paid", "invoice": invoice}
