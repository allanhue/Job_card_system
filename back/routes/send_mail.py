import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import requests

load_dotenv()

router = APIRouter(prefix="/mail", tags=["Mail"])

# mail password is the api key 
BREVO_API_KEY = os.getenv("MAIL_PASSWORD") or os.getenv("BREVO_API_KEY") or os.getenv("SENDINBLUE_API_KEY")
MAIL_FROM = os.getenv("MAIL_FROM")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Job Card System")
SMS_SENDER = os.getenv("SMS_SENDER", "JobCard")

class MailRequest(BaseModel):
    email: EmailStr
    subject: str | None = None
    body: str | None = None


class SmsRequest(BaseModel):
    phone: str
    text: str
    tag: str | None = None
    sms_type: str | None = "transactional"


async def send_email(recipients: list[str], subject: str, body: str):
    if not BREVO_API_KEY:
        raise HTTPException(status_code=500, detail="MAIL_PASSWORD (Brevo API key) not set")
    if not MAIL_FROM:
        raise HTTPException(status_code=500, detail="MAIL_FROM not set")
    if not recipients:
        raise HTTPException(status_code=400, detail="No recipients provided")

    payload = {
        "sender": {"name": MAIL_FROM_NAME, "email": MAIL_FROM},
        "to": [{"email": r} for r in recipients],
        "subject": subject,
        "htmlContent": body,
    }

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=500, detail=f"Email failed: {response.text}")
        return True
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")


async def send_sms(phone: str, text: str, tag: str | None = None, sms_type: str | None = "transactional"):
    if not BREVO_API_KEY:
        raise HTTPException(status_code=500, detail="MAIL_PASSWORD (Brevo API key) not set")
    payload = {
        "sender": SMS_SENDER,
        "recipient": phone,
        "content": text,
        "type": sms_type or "transactional",
    }
    if tag:
        payload["tag"] = tag

    try:
        response = requests.post(
            "https://api.brevo.com/v3/transactionalSMS/send",
            headers={
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=500, detail=f"SMS failed: {response.text}")
        return True
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"SMS failed: {str(e)}")


@router.post("/send-confirmation")
async def send_confirmation(payload: MailRequest):
    subject = payload.subject or "Job Card Confirmation"
    body = payload.body or "Your job card request has been received."
    await send_email([payload.email], subject, body)
    return {"message": "Email sent successfully"}


@router.post("/send-sms")
async def send_sms_route(payload: SmsRequest):
    await send_sms(payload.phone, payload.text, payload.tag, payload.sms_type)
    return {"message": "SMS sent successfully"}
