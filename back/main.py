from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routes import zoho_books 
from db import get_database_url

app = FastAPI(title="Job Card API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jobcardsystem-zeta.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(zoho_books.router)

@app.get("/")
def root():
    return {"message": "Job Card API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Job Card API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)