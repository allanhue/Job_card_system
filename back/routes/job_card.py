from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from db import get_db
from routes.auth import get_current_user, User, Invoice, JobCard, ZohoInvoice, Notification
from routes.send_mail import send_email
from datetime import timedelta
import os
import json
import uuid
import logging

logger = logging.getLogger(__name__)

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
    work_logs: list[dict] | None = None
    attachments: list[dict] | None = None
    voice_note_path: str | None = None
    assigned_user_id: int | None = None
    assigned_user_email: str | None = None
    assigned_user_name: str | None = None
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


MAX_PHOTO_BYTES = 10 * 1024 * 1024
MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
MAX_VOICE_BYTES = 25 * 1024 * 1024

ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_VOICE_TYPES = {"audio/mpeg", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4"}


def _save_uploads(
    files: list[UploadFile],
    folder: str,
    max_bytes: int,
    allowed_types: set[str],
) -> list[dict]:
    saved = []
    os.makedirs(folder, exist_ok=True)
    for f in files:
        if not f or not f.filename:
            continue
        if f.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Invalid file type: {f.filename}")
        ext = os.path.splitext(f.filename)[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(folder, filename)
        size = 0
        with open(path, "wb") as out_file:
            while True:
                chunk = f.file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    out_file.close()
                    os.remove(path)
                    raise HTTPException(status_code=400, detail=f"File too large: {f.filename}")
                out_file.write(chunk)
        saved.append({
            "filename": f.filename,
            "path": path.replace("\\", "/"),
            "content_type": f.content_type,
            "size": size,
        })
    return saved


@router.post("/invoice/{invoice_id}", response_model=JobCardResponse)
async def create_job_card(
    invoice_id: int,
    email: str | None = Form(None),
    status: str | None = Form(None),
    notes: str | None = Form(None),
    selected_items: str | None = Form(None),
    work_logs: str | None = Form(None),
    notify_email: bool | None = Form(True),
    assigned_user_id: str | None = Form(None),
    photos: list[UploadFile] = File(default_factory=list),
    documents: list[UploadFile] = File(default_factory=list),
    voice_note: UploadFile | None = File(None),
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

    selected_items_parsed = json.loads(selected_items) if selected_items else []
    work_logs_parsed = json.loads(work_logs) if work_logs else []

    total_selected_amount = 0.0
    if selected_items_parsed:
        for item in selected_items_parsed:
            rate = item.get("rate") or item.get("unit_price") or 0
            qty = item.get("quantity") or 1
            total_selected_amount += rate * qty

    job_card_number = generate_job_card_number(db)

    invoice_number = invoice.invoice_number if invoice else zoho_invoice.invoice_number
    client_name = invoice.client_name if invoice else zoho_invoice.client_name

    upload_base = os.path.join("back", "uploads", "job_cards", job_card_number)
    attachments = []
    attachments.extend(
        _save_uploads(photos, os.path.join(upload_base, "photos"), MAX_PHOTO_BYTES, ALLOWED_PHOTO_TYPES)
    )
    attachments.extend(
        _save_uploads(documents, os.path.join(upload_base, "documents"), MAX_DOCUMENT_BYTES, ALLOWED_DOCUMENT_TYPES)
    )

    voice_path = None
    if voice_note and voice_note.filename:
        if voice_note.content_type not in ALLOWED_VOICE_TYPES:
            raise HTTPException(status_code=400, detail="Invalid voice note type")
        voice_saved = _save_uploads(
            [voice_note],
            os.path.join(upload_base, "voice"),
            MAX_VOICE_BYTES,
            ALLOWED_VOICE_TYPES,
        )
        if voice_saved:
            voice_path = voice_saved[0]["path"]

    assigned_user = None
    if assigned_user_id:
        try:
            assigned_user = db.query(User).filter(User.id == int(assigned_user_id)).first()
        except Exception:
            assigned_user = None
    if not assigned_user and email:
        assigned_user = db.query(User).filter(User.email == email).first()

    job_card = JobCard(
        job_card_number=job_card_number,
        invoice_id=invoice.id if invoice else zoho_invoice.id,
        invoice_number=invoice_number,
        client_name=client_name,
        email=email,
        status=status or "pending",
        notes=notes,
        selected_items=selected_items_parsed,
        total_selected_amount=total_selected_amount,
        work_logs=work_logs_parsed,
        attachments=attachments,
        voice_note_path=voice_path,
        assigned_user_id=assigned_user.id if assigned_user else None,
        assigned_user_email=assigned_user.email if assigned_user else None,
        assigned_user_name=assigned_user.full_name if assigned_user else None,
        created_by=current_user.id,
    )

    db.add(job_card)
    db.commit()
    db.refresh(job_card)

    try:
        notification = Notification(
            title="Job card created",
            message=f"{job_card.job_card_number} for invoice {job_card.invoice_number}",
            category="job_card",
            link=f"/?page=invoices&openInvoice={job_card.invoice_id}",
            created_by=current_user.id,
            recipient_id=assigned_user.id if assigned_user else None,
            recipient_email=assigned_user.email if assigned_user else email,
        )
        db.add(notification)
        db.commit()
    except Exception:
        logger.exception("Failed to create notification")

    if email and (notify_email is None or notify_email):
        try:
            backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
            attachment_lines = ""
            if attachments:
                links = []
                for a in attachments:
                    link = a["path"].replace("back/", "")
                    links.append(f"<li>{a['filename']} - {backend_url}/{link}</li>")
                attachment_lines = f"<p><strong>Attachments:</strong></p><ul>{''.join(links)}</ul>"
            voice_line = ""
            if voice_path:
                voice_link = voice_path.replace("back/", "")
                voice_line = f"<p><strong>Voice Note:</strong> {backend_url}/{voice_link}</p>"
            subject = f"Job Card Created: {job_card.job_card_number}"
            body = (
                f"<p>Your job card has been created.</p>"
                f"<p><strong>Job Card:</strong> {job_card.job_card_number}</p>"
                f"<p><strong>Invoice:</strong> {job_card.invoice_number}</p>"
                f"<p><strong>Status:</strong> {job_card.status}</p>"
                f"{attachment_lines}{voice_line}"
            )
            await send_email([email], subject, body)
        except Exception as e:
            logger.exception("Failed to send job card email")

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
                "work_logs": jc.work_logs or [],
                "attachments": jc.attachments or [],
                "voice_note_path": jc.voice_note_path,
                "assigned_user_id": jc.assigned_user_id,
                "assigned_user_email": jc.assigned_user_email,
                "assigned_user_name": jc.assigned_user_name,
                "created_at": jc.created_at.isoformat() if jc.created_at else None,
            }
            for jc in job_cards
        ],
    }


