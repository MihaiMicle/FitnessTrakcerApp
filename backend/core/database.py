import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in your .env file!")

# Create the SQLAlchemy Engine
engine = create_engine(DATABASE_URL)

# Create the SessionLocal class
# Each request will get its own temporary database session from this factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create the Base class
# All your models (in models/user.py and models/nutrition.py) will inherit from this
Base = declarative_base()


# The FastAPI Dependency
def get_db():
    """
    Generates an independent database session for each API request 
    and automatically closes it when the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()