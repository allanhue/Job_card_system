import os
from functools import partial
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, EmailStr
import requests

load_dotenv()

router = APIRouter(prefix="/mail", tags=["Mail"])

MAIL_FROM = os.getenv("MAIL_FROM")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Job Card System")
SMS_SENDER = os.getenv("SMS_SENDER", "JobCard")


def _get_brevo_api_key() -> str | None:
    # Prefer explicit API key variables first; MAIL_PASSWORD may be SMTP password in some deployments.
    return (
        os.getenv("BREVO_API_KEY")
        or os.getenv("SENDINBLUE_API_KEY")
        or os.getenv("MAIL_PASSWORD")
    )


def _assert_brevo_api_key() -> str:
    api_key = _get_brevo_api_key()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Brevo key not set. Use BREVO_API_KEY (preferred) or SENDINBLUE_API_KEY.",
        )
    return api_key

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
    brevo_api_key = _assert_brevo_api_key()
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
        response = await run_in_threadpool(
            partial(
                requests.post,
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_api_key,
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                json=payload,
                timeout=15,
            )
        )
        if response.status_code >= 400:
            detail = response.text[:500] if response.text else "Unknown Brevo error"
            raise HTTPException(
                status_code=502,
                detail=f"Brevo email failed ({response.status_code}): {detail}",
            )
        return True
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")


async def send_sms(phone: str, text: str, tag: str | None = None, sms_type: str | None = "transactional"):
    brevo_api_key = _assert_brevo_api_key()
    payload = {
        "sender": SMS_SENDER,
        "recipient": phone,
        "content": text,
        "type": sms_type or "transactional",
    }
    if tag:
        payload["tag"] = tag

    try:
        response = await run_in_threadpool(
            partial(
                requests.post,
                "https://api.brevo.com/v3/transactionalSMS/send",
                headers={
                    "api-key": brevo_api_key,
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                json=payload,
                timeout=15,
            )
        )
        if response.status_code >= 400:
            detail = response.text[:500] if response.text else "Unknown Brevo error"
            raise HTTPException(
                status_code=502,
                detail=f"Brevo SMS failed ({response.status_code}): {detail}",
            )
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
