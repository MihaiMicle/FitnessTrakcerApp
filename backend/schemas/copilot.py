from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import date


class CopilotAttachment(BaseModel):
    """A photo the user attached to a chat message, base64 encoded"""

    mime_type: str
    data: str


class CopilotTurn(BaseModel):
    """One earlier turn, replayed so the model keeps the thread"""

    role: str
    text: str


class CopilotRequest(BaseModel):
    message: str = ""
    log_date: Optional[date] = None

    # Which screen the question came from, so the reply can be tuned to it
    surface: str = "dashboard"

    # The unsaved session on screen. Sent by the client because an offline
    # workout has not reached the database yet
    live_workout: Optional[Dict[str, Any]] = None

    history: List[CopilotTurn] = Field(default_factory=list)
    attachments: List[CopilotAttachment] = Field(default_factory=list)


class CopilotResponse(BaseModel):
    message: str
    action: Optional[Dict[str, Any]] = None
    suggested_meals: Optional[List[Dict[str, Any]]] = None
    suggested_routine: Optional[Dict[str, Any]] = None
    suggested_exercises: Optional[List[Dict[str, Any]]] = None
    body_fat: Optional[Dict[str, Any]] = None
