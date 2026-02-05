from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from db import get_db
from routes.auth import get_current_user, User, Invoice, JobCard, ZohoInvoice
from routes.send_mail import send_email
from datetime import timedelta

router = APIRouter(prefix="/job-cards", tags=["JobCards"])

class JobCardCreate(BaseModel):
    email: str | None = None
    status: str | None = None
    notes: str | None = None
    selected_items: list[dict] = []
    notify_email: bool | None = True

class JobCardResponse(BaseModel):
    id: int
    job_card_number: str
    invoice_id: int
    invoice_number: str
    client_name: str
    email: str | None
    status: str
    notes: str | None
    selected_items: list[dict] | None
    total_selected_amount: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def generate_job_card_number(db: Session) -> str:
    """Generate unique job card number"""
    year = datetime.now().year
    month = datetime.now().month
    count = db.query(JobCard).filter(
        JobCard.created_at >= datetime(year, month, 1),
        JobCard.created_at < datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    ).count()
    return f"JC-{year}-{month:02d}-{count + 1:04d}"


@router.post("/invoice/{invoice_id}", response_model=JobCardResponse)
async def create_job_card(
    invoice_id: int,
    job_card_data: JobCardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    normalized_id = abs(invoice_id) if invoice_id < 0 else invoice_id

    invoice = db.query(Invoice).filter(
        Invoice.id == normalized_id,
        Invoice.created_by == current_user.id
    ).first()

    zoho_invoice = None
    if not invoice:
        zoho_invoice = db.query(ZohoInvoice).filter(ZohoInvoice.id == normalized_id).first()

    if not invoice and not zoho_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    total_selected_amount = 0.0
    if job_card_data.selected_items:
        for item in job_card_data.selected_items:
            rate = item.get("rate") or item.get("unit_price") or 0
            qty = item.get("quantity") or 1
            total_selected_amount += rate * qty

    job_card_number = generate_job_card_number(db)

    invoice_number = invoice.invoice_number if invoice else zoho_invoice.invoice_number
    client_name = invoice.client_name if invoice else zoho_invoice.client_name

    job_card = JobCard(
        job_card_number=job_card_number,
        invoice_id=invoice.id if invoice else zoho_invoice.id,
        invoice_number=invoice_number,
        client_name=client_name,
        email=job_card_data.email,
        status=job_card_data.status or "pending",
        notes=job_card_data.notes,
        selected_items=job_card_data.selected_items,
        total_selected_amount=total_selected_amount,
        created_by=current_user.id,
    )

    db.add(job_card)
    db.commit()
    db.refresh(job_card)

    if job_card_data.email and (job_card_data.notify_email is None or job_card_data.notify_email):
        subject = f"Job Card Created: {job_card.job_card_number}"
        body = (
            f"<p>Your job card has been created.</p>"
            f"<p><strong>Job Card:</strong> {job_card.job_card_number}</p>"
            f"<p><strong>Invoice:</strong> {job_card.invoice_number}</p>"
            f"<p><strong>Status:</strong> {job_card.status}</p>"
        )
        await send_email([job_card_data.email], subject, body)

    return job_card


@router.get("/recent")
def get_recent_job_cards(
    limit: int = 6,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job_cards = (
        db.query(JobCard)
        .filter(JobCard.created_by == current_user.id)
        .order_by(JobCard.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "success": True,
        "data": [
            {
                "id": jc.id,
                "job_card_number": jc.job_card_number,
                "invoice_number": jc.invoice_number,
                "client_name": jc.client_name,
                "email": jc.email,
                "status": jc.status,
                "total_selected_amount": jc.total_selected_amount,
                "created_at": jc.created_at.isoformat() if jc.created_at else None,
            }
            for jc in job_cards
        ],
    }


@router.get("/stats")
def get_job_card_stats(
    days: int = 14,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if days < 1:
        days = 1

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)

    job_cards = db.query(JobCard).filter(
        JobCard.created_by == current_user.id,
        JobCard.created_at >= datetime.combine(start_date, datetime.min.time())
    ).all()

    date_cursor = start_date
    counts = {}
    while date_cursor <= end_date:
        counts[date_cursor.isoformat()] = 0
        date_cursor = date_cursor + timedelta(days=1)

    status_counts = {}
    for jc in job_cards:
        created_date = jc.created_at.date().isoformat()
        if jc.email:
            counts[created_date] = counts.get(created_date, 0) + 1
        status = (jc.status or "pending").lower()
        status_counts[status] = status_counts.get(status, 0) + 1

    series = [{"date": d, "count": counts[d]} for d in sorted(counts.keys())]

    return {
        "success": True,
        "data": {
            "series": series,
            "status_counts": status_counts,
        }
    }
