# Personal Fitness & Nutrition Tracker

I built this full-stack tracker because generic fitness apps rarely offer the precision needed for serious powerbuilding or structured bulking and cutting phases. This application handles the heavy lifting of calculating optimal daily nutrition, going beyond just standard macros to track the exact micronutrients and electrolytes required to support intense training and recovery.

## Core Features

* **Smart Macro Generation:** The app uses the Mifflin-St Jeor equation to calculate your baseline calories and macros based on your physical metrics, activity level, and current training phase (cut, bulk, or maintain).
* **Deep Nutrition Analytics:** Tracks protein, carbs, and fats alongside critical sub-metrics like saturated fats, dietary fiber, added sugars, potassium, and sodium.
* **Auto-Scaling Sub-Macros:** The backend algorithm does the math for you. It automatically sets healthy maximum thresholds for sugar (10% of carbs) and saturated fats (25% of fats), while scaling your sodium and potassium targets based on your training intensity.
* **Time-Travel Dashboard:** A custom date navigator lets you easily jump back to review past nutrition data or skip ahead to log future meal prep.
* **Profile Management:** Manage your physical metrics, upload a profile photo, and seamlessly toggle between metric (kg/cm) and imperial (lbs/in) systems.

## Tech Stack

**Frontend**
* Next.js (App Router)
* React Hooks for reactive state management
* Tailwind CSS for styling
* Lucide React for UI iconography

**Backend**
* FastAPI (Python)
* SQLAlchemy for database ORM
* Pydantic for strict data validation

**Database & Auth**
* Supabase (PostgreSQL, Authentication, and Storage)

---

## Local Setup

### Prerequisites
* Node.js (v18+)
* Python (v3.10+)
* A Supabase account and project

### 1. Database Configuration
Make sure your Supabase PostgreSQL database includes the `user_profiles`, `daily_logs`, and `meals` tables. You will need to execute the schema modifications in the Supabase SQL Editor to ensure the micronutrient columns (saturated fats, fiber, sugar, potassium, sodium) are present.

### 2. Backend Setup
Navigate to the `backend` directory and set up your Python environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt