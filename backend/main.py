import os
import jwt
from datetime import date
from fastapi import FastAPI, Depends, HTTPException, status, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import text
from sqlalchemy.orm import Session
import models, schemas
from backend.core.database import engine, get_db
from nutrition import calculate_macros
from jwt import PyJWKClient

# Create the database tables if they don't exist
models.Base.metadata.create_all(bind=engine)  

app = FastAPI()

# Cleaned up CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SUPABASE JWT AUTHENTICATION DEPENDENCY ---
security = HTTPBearer()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

jwks_url = f"{os.getenv('SUPABASE_URL')}/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(jwks_url)




@app.get("/")
def read_root():
    return {"status": "success", "message": "The Fitness Tracker backend is alive!"}


@app.get("/api/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "success", "message": "Successfully connected to Supabase PostgreSQL!"}
    except Exception as e:
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}


# --- PROTECTED NUTRITION LOGGING ENDPOINTS ---
# Notice: No integer {user_id} in the URL path! It is safely injected by Depends(get_current_user)

@app.get("/logs/{log_date}", response_model=schemas.DailyLogSummaryResponse)
@app.get("/api/logs/{log_date}", response_model=schemas.DailyLogSummaryResponse)  # Supports both URL formats
def get_daily_log(log_date: date, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    daily_log = db.query(models.DailyLog).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.log_date == log_date
    ).first()
    
    if not daily_log:
        # Return an empty summary skeleton if no meals have been logged for this day yet
        return schemas.DailyLogSummaryResponse(id=0, user_id=user_id, log_date=log_date, meals=[])
        
    total_cals = sum(m.calories for m in daily_log.meals)
    total_prot = round(sum(m.protein_g for m in daily_log.meals), 1)
    total_carbs = round(sum(m.carbs_g for m in daily_log.meals), 1)
    total_fats = round(sum(m.fats_g for m in daily_log.meals), 1)
    
    response_data = schemas.DailyLogSummaryResponse.model_validate(daily_log)
    response_data.total_calories = total_cals
    response_data.total_protein_g = total_prot
    response_data.total_carbs_g = total_carbs
    response_data.total_fats_g = total_fats
    
    return response_data


@app.post("/meals", response_model=schemas.MealEntryResponse, status_code=status.HTTP_201_CREATED)
@app.post("/api/meals", response_model=schemas.MealEntryResponse, status_code=status.HTTP_201_CREATED)
def log_meal_entry(
    meal: schemas.MealEntryCreate, 
    user_id: str = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Determine date from payload or default to today
    log_date = meal.date if hasattr(meal, "date") and meal.date else date.today()
    
    # Check if a daily log already exists for this authenticated user and date
    daily_log = db.query(models.DailyLog).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.log_date == log_date
    ).first()
    
    if not daily_log:
        daily_log = models.DailyLog(user_id=user_id, log_date=log_date)
        db.add(daily_log)
        db.commit()
        db.refresh(daily_log)
        
    # Prepare meal data, stripping extra UI/helper fields
    meal_data = meal.model_dump(exclude={"serving_size", "serving_unit", "date"}, exclude_unset=True)
    new_meal = models.MealEntry(**meal_data, daily_log_id=daily_log.id)
    
    db.add(new_meal)
    db.commit()
    db.refresh(new_meal)
    
    return new_meal


@app.delete("/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
@app.delete("/api/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_entry(meal_id: int, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    meal = db.query(models.MealEntry).filter(models.MealEntry.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal entry not found")
        
    db.delete(meal)
    db.commit()
    return None