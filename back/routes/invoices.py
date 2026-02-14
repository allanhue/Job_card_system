# routes/invoices.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from db import get_db
from routes.auth import get_current_user, User, Invoice, InvoiceItem, ZohoInvoice

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

@router.get("/analytics/overview")
def get_invoice_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoices = db.query(Invoice).filter(Invoice.created_by == current_user.id).all()
    zoho_invoices = db.query(ZohoInvoice).filter(
        (ZohoInvoice.created_by == current_user.id) | (ZohoInvoice.created_by.is_(None))
    ).all()

    combined = []
    combined.extend(invoices)
    combined.extend(zoho_invoices)

    total_invoices = len(combined)
    total_revenue = sum(inv.total_amount for inv in combined)
    total_outstanding = sum(
        (inv.balance if hasattr(inv, "balance") and inv.balance is not None else inv.total_amount)
        for inv in combined
        if inv.status != "paid"
    )

    status_counts = {}
    for inv in combined:
        status = inv.status or "unknown"
        status_counts[status] = status_counts.get(status, 0) + 1

    overdue_invoices = [inv for inv in combined if inv.status == "overdue"]

    recent_invoices = sorted(
        combined,
        key=lambda x: x.issue_date or datetime.min,
        reverse=True
    )[:5]

    return {
        "success": True,
        "data": {
            "total_invoices": total_invoices,
            "total_revenue": total_revenue,
            "total_outstanding": total_outstanding,
            "paid_count": status_counts.get("paid", 0),
            "unpaid_count": status_counts.get("sent", 0) + status_counts.get("unpaid", 0) + status_counts.get("pending", 0),
            "overdue_count": len(overdue_invoices),
            "status_breakdown": status_counts,
            "recent_invoices": [
                {
                    "id": -inv.id if isinstance(inv, ZohoInvoice) else inv.id,
                    "invoice_number": inv.invoice_number,
                    "client_name": inv.client_name,
                    "status": inv.status,
                    "total_amount": inv.total_amount,
                    "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
                    "due_date": inv.due_date.isoformat() if inv.due_date else None,
                }
                for inv in recent_invoices
            ],
            "overdue_invoices": [
                {
                    "id": -inv.id if isinstance(inv, ZohoInvoice) else inv.id,
                    "invoice_number": inv.invoice_number,
                    "client_name": inv.client_name,
                    "status": inv.status,
                    "total_amount": inv.total_amount,
                    "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
                    "due_date": inv.due_date.isoformat() if inv.due_date else None,
                }
                for inv in overdue_invoices[:5]
            ],
        }
    }

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

    invoices = query.all()

    zoho_query = db.query(ZohoInvoice).filter(
        (ZohoInvoice.created_by == current_user.id) | (ZohoInvoice.created_by.is_(None))
    )
    if status:
        zoho_query = zoho_query.filter(ZohoInvoice.status == status)
    zoho_invoices = zoho_query.all()

    combined = []
    combined.extend(invoices)
    combined.extend([
        {
            "id": -zi.id,
            "invoice_number": zi.invoice_number,
            "client_name": zi.client_name,
            "client_email": zi.client_email,
            "client_address": zi.client_address,
            "client_phone": zi.client_phone,
            "title": zi.title or "Zoho Invoice",
            "description": zi.description,
            "amount": zi.amount,
            "tax_rate": zi.tax_rate,
            "total_amount": zi.total_amount,
            "status": zi.status,
            "issue_date": zi.issue_date,
            "due_date": zi.due_date,
            "paid_date": zi.paid_date,
            "created_by": zi.created_by or current_user.id,
            "created_at": zi.created_at,
            "updated_at": zi.updated_at,
            "items": [],
        }
        for zi in zoho_invoices
    ])

    combined.sort(
        key=lambda x: x.issue_date if hasattr(x, "issue_date") else x.get("issue_date"),
        reverse=True
    )
    paged = combined[skip: skip + limit]
    return paged

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

    if invoice_id < 0:
        invoice = None

    if invoice:
        return invoice

    zoho_id = abs(invoice_id) if invoice_id < 0 else invoice_id
    zoho = db.query(ZohoInvoice).filter(ZohoInvoice.id == zoho_id).first()
    if not zoho:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "id": zoho.id,
        "invoice_number": zoho.invoice_number,
        "client_name": zoho.client_name,
        "client_email": zoho.client_email,
        "client_address": zoho.client_address,
        "client_phone": zoho.client_phone,
        "title": zoho.title or "Zoho Invoice",
        "description": zoho.description,
        "amount": zoho.amount,
        "tax_rate": zoho.tax_rate,
        "total_amount": zoho.total_amount,
        "status": zoho.status,
        "issue_date": zoho.issue_date,
        "due_date": zoho.due_date,
        "paid_date": zoho.paid_date,
        "created_by": zoho.created_by or current_user.id,
        "created_at": zoho.created_at,
        "updated_at": zoho.updated_at,
        "items": [],
    }

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
 