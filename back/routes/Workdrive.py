from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from dotenv import load_dotenv
import requests
import logging
import os
from routes.send_mail import send_email

load_dotenv()

router = APIRouter(prefix="/zoho_wordrive/workdrive", tags=["workdrive"])

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class WorkdriveCheckRequest(BaseModel):
    currency: Optional[str] = None
    statuses: Optional[List[str]] = None
    email: Optional[EmailStr] = None


class TokenManager:
    def __init__(self):
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None

    def is_token_valid(self) -> bool:
        if not self.access_token or not self.token_expiry:
            return False
        return datetime.now() < self.token_expiry

    def set_token(self, access_token: str, expires_in: int = 3600):
        self.access_token = access_token
        self.token_expiry = datetime.now() + timedelta(seconds=expires_in - 300)
        logger.info("Token updated. Expires at: %s", self.token_expiry)


wordrive_token_manager = TokenManager()
books2_token_manager = TokenManager()

ZOHO_WORDRIVE_CONFIG = {
    "client_id": os.getenv("ZOHO_WORDRIVE_CLIENT_ID"),
    "client_secret": os.getenv("ZOHO_WORDRIVE_CLIENT_SECRET"),
    "refresh_token": os.getenv("ZOHO_WORDRIVE_REFRESH_TOKEN"),
    "redirect_uri": os.getenv("ZOHO_WORDRIVE_REDIRECT_URI"),
    "organization_id": os.getenv("ZOHO_WORDRIVE_ORGANIZATION_ID"),
}
ZOHO_BOOKS_2_CONFIG = {
    "client_id": os.getenv("ZOHO_BOOKS_CLIENT_ID"),
    "client_secret": os.getenv("ZOHO_BOOKS_CLIENT_SECRET"),
    "refresh_token": os.getenv("ZOHO_BOOKS_REFRESH_TOKEN"),
    "redirect_uri": os.getenv("ZOHO_BOOKS_REDIRECT_URI"),
    "organization_id": os.getenv("ZOHO_BOOKS_ORGANIZATION_ID"),
}

SCANNED_FOLDER_ID = os.getenv("ZOHO_WORDRIVE_SCANNED_FOLDER_ID")


