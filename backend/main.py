from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
import models, schemas
from database import engine, get_db
from nutrition import calculate_macros
from datetime import date


# Create the database tables if they don't exist
models.Base.metadata.create_all(bind=engine)  


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000/", "http://127.0.0.1:3000"],  # Allow all origins for testing; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/api/users/{user_id}", response_model=schemas.UserProfileResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


@app.get("/api/users/email/{email}", response_model=schemas.UserProfileResponse)
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = db.query(models.UserProfile).filter(models.UserProfile.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


@app.put("/api/users/{user_id}", response_model=schemas.UserProfileResponse)
def update_user_profile(user_id: int, user_update: schemas.UserProfileUpdate, db: Session = Depends(get_db)):
    # Fetch existing user from database
    db_user = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    # Extract only the fields sent in the request (ignore unset optional fields)
    update_data = user_update.model_dump(exclude_unset=True)
    
    # 3. Apply the new values to the database model object
    for key, value in update_data.items():
        if hasattr(db_user, key) and value is not None:
            setattr(db_user, key, value)
    
    # Check if any variable affecting nutritional targets was changed
    recalculate_triggers = {"weight_kg", "height_cm", "activity_level", "primary_goal"}
    if any(trigger in update_data for trigger in recalculate_triggers):
        # Re-run the nutrition calculation using the updated model state
        new_targets = calculate_macros(
            weight_kg=db_user.weight_kg,
            height_cm=db_user.height_cm,
            birth_date=db_user.birth_date,
            activity_level=db_user.activity_level,
            primary_goal=db_user.primary_goal
        )
        # Apply the new calorie and macro targets
        for key, value in new_targets.items():
            setattr(db_user, key, value)
            
    # Commit changes to Supabase and refresh the object
    db.commit()
    db.refresh(db_user)
    
    return db_user


@app.post("/api/users/", response_model=schemas.UserProfileResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserProfileCreate, db: Session = Depends(get_db)):
    # Check if a user with this email already exists
    existing_user = db.query(models.UserProfile).filter(models.UserProfile.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    # Calculate nutrition targets using your service engine
    macros = calculate_macros(
        weight_kg=user.weight_kg,
        height_cm=user.height_cm,
        birth_date=user.birth_date,
        gender=user.gender.value,
        activity_level=user.activity_level,
        primary_goal=user.primary_goal
    )
    
    valid_columns = {c.name for c in models.UserProfile.__table__.columns}
    user_data = {k: v for k, v in user.model_dump().items() if k in valid_columns}
    new_user = models.UserProfile(**user_data, **macros)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@app.post("/api/logs/{user_id}/meals/", response_model=schemas.MealEntryResponse, status_code=status.HTTP_201_CREATED)
def log_meal_entry(
    user_id: int, 
    meal: schemas.MealEntryCreate, 
    log_date: date = date.today(), 
    db: Session = Depends(get_db)
):
    # Verify user profile exists
    user = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # Check if a daily log already exists for this date
    daily_log = db.query(models.DailyLog).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.log_date == log_date
    ).first()
    
    if not daily_log:
        daily_log = models.DailyLog(user_id=user_id, log_date=log_date)
        db.add(daily_log)
        db.commit()
        db.refresh(daily_log)
        
    # Prepare meal data and strip frontend conversion fields
    meal_data = meal.model_dump(exclude={"serving_size", "serving_unit"})
    new_meal = models.MealEntry(**meal_data, daily_log_id=daily_log.id)
    
    db.add(new_meal)
    db.commit()
    db.refresh(new_meal)
    
    return new_meal


@app.get("/api/logs/{user_id}/{log_date}/", response_model=schemas.DailyLogSummaryResponse)
def get_daily_log(user_id: int, log_date: date, db: Session = Depends(get_db)):
    daily_log = db.query(models.DailyLog).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.log_date == log_date
    ).first()
    
    if not daily_log:
        # Return an empty summary skeleton if no meals have been logged yet
        return schemas.DailyLogSummaryResponse(id=0, user_id=user_id, log_date=log_date, meals=[])
        
    # Aggregate macro totals across all meal entries for the day
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


@app.delete("/api/meals/{meal_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_entry(meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(models.MealEntry).filter(models.MealEntry.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal entry not found")
        
    db.delete(meal)
    db.commit()
    return None