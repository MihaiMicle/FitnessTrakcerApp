import asyncio
import json
import os
from datetime import date
from typing import Any, Dict, List, Tuple
from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from google import genai
from google.genai import types

from core.database import get_db
from core.security import get_current_user
from core.copilot import context as copilot_context
from core.copilot import media, parsing, prompt
from schemas.copilot import CopilotRequest, CopilotResponse

load_dotenv()
router = APIRouter(tags=["Copilot"])

DEFAULT_MODEL = "gemini-3.6-flash"
MAX_HISTORY_TURNS = 12


def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", DEFAULT_MODEL)


def _history_lines(history: List[Any]) -> List[str]:
    recent = history[-MAX_HISTORY_TURNS:]
    return [
        f"{'User' if turn.role == 'user' else 'Copilot'}: {turn.text}"
        for turn in recent
        if turn.text
    ]


def _build_contents(
    ctx: Dict[str, Any],
    req: CopilotRequest,
    native_parts: List[types.Part],
    extracted_docs: List[str],
) -> List[Any]:
    contents: List[Any] = [
        "USER CONTEXT (JSON):\n" + json.dumps(ctx, default=str),
    ]
    hint = prompt.surface_hint(req.surface)
    if hint:
        contents.append(hint)

    lines = _history_lines(req.history)
    if lines:
        contents.append("CONVERSATION SO FAR:\n" + "\n".join(lines))

    # Append extracted text from Office files, CSV, XML, JSON, or Binary
    if extracted_docs:
        contents.append(
            "ATTACHED DOCUMENT CONTENTS & DATA:\n" + "\n\n---\n\n".join(extracted_docs)
        )

    contents.append(f"User: {req.message}")

    # Append native Multimodal parts (Images, Video, PDFs)
    if native_parts:
        contents.append(f"Attached {len(native_parts)} multimedia/document file(s):")
        contents.extend(native_parts)

    return contents


async def _process_attachments(
    req: CopilotRequest, ctx: Dict[str, Any]
) -> Tuple[List[types.Part], List[str]]:
    raw_decoded = media.decode_attachments(
        [a.model_dump() for a in req.attachments] if req.attachments else None
    )

    native_parts: List[types.Part] = []
    extracted_docs: List[str] = []

    for payload, mime, name in raw_decoded:
        if mime in media.NATIVE_MULTIMODAL_MIMES:
            native_parts.append(types.Part.from_bytes(data=payload, mime_type=mime))
        else:
            text = media.extract_text_from_doc(payload, mime, name)
            if text:
                extracted_docs.append(f"[{name} ({mime})]\n{text}")

    # Fallback to stored physique progress photos if body fat evaluation requested
    if (
        not native_parts
        and not extracted_docs
        and media.wants_body_fat_estimate(req.message)
    ):
        urls = [p["photo_url"] for p in ctx.get("progress_photos") or []]
        stored_images = await media.fetch_photos(urls)
        for payload, mime in stored_images:
            native_parts.append(types.Part.from_bytes(data=payload, mime_type=mime))

    return native_parts, extracted_docs


def _generate(api_key: str, contents: List[Any]) -> str:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=_model_name(),
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=prompt.SYSTEM_INSTRUCTION,
            temperature=0.7,
            response_mime_type="application/json",
        ),
    )
    return response.text or ""


@router.post("/copilot", response_model=CopilotResponse)
async def chat_with_copilot(
    req: CopilotRequest,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return parsing.empty_reply(
            "The copilot is not configured: GEMINI_API_KEY is missing on the server."
        )

    log_date = req.log_date or date.today()
    try:
        ctx = copilot_context.build_context(
            db, current_user_id, log_date, req.live_workout
        )
    except Exception as exc:
        print(f"Copilot context build failed: {exc}")
        ctx = {"today": str(log_date)}

    native_parts, extracted_docs = await _process_attachments(req, ctx)
    contents = _build_contents(ctx, req, native_parts, extracted_docs)

    try:
        raw = await asyncio.to_thread(_generate, api_key, contents)
    except Exception as exc:
        return parsing.empty_reply(f"Copilot connection error: {exc}")

    return parsing.normalize_reply(raw)
