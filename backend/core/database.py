import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load the secret variables from the .env file
load_dotenv()

# Get the database URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine that physically connects to Supabase
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a session factory for our database operations
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This Base class is what we will use to create our database models later
Base = declarative_base()

# Dependency to get a database session for each API request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()