from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import engine, get_db


app = FastAPI(title="Fitness Tracker API")

# Allow requests from local Next.js frontend
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

@app.get("/")
def read_root():
    return {"status": "success", "message": "The Fitness Tracker backend is alive!"}

# Database Connection Test Endpoint
@app.get("/api/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        # We run a simple SQL query to check the connection
        db.execute(text("SELECT 1"))
        return {"status": "success", "message": "Successfully connected to Supabase PostgreSQL!"}
    except Exception as e:
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}

@app.get("/api/user/profile")
def get_mock_profile():
    return {
        "weight_kg": 85,
        "height_cm": 180,
        "goal": "cutting"
    }

