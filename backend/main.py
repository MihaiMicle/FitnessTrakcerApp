from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine, Base
from routers import profile, nutrition, foods, chat, workouts, social

# Create database tables automatically if they don't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Fitness Tracker API",
    description="A modular backend supporting automated TDEE/macro calculations and custom overrides.",
    version="1.0.0",
)

# Configure CORS for your Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://fitness-trakcer-app-tau.vercel.app",
        "https://fitness-trakcer-eatkf5b61-misu5.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the modular routers
app.include_router(profile.router)
app.include_router(nutrition.router)
app.include_router(foods.router)
app.include_router(chat.router)
app.include_router(workouts.router)
app.include_router(social.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Fitness Tracker API is running smoothly."}
