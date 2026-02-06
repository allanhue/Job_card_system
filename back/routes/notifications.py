from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from db import get_db
from routes.auth import get_current_admin_user, get_current_user, User, Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])
logger = logging.getLogger(__name__)


class NotificationCreate(BaseModel):
    title: str
    message: str
    category: str | None = None
    link: str | None = None
    recipient_id: int | None = None
    recipient_email: str | None = None
    recipient_ids: list[int] | None = None
    recipient_emails: list[str] | None = None


@router.post("/")
def create_notification(
    payload: NotificationCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    try:
        created_ids = []
        recipients = []
        if payload.recipient_id:
            recipients.append({"id": payload.recipient_id, "email": None})
        if payload.recipient_email:
            recipients.append({"id": None, "email": payload.recipient_email})
        if payload.recipient_ids:
            for rid in payload.recipient_ids:
                recipients.append({"id": rid, "email": None})
        if payload.recipient_emails:
            for remail in payload.recipient_emails:
                recipients.append({"id": None, "email": remail})

        if not recipients:
            recipients = [{"id": None, "email": None}]

        for rec in recipients:
            notification = Notification(
                title=payload.title,
                message=payload.message,
                category=payload.category,
                link=payload.link,
                created_by=current_user.id,
                recipient_id=rec["id"],
                recipient_email=rec["email"],
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)
            created_ids.append(notification.id)

        return {"success": True, "ids": created_ids}
    except Exception:
        logger.exception("Failed to create notification")
        raise HTTPException(status_code=500, detail="Failed to create notification")


@router.get("/")
def list_notifications(
    limit: int = 10,
    unread_only: bool = False,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    try:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        db.query(Notification).filter(Notification.created_at < cutoff).delete(synchronize_session=False)
        db.commit()
        query = db.query(Notification)
        if unread_only:
            query = query.filter(Notification.read_at.is_(None))
        notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
        return {
            "success": True,
            "data": [
                {
                    "id": n.id,
                    "title": n.title,
                    "message": n.message,
                    "category": n.category,
                    "link": n.link,
                    "created_at": n.created_at.isoformat() if n.created_at else None,
                    "read_at": n.read_at.isoformat() if n.read_at else None,
                }
                for n in notifications
            ],
        }
    except Exception:
        logger.exception("Failed to list notifications")
        return {"success": False, "data": []}


@router.get("/me")
def list_my_notifications(
    limit: int = 10,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        db.query(Notification).filter(Notification.created_at < cutoff).delete(synchronize_session=False)
        db.commit()
        query = db.query(Notification).filter(
            (Notification.recipient_id == current_user.id)
            | (Notification.recipient_email == current_user.email)
        )
        if unread_only:
            query = query.filter(Notification.read_at.is_(None))
        notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
        return {
            "success": True,
            "data": [
                {
                    "id": n.id,
                    "title": n.title,
                    "message": n.message,
                    "category": n.category,
                    "link": n.link,
                    "created_at": n.created_at.isoformat() if n.created_at else None,
                    "read_at": n.read_at.isoformat() if n.read_at else None,
                }
                for n in notifications
            ],
        }
    except Exception:
        logger.exception("Failed to list user notifications")
        return {"success": False, "data": []}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                (Notification.recipient_id == current_user.id)
                | (Notification.recipient_email == current_user.email)
                | (Notification.created_by == current_user.id),
            )
            .first()
        )
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        notification.read_at = datetime.utcnow()
        db.commit()
        return {"success": True}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to mark notification read")
        raise HTTPException(status_code=500, detail="Failed to mark notification read")
