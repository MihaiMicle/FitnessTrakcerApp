from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

@app.get("/api/user/profile")
def get_mock_profile():
    return {
        "weight_kg": 85,
        "height_cm": 180,
        "goal": "cutting"
    }