@router.get("/stats")
def get_job_card_stats(
    days: int = 14,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if days < 1:
        days = 1

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)

    query = db.query(JobCard).filter(
        JobCard.created_by == current_user.id,
        JobCard.created_at >= datetime.combine(start_date, datetime.min.time())
    )
    if status:
        query = query.filter(JobCard.status == status)
    job_cards = query.all()

    date_cursor = start_date
    counts = {}
    while date_cursor <= end_date:
        counts[date_cursor.isoformat()] = 0
        date_cursor = date_cursor + timedelta(days=1)

    status_counts = {}
    total_hours = 0.0
    total_attachments = 0
    customer_counts = {}
    hours_by_date = {d: 0 for d in counts.keys()}
    for jc in job_cards:
        created_date = jc.created_at.date().isoformat()
        if jc.email:
            counts[created_date] = counts.get(created_date, 0) + 1
        status = (jc.status or "pending").lower()
        status_counts[status] = status_counts.get(status, 0) + 1
        if jc.work_logs:
            for log in jc.work_logs:
                try:
                    hours_val = float(log.get("hours", 0) or 0)
                    total_hours += hours_val
                    date_val = log.get("date")
                    if date_val and date_val in hours_by_date:
                        hours_by_date[date_val] += hours_val
                except Exception:
                    pass
        if jc.attachments:
            total_attachments += len(jc.attachments)
        customer_name = jc.client_name or "Unknown"
        customer_counts[customer_name] = customer_counts.get(customer_name, 0) + 1

    series = [{"date": d, "count": counts[d]} for d in sorted(counts.keys())]
    hours_series = [{"date": d, "hours": round(hours_by_date[d], 2)} for d in sorted(hours_by_date.keys())]
    top_customers = [
        {"name": name, "count": count}
        for name, count in sorted(customer_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    return {
        "success": True,
        "data": {
            "series": series,
            "hours_series": hours_series,
            "status_counts": status_counts,
            "total_jobs": len(job_cards),
            "total_hours": round(total_hours, 2),
            "total_attachments": total_attachments,
            "top_customers": top_customers,
        }
    }
