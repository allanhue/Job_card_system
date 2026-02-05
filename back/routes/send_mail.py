import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

load_dotenv()

router = APIRouter(prefix="/mail", tags=["Mail"])

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT") or 587),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

class MailRequest(BaseModel):
    email: EmailStr
    subject: str | None = None
    body: str | None = None


async def send_email(recipients: list[str], subject: str, body: str):
    try:
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=body,
            subtype="html"
        )
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")


@router.post("/send-confirmation")
async def send_confirmation(payload: MailRequest):
    subject = payload.subject or "Job Card Confirmation"
    body = payload.body or "Your job card request has been received."
    await send_email([payload.email], subject, body)
    return {"message": "Email sent successfully"}
