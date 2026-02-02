from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from dotenv import load_dotenv
import requests
import logging
import os

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/zoho_books/books", tags=["books"])

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic Models
class BookToken(BaseModel):
    customer_name: Optional[str] = None
    invoice_number: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None

class JobCardApplication(BaseModel):
    email: str
    invoice_id: str
    selected_items: List[dict]
    notes: Optional[str] = None

# Token Manager
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
        logger.info(f"Token updated. Expires at: {self.token_expiry}")

token_manager = TokenManager()

# Configuration from environment variables
ZOHO_CONFIG = {
    "client_id": os.getenv("ZOHO_CLIENT_ID"),
    "client_secret": os.getenv("ZOHO_CLIENT_SECRET"),
    "refresh_token": os.getenv("ZOHO_REFRESH_TOKEN"),
    "redirect_uri": os.getenv("ZOHO_REDIRECT_URI"),
    "organization_id": os.getenv("ZOHO_ORGANIZATION_ID")
}

# Validate required environment variables
required_vars = ["client_id", "client_secret", "refresh_token"]
missing_vars = [var for var in required_vars if not ZOHO_CONFIG.get(var)]
if missing_vars:
    logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

def get_new_access_token() -> str:
    """Get new access token using refresh token"""
    logger.info("Requesting new access token...")
    
    url = "https://accounts.zoho.com/oauth/v2/token"
    params = {
        "client_id": ZOHO_CONFIG["client_id"],
        "client_secret": ZOHO_CONFIG["client_secret"],
        "refresh_token": ZOHO_CONFIG["refresh_token"],
        "grant_type": "refresh_token"
    }
    
    try:
        response = requests.post(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if "access_token" in data:
            access_token = data["access_token"]
            expires_in = data.get("expires_in", 3600)
            token_manager.set_token(access_token, expires_in)
            
            logger.info("Access token obtained successfully")
            logger.info(f"  Token: {access_token[:20]}...")
            logger.info(f"  Expires in: {expires_in} seconds")
            
            return access_token
        else:
            logger.error(f"No access token in response: {data}")
            raise HTTPException(status_code=500, detail="Failed to get access token")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Token request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Token request failed: {str(e)}")

def get_valid_access_token() -> str:
    """Get valid access token, refresh if needed"""
    if token_manager.is_token_valid():
        logger.info("Using existing valid token")
        return token_manager.access_token
    
    logger.info("Token expired or missing, refreshing...")
    return get_new_access_token()

def make_zoho_books_request(endpoint: str, method: str = "POST", data: dict = None, params: dict = None) -> dict:
    """Make request to Zoho Books API with automatic token refresh"""
    access_token = get_valid_access_token()
    
    url = f"https://www.zohoapis.com{endpoint}"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Content-Type": "application/json"
    }
    
    logger.info(f"Making {method} request to: {endpoint}")
    
    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data,
            params=params,
            timeout=30
        )
        
        # If token is invalid (401), refresh and retry once
        if response.status_code == 401:
            logger.warning("Token invalid (401), refreshing and retrying...")
            access_token = get_new_access_token()
            headers["Authorization"] = f"Zoho-oauthtoken {access_token}"
            
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=30
            )
        
        response.raise_for_status()
        logger.info(f"Request successful: {response.status_code}")
        
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"   Response: {e.response.text}")
        raise HTTPException(status_code=500, detail=f"Zoho API request failed: {str(e)}")

#enpoints

@router.get("/test-token")
def test_token_refresh():
    """Test endpoint to manually trigger token refresh"""
    try:
        logger.info("Testing token refresh...")
        access_token = get_new_access_token()
        
        return {
            "success": True,
            "message": "Token refreshed successfully",
            "token_preview": access_token[:20] + "...",
            "expires_at": token_manager.token_expiry.isoformat()
        }
    except Exception as e:
        logger.exception("Token refresh test failed")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/organizations")
def get_organizations():
    """Get list of organizations"""
    try:
        logger.info("Fetching organizations...")
        result = make_zoho_books_request(
            endpoint="/books/v3/organizations",
            method="GET"
        )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.exception("Failed to fetch organizations")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit")
