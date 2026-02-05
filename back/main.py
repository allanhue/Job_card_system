from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from routes import zoho_books, auth, invoices, job_card, send_mail

app = FastAPI(title="Job Card API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jobcardsystem-zeta.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(zoho_books.router)
app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(job_card.router)
app.include_router(send_mail.router)
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
def root():
    return {"message": "Job Card API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Job Card API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