def get_new_access_token(config: dict, manager: TokenManager) -> str:
    url = "https://accounts.zoho.com/oauth/v2/token"
    params = {
        "client_id": config.get("client_id"),
        "client_secret": config.get("client_secret"),
        "refresh_token": config.get("refresh_token"),
        "grant_type": "refresh_token",
    }
    try:
        response = requests.post(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        access_token = data.get("access_token")
        if not access_token:
            logger.error("No access token in response: %s", data)
            raise HTTPException(status_code=500, detail="Failed to get access token")
        manager.set_token(access_token, data.get("expires_in", 3600))
        return access_token
    except requests.exceptions.RequestException as e:
        logger.error("Token request failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Token request failed: {str(e)}")


def get_valid_access_token(config: dict, manager: TokenManager) -> str:
    if manager.is_token_valid():
        return manager.access_token
    return get_new_access_token(config, manager)


def normalize_currency(selected_currency: Optional[str]) -> str:
    if not selected_currency:
        return ""
    selected_cur_lower = selected_currency.lower()
    if selected_cur_lower in ["ksh", "kenyan shillings"]:
        return "KES"
    if selected_cur_lower in ["dollars", "usd"]:
        return "USD"
    return selected_currency.upper()


def fetch_books_invoices(currency_code: str) -> list:
    access_token = get_valid_access_token(ZOHO_BOOKS_2_CONFIG, books2_token_manager)
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    params = {"organization_id": ZOHO_BOOKS_2_CONFIG.get("organization_id")}
    if currency_code:
        params["currency_code"] = currency_code

    try:
        response = requests.get(
            "https://www.zohoapis.com/books/v3/invoices",
            headers=headers,
            params=params,
            timeout=30,
        )
        if response.status_code == 401:
            access_token = get_new_access_token(ZOHO_BOOKS_2_CONFIG, books2_token_manager)
            headers["Authorization"] = f"Zoho-oauthtoken {access_token}"
            response = requests.get(
                "https://www.zohoapis.com/books/v3/invoices",
                headers=headers,
                params=params,
                timeout=30,
            )
        response.raise_for_status()
        data = response.json()
        if data.get("code") not in [0, None]:
            raise HTTPException(status_code=500, detail=f"Books error: {data.get('message')}")
        return data.get("invoices", [])
    except requests.exceptions.RequestException as e:
        logger.error("Books API request failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Books API request failed: {str(e)}")


def fetch_workdrive_invoice_numbers(folder_id: str) -> list:
    access_token = get_valid_access_token(ZOHO_WORDRIVE_CONFIG, wordrive_token_manager)
    headers = {
        "Accept": "application/vnd.api+json",
        "Authorization": f"Zoho-oauthtoken {access_token}",
    }

    folder_info_url = f"https://www.zohoapis.com/workdrive/api/v1/files/{folder_id}"
    try:
        folder_response = requests.get(folder_info_url, headers=headers, timeout=20)
        if folder_response.status_code == 401:
            access_token = get_new_access_token(ZOHO_WORDRIVE_CONFIG, wordrive_token_manager)
            headers["Authorization"] = f"Zoho-oauthtoken {access_token}"
            folder_response = requests.get(folder_info_url, headers=headers, timeout=20)
        folder_response.raise_for_status()
        folder_data = folder_response.json()
    except requests.exceptions.RequestException as e:
        logger.error("WorkDrive folder request failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"WorkDrive request failed: {str(e)}")

    errors = folder_data.get("errors")
    if errors:
        logger.error("WorkDrive API errors: %s", errors)
        raise HTTPException(status_code=500, detail="WorkDrive API error")

    related_url = (
        folder_data.get("data", {})
        .get("relationships", {})
        .get("files", {})
        .get("links", {})
        .get("related")
    )
    if not related_url:
        return []

    try:
        files_response = requests.get(related_url, headers=headers, timeout=20)
        files_response.raise_for_status()
        files_data = files_response.json().get("data", [])
    except requests.exceptions.RequestException as e:
        logger.error("WorkDrive files request failed: %s", str(e))
        raise HTTPException(status_code=500, detail=f"WorkDrive files request failed: {str(e)}")

    invoice_numbers = []
    for item in files_data:
        attributes = item.get("attributes") or {}
        file_name = attributes.get("name") or ""
        is_folder = attributes.get("is_folder")
        if is_folder:
            continue
        upper_name = file_name.upper()
        start_index = upper_name.find("INV")
        if start_index == -1:
            continue
        end_index = upper_name.find(".", start_index)
        if end_index == -1:
            end_index = len(file_name)
        inv_no = file_name[start_index:end_index].strip()
        if inv_no:
            invoice_numbers.append(inv_no)
    return invoice_numbers


@router.post("/check-invoices")
async def check_invoices(payload: WorkdriveCheckRequest):
    selected_currency = payload.currency or ""
    selected_statuses = payload.statuses or []
    recipient_email = payload.email

    api_currency_code = normalize_currency(selected_currency)
    logger.info("Currency: %s", selected_currency)
    logger.info("Statuses: %s", selected_statuses)
    logger.info("API Currency Code: %s", api_currency_code)

    if not ZOHO_BOOKS_2_CONFIG.get("organization_id"):
        raise HTTPException(status_code=400, detail="ZOHO_BOOKS_ORGANIZATION_ID not set")

    all_invoices = fetch_books_invoices(api_currency_code)

    invoice_numbers = []
    for inv in all_invoices:
        inv_status = inv.get("status")
        inv_number = inv.get("invoice_number")
        inv_currency = inv.get("currency_code")

        if api_currency_code and inv_currency != api_currency_code:
            continue

        if not selected_statuses:
            invoice_numbers.append(inv_number)
            continue

        should_include = False
        for status in selected_statuses:
            status_lower = status.lower()
            if status_lower == "paid" and inv_status == "paid":
                should_include = True
            elif status_lower == "overdue" and inv_status == "overdue":
                should_include = True
            elif status_lower == "unpaid" and inv_status in ["sent", "unpaid"]:
                should_include = True

        if should_include:
            invoice_numbers.append(inv_number)

    file_invoice_numbers = fetch_workdrive_invoice_numbers(SCANNED_FOLDER_ID)

    matched_count = 0
    missing_count = 0
    missing_list = []
    for book_inv in invoice_numbers:
        if book_inv in file_invoice_numbers:
            matched_count += 1
        else:
            missing_count += 1
            missing_list.append(book_inv)

    email_sent = False
    missing_list_text = "None ✓"
    if missing_count > 0:
        missing_list_text = ", ".join(missing_list[:20])
        if missing_count > 20:
            missing_list_text = f"{missing_list_text}... +{missing_count - 20}"

    if file_invoice_numbers and recipient_email:
        email_subject = f"Twatitara ETR Parser Check - {selected_statuses} ({api_currency_code})"
        email_message = (
            "<html><body style='font-family: Arial;'>"
            "<h2 style='color: #2c5aa0;'>ETR Report</h2>"
            f"<p><strong>Date:</strong> {datetime.now().strftime('%d-%b-%Y')}</p>"
            f"<p><strong>Filter:</strong> {selected_statuses} ({api_currency_code})</p>"
            "<hr>"
            "<table style='border-collapse: collapse; width: 100%;'>"
            f"<tr><td style='padding: 8px; border: 1px solid #ddd;'>Books Invoices</td>"
            f"<td style='padding: 8px; border: 1px solid #ddd;'>{len(invoice_numbers)}</td></tr>"
            f"<tr><td style='padding: 8px; border: 1px solid #ddd;'>WorkDrive Files</td>"
            f"<td style='padding: 8px; border: 1px solid #ddd;'>{len(file_invoice_numbers)}</td></tr>"
            "<tr style='background: #d4edda;'>"
            f"<td style='padding: 8px; border: 1px solid #ddd;'><strong>✓ Matched</strong></td>"
            f"<td style='padding: 8px; border: 1px solid #ddd;'><strong>{matched_count}</strong></td></tr>"
            "<tr style='background: #f8d7da;'>"
            f"<td style='padding: 8px; border: 1px solid #ddd;'><strong>✗ Missing</strong></td>"
            f"<td style='padding: 8px; border: 1px solid #ddd;'><strong>{missing_count}</strong></td></tr>"
            "</table>"
            "<h3>Missing:</h3>"
            f"<p>{missing_list_text}</p>"
            "<hr>"
            "<p style='color: #999; font-size: 11px;'>Auto-generated</p>"
            "</body></html>"
        )
        await send_email([recipient_email], email_subject, email_message)
        email_sent = True

    return {
        "success": True,
        "currency": api_currency_code,
        "statuses": selected_statuses,
        "books_invoices": len(invoice_numbers),
        "workdrive_files": len(file_invoice_numbers),
        "matched": matched_count,
        "missing": missing_count,
        "missing_list": missing_list,
        "email_sent": email_sent,
    }