def submit_book_data(payload: BookToken):
    """Submit data to Zoho Books"""
    try:
        logger.info("=" * 60)
        logger.info("Starting book submission")
        logger.info("=" * 60)
        
        if not ZOHO_CONFIG.get("organization_id"):
            raise HTTPException(
                status_code=400, 
                detail="ZOHO_ORGANIZATION_ID not set. Use /organizations endpoint to get your org ID"
            )
        
        # Create invoice in Zoho Books
        invoice_data = {
            "customer_name": payload.customer_name,
            "invoice_number": payload.invoice_number,
            "line_items": [
                {
                    "name": payload.description or "Service",
                    "rate": payload.amount or 0,
                    "quantity": 1
                }
            ]
        }
        
        result = make_zoho_books_request(
            endpoint="/books/v3/invoices",
            method="POST",
            data=invoice_data,
            params={"organization_id": ZOHO_CONFIG["organization_id"]}
        )
        
        logger.info("Book data submitted successfully")
        logger.info("=" * 60)
        
        return {
            "success": True,
            "message": "Book data submitted successfully",
            "data": result
        }
        
    except Exception as e:
        logger.exception("Submission failed")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "token_valid": token_manager.is_token_valid(),
        "config_loaded": all([
            ZOHO_CONFIG.get("client_id"),
            ZOHO_CONFIG.get("client_secret"),
            ZOHO_CONFIG.get("refresh_token")
        ])
    }

@router.get("/invoices")
def get_invoices(status: Optional[str] = "all"):
    """Get list of invoices"""
    try:
        logger.info(f"Fetching invoices with status: {status}")
        
        if not ZOHO_CONFIG.get("organization_id"):
            raise HTTPException(
                status_code=400,
                detail="ZOHO_ORGANIZATION_ID not set. Use /organizations endpoint to get your org ID"
            )
        
        params = {"organization_id": ZOHO_CONFIG["organization_id"]}
        
        if status and status != "all":
            params["status"] = status
        
        result = make_zoho_books_request(
            endpoint="/books/v3/invoices",
            method="GET",
            params=params
        )
        
        logger.info(f"Successfully fetched invoices")
        
        return {
            "success": True,
            "status_filter": status,
            "data": result
        }
        
    except Exception as e:
        logger.exception("Failed to fetch invoices")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/{invoice_id}")
def get_invoice_by_id(invoice_id: str):
    """Get a specific invoice by ID"""
    try:
        logger.info(f"Fetching invoice: {invoice_id}")
        
        if not ZOHO_CONFIG.get("organization_id"):
            raise HTTPException(
                status_code=400,
                detail="ZOHO_ORGANIZATION_ID not set"
            )
        
        result = make_zoho_books_request(
            endpoint=f"/books/v3/invoices/{invoice_id}",
            method="GET",
            params={"organization_id": ZOHO_CONFIG["organization_id"]}
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.exception(f"Failed to fetch invoice {invoice_id}")
        raise HTTPException(status_code=500, detail=str(e))

#new endpoints

@router.get("/analytics/overview")
def get_analytics_overview():
    """Get overview analytics for dashboard"""
    try:
        logger.info("Fetching analytics overview...")
        
        if not ZOHO_CONFIG.get("organization_id"):
            raise HTTPException(status_code=400, detail="ZOHO_ORGANIZATION_ID not set")
        
        params = {"organization_id": ZOHO_CONFIG["organization_id"]}
        
        # Fetch all invoices
        all_invoices = make_zoho_books_request(
            endpoint="/books/v3/invoices",
            method="GET",
            params=params
        )
        
        invoices = all_invoices.get("invoices", [])
        
        # Calculate analytics
        total_invoices = len(invoices)
        total_revenue = sum(inv.get("total", 0) for inv in invoices)
        total_outstanding = sum(inv.get("balance", 0) for inv in invoices)
        
        # Status breakdown
        status_counts = {}
        for inv in invoices:
            status = inv.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Overdue invoices
        overdue_invoices = [inv for inv in invoices if inv.get("status") == "overdue"]
        
        # Recent invoices (last 5)
        recent_invoices = sorted(
            invoices,
            key=lambda x: x.get("date", ""),
            reverse=True
        )[:5]
        
        return {
            "success": True,
            "data": {
                "total_invoices": total_invoices,
                "total_revenue": total_revenue,
                "total_outstanding": total_outstanding,
                "paid_count": status_counts.get("paid", 0),
                "unpaid_count": status_counts.get("sent", 0) + status_counts.get("unpaid", 0),
                "overdue_count": len(overdue_invoices),
                "status_breakdown": status_counts,
                "recent_invoices": recent_invoices,
                "overdue_invoices": overdue_invoices[:5]
            }
        }
        
    except Exception as e:
        logger.exception("Failed to fetch analytics")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/due/upcoming")
def get_upcoming_due_invoices(days: int = 7):
    """Get invoices due within specified days"""
    try:
        logger.info(f"Fetching invoices due within {days} days...")
        
        if not ZOHO_CONFIG.get("organization_id"):
            raise HTTPException(status_code=400, detail="ZOHO_ORGANIZATION_ID not set")
        
        params = {"organization_id": ZOHO_CONFIG["organization_id"]}
        
        result = make_zoho_books_request(
            endpoint="/books/v3/invoices",
            method="GET",
            params=params
        )
        
        invoices = result.get("invoices", [])
        current_date = datetime.now().date()
        future_date = current_date + timedelta(days=days)
        
        # Filter invoices due within the specified period
        upcoming_due = []
        for inv in invoices:
            if inv.get("status") in ["sent", "unpaid", "partially_paid"]:
                due_date_str = inv.get("due_date")
                if due_date_str:
                    due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
                    if current_date <= due_date <= future_date:
                        upcoming_due.append({
                            **inv,
                            "days_until_due": (due_date - current_date).days
                        })
        
        # Sort by due date
        upcoming_due.sort(key=lambda x: x.get("due_date", ""))
        
        return {
            "success": True,
            "days_range": days,
            "count": len(upcoming_due),
            "data": upcoming_due
        }
        
    except Exception as e:
        logger.exception("Failed to fetch upcoming due invoices")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/job-cards/apply")
def apply_job_card(application: JobCardApplication):
    #Apply for a job card with selected invoice items
    try:
        logger.info(f"Processing job card application for invoice: {application.invoice_id}")
        
        if not ZOHO_CONFIG.get("organization_id"):
            raise HTTPException(status_code=400, detail="ZOHO_ORGANIZATION_ID not set")
        
        # Fetch the invoice details
        invoice_result = make_zoho_books_request(
            endpoint=f"/books/v3/invoices/{application.invoice_id}",
            method="GET",
            params={"organization_id": ZOHO_CONFIG["organization_id"]}
        )
        
        invoice = invoice_result.get("invoice", {})
        
        
        # For now, return the processed data
        job_card_data = {
            "job_card_id": f"JC-{application.invoice_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "email": application.email,
            "invoice_id": application.invoice_id,
            "invoice_number": invoice.get("invoice_number"),
            "customer_name": invoice.get("customer_name"),
            "selected_items": application.selected_items,
            "notes": application.notes,
            "total_selected_amount": sum(item.get("rate", 0) * item.get("quantity", 1) for item in application.selected_items),
            "created_at": datetime.now().isoformat(),
            "status": "pending"
        }
        
        logger.info(f"Job card created: {job_card_data['job_card_id']}")
        
        return {
            "success": True,
            "message": "Job card application submitted successfully",
            "data": job_card_data
        }
        
    except Exception as e:
        logger.exception("Failed to process job card application")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-scopes")
def check_token_scopes():
    #Check what scopes/permissions the current token has
    try:
        access_token = get_valid_access_token()
        
        url = "https://accounts.zoho.com/oauth/v2/user/info"
        headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
        
        response = requests.get(url, headers=headers, timeout=10)
        
        return {
            "status": "success",
            "user_info": response.json() if response.status_code == 200 else None,
            "message": "Check the response to see what scopes you have."
        }
    except Exception as e:
        logger.exception("Failed to check scopes")
        return {
            "status": "error",
            "message": str(e),
            "instructions": "You need to regenerate your refresh token with ZohoBooks.fullaccess.all scope"
        }
@router.get("/analytics/activity-logs")
def get_activity_logs():
    #Get recent activity logs from Zoho Books
    try:
        logger.info("Fetching activity logs...")
        
        if not ZOHO_CONFIG.get("organization_id"):
            raise HTTPException(status_code=400, detail="ZOHO_ORGANIZATION_ID not set")
        
        params = {
            "organization_id": ZOHO_CONFIG["organization_id"],
            "module": "invoices",
            "page": 1,
            "per_page": 20
        }
        
        result = make_zoho_books_request(
            endpoint="/books/v3/activitylogs",
            method="GET",
            params=params
        )
        
        logs = result.get("activitylogs", [])
        
        return {
            "success": True,
            "count": len(logs),
            "data": logs
        }
        
    except Exception as e:
        logger.exception("Failed to fetch activity logs")
        raise HTTPException(status_code=500, detail=str(e))