from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routes import zoho_books 
app = FastAPI(title="Job Card API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(zoho_books.router)

@app.get("/")
def root():
    return {"message": "Job Card API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)