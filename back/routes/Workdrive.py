from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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
    email: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None


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

SCANNED_FOLDER_ID = os.getenv("ZOHO_WORDRIVE_SCANNED_FOLDER_ID", "0mqdi73cabe780dcf49adb599e8e650cf893e")



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


def fetch_books_invoices(currency_code: str, date_from: Optional[str], date_to: Optional[str]) -> list:
    access_token = get_valid_access_token(ZOHO_BOOKS_2_CONFIG, books2_token_manager)
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    params = {"organization_id": ZOHO_BOOKS_2_CONFIG.get("organization_id")}
    if currency_code:
        params["currency_code"] = currency_code
    if date_from:
        params["date_start"] = date_from
    if date_to:
        params["date_end"] = date_to

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
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError:
            logger.error("Books API error %s: %s", response.status_code, response.text)
            raise
        data = response.json()
        if data.get("code") not in [0, None]:
            raise HTTPException(
                status_code=500,
                detail=f"Books error: {data.get('message') or response.text}",
            )
        return data.get("invoices", [])
    except requests.exceptions.RequestException as e:
        logger.error("Books API request failed: %s", str(e))
        detail = f"Books API request failed: {str(e)}"
        if hasattr(e, "response") and e.response is not None:
            detail = f"Books API request failed: {e.response.status_code} {e.response.text}"
        raise HTTPException(status_code=500, detail=detail)


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
        try:
            folder_response.raise_for_status()
        except requests.exceptions.HTTPError:
            logger.error("WorkDrive folder error %s: %s", folder_response.status_code, folder_response.text)
            raise
        folder_data = folder_response.json()
    except requests.exceptions.RequestException as e:
        logger.error("WorkDrive folder request failed: %s", str(e))
        detail = f"WorkDrive request failed: {str(e)}"
        if hasattr(e, "response") and e.response is not None:
            detail = f"WorkDrive request failed: {e.response.status_code} {e.response.text}"
        raise HTTPException(status_code=500, detail=detail)

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
        try:
            files_response.raise_for_status()
        except requests.exceptions.HTTPError:
            logger.error("WorkDrive files error %s: %s", files_response.status_code, files_response.text)
            raise
        files_data = files_response.json().get("data", [])
    except requests.exceptions.RequestException as e:
        logger.error("WorkDrive files request failed: %s", str(e))
        detail = f"WorkDrive files request failed: {str(e)}"
        if hasattr(e, "response") and e.response is not None:
            detail = f"WorkDrive files request failed: {e.response.status_code} {e.response.text}"
        raise HTTPException(status_code=500, detail=detail)

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
    recipient_email = (payload.email or "").strip()
    date_from = payload.date_from or ""
    date_to = payload.date_to or ""

    api_currency_code = normalize_currency(selected_currency)
    logger.info("Currency: %s", selected_currency)
    logger.info("Statuses: %s", selected_statuses)
    logger.info("API Currency Code: %s", api_currency_code)

    if not ZOHO_BOOKS_2_CONFIG.get("organization_id"):
        raise HTTPException(status_code=400, detail="ZOHO_BOOKS_ORGANIZATION_ID not set")

    all_invoices = fetch_books_invoices(api_currency_code, date_from, date_to)

    invoice_numbers = []
    for inv in all_invoices:
        inv_status = inv.get("status")
        inv_number = inv.get("invoice_number")
        inv_currency = inv.get("currency_code")

        if api_currency_code and inv_currency != api_currency_code:
            continue
        if (date_from or date_to) and inv.get("date"):
            try:
                inv_date = datetime.strptime(inv.get("date"), "%Y-%m-%d").date()
                if date_from:
                    start_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                    if inv_date < start_date:
                        continue
                if date_to:
                    end_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                    if inv_date > end_date:
                        continue
            except ValueError:
                pass

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
    missing_list_text = "None"
    if missing_count > 0:
        missing_list_text = ", ".join(missing_list[:20])
        if missing_count > 20:
            missing_list_text = f"{missing_list_text}... +{missing_count - 20}"

    if file_invoice_numbers and recipient_email:
        range_label = ""
        if date_from or date_to:
            range_label = f"{date_from or '...'} to {date_to or '...'}"
        email_subject = f"Twatitara ETR Parser Check - {selected_statuses} ({api_currency_code})"
        parts = [
            "<html><body style='font-family: Arial; background: #f6f8fb; padding: 16px;'>",
            "<div style='max-width: 700px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;'>",
            "<div style='background: linear-gradient(90deg, #1d4ed8, #0ea5e9); color: white; padding: 20px;'>",
            "<h2 style='margin: 0; font-size: 20px;'>ETR WorkDrive Report</h2>",
            f"<p style='margin: 6px 0 0; font-size: 12px;'>Generated {datetime.now().strftime('%d-%b-%Y %H:%M')}</p>",
            "</div>",
            "<div style='padding: 20px;'>",
            f"<p style='margin: 0 0 6px;'><strong>Filter:</strong> {selected_statuses} ({api_currency_code or 'ALL'})</p>",
        ]
        if range_label:
            parts.append(
                f"<p style='margin: 0 0 12px;'><strong>Date range:</strong> {range_label}</p>"
            )
        parts.extend(
            [
                "<div style='display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;'>",
                f"<div style='flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;'><div style='font-size: 12px; color: #64748b;'>Books Invoices</div><div style='font-size: 18px; font-weight: 700;'>{len(invoice_numbers)}</div></div>",
                f"<div style='flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;'><div style='font-size: 12px; color: #64748b;'>WorkDrive Files</div><div style='font-size: 18px; font-weight: 700;'>{len(file_invoice_numbers)}</div></div>",
                f"<div style='flex: 1; min-width: 140px; background: #ecfdf5; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px;'><div style='font-size: 12px; color: #166534;'>Matched</div><div style='font-size: 18px; font-weight: 700; color: #166534;'>{matched_count}</div></div>",
                f"<div style='flex: 1; min-width: 140px; background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px;'><div style='font-size: 12px; color: #991b1b;'>Missing</div><div style='font-size: 18px; font-weight: 700; color: #991b1b;'>{missing_count}</div></div>",
                "</div>",
                "<h3 style='margin: 0 0 8px; font-size: 16px;'>Missing Invoices</h3>",
            ]
        )
        if missing_count > 0:
            missing_items = "".join(
                [f"<li style='margin: 2px 0;'>{inv}</li>" for inv in missing_list[:40]]
            )
            if missing_count > 40:
                missing_items += "<li>... more omitted</li>"
            parts.append(f"<ul style='padding-left: 18px; margin: 0;'>{missing_items}</ul>")
        else:
            parts.append("<p style='margin: 0; color: #16a34a;'>None</p>")
        parts.extend(
            [
                "</div>",
                "<div style='padding: 12px 20px; background: #f8fafc; font-size: 11px; color: #94a3b8;'>Auto-generated ETR report</div>",
                "</div>",
                "</body></html>",
            ]
        )
        email_message = "".join(parts)
        try:
            await send_email([recipient_email], email_subject, email_message)
            email_sent = True
        except Exception:
            logger.exception("Failed to send WorkDrive report email")

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
        "date_from": date_from,
        "date_to": date_to,
    }
