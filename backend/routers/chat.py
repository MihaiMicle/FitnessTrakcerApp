import os
import httpx
import json
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv

# Import the new officially supported SDK
from google import genai
from google.genai import types

from core.database import get_db
from core.security import get_current_user

# Load env vars
load_dotenv()

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


system_instruction = """
You are an expert Fitness & Nutrition Copilot for a natural bodybuilder. You have access to the user's profile, daily macros, and latest physique photo.

Always respond in this JSON format:
{
  "message": "Your conversational response, advice, or body fat estimate. Use markdown for bolding and bullet points.",
  "action": {
    "type": "ACTION_TYPE",
    "payload": {} 
  },
  "suggested_meals": [
    {
      "title": "Name of the meal (e.g., Grilled Chicken Bowl)",
      "meal_type": "lunch",
      "foods": [
        {
          "food_name": "Chicken breast",
          "serving_size": 170,
          "serving_unit": "g",
          "calories": 280,
          "protein_g": 52,
          "carbs_g": 0,
          "fats_g": 6
        }
      ]
    }
  ]
}

- If suggesting meals, populate the "suggested_meals" array with 1 to 3 options. Make sure the foods array contains accurate macro data.
- If no meals are being suggested, set "suggested_meals" to null.
- Available ACTION_TYPEs: "UPDATE_GOALS", "UPDATE_PROFILE". If no profile/goal action is needed, set "action" to null.
"""


@router.post("/copilot")
async def chat_with_copilot(
    req: ChatRequest, user=Depends(get_current_user), db: Session = Depends(get_db)
):

    # Safely initialize client INSIDE the request so .env is guaranteed to be loaded
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {
            "message": "Copilot Error: GEMINI_API_KEY is missing from your .env file!",
            "action": None,
            "suggested_meals": None,
        }

    client = genai.Client(api_key=api_key)

    # Safely handle the user depending on how your auth returns it
    if isinstance(user, str):
        user_id = user
    elif hasattr(user, "id"):
        user_id = user.id
    else:
        user_id = user.get("id", user.get("sub"))

    profile = {}
    latest_weight = {}

    # Fetch User Context using SQLAlchemy Raw SQL
    try:
        profile_query = (
            db.execute(
                text("SELECT * FROM profiles WHERE user_id = :uid"), {"uid": user_id}
            )
            .mappings()
            .fetchone()
        )

        if profile_query:
            profile = dict(profile_query)

        weight_query = (
            db.execute(
                text(
                    "SELECT * FROM weight_logs WHERE user_id = :uid ORDER BY date DESC LIMIT 1"
                ),
                {"uid": user_id},
            )
            .mappings()
            .fetchone()
        )

        if weight_query:
            latest_weight = dict(weight_query)
    except Exception as e:
        print(f"Warning: Could not fetch DB context: {e}")
        pass

    # Convert to JSON (default=str handles dates safely)
    context = f"User Profile: {json.dumps(profile, default=str)}. Latest Log: {json.dumps(latest_weight, default=str)}"
    contents = [context, f"User: {req.message}"]

    # Fetch Latest Photo for Body Fat Estimation
    photo_url = latest_weight.get("photo_url") if latest_weight else None

    if photo_url and photo_url.startswith("http"):
        try:
            async with httpx.AsyncClient() as client_http:
                img_res = await client_http.get(photo_url)
                if img_res.status_code == 200:
                    contents.append(
                        types.Part.from_bytes(
                            data=img_res.content,
                            mime_type="image/jpeg",
                        )
                    )
        except Exception as e:
            print(f"Could not fetch image for Gemini: {e}")

    # Call Gemini
    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction, temperature=0.7
            ),
        )

        # Strip markdown formatting if Gemini included it
        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)

    except Exception as e:
        return {
            "message": f" Copilot Connection Error: {str(e)}",
            "action": None,
            "suggested_meals": None,
        }
