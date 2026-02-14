from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import asyncio
import logging
from datetime import datetime
from routes import zoho_books, auth, invoices, job_card, send_mail, Workdrive, notifications
from db import SessionLocal, Base, engine
from routes.notifications import cleanup_old_notifications

app = FastAPI(title="Job Card API")
logger = logging.getLogger(__name__)

# CORS middleware
cors_env = os.getenv("CORS", "")
allowed_origins = [o.strip() for o in cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or [
        "https://jobcardsystem-zeta.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(zoho_books.router)
app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(job_card.router)
app.include_router(send_mail.router)
app.include_router(Workdrive.router)
app.include_router(notifications.router)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


async def notification_cleanup_loop() -> None:
    while True:
        try:
            db = SessionLocal()
            cleanup_old_notifications(db, seen_hours=24, unseen_hours=48)
        except Exception:
            logger.exception("Notification cleanup failed")
        finally:
            try:
                db.close()
            except Exception:
                pass
        await asyncio.sleep(3600)


@app.on_event("startup")
async def startup_tasks():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        logger.exception("Database initialization failed")
    asyncio.create_task(notification_cleanup_loop())

@app.get("/")
def root():
    return {"message": "Job Card api is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Job Card API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
