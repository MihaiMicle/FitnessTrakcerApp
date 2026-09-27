import asyncio
from typing import Awaitable, Callable, List, Optional

# Codes worth another try. Anything else is a bad request and fails straight away
RETRYABLE_CODES = {429, 500, 503, 504}

ATTEMPTS_PER_MODEL = 2
RETRY_DELAY_SECONDS = 1.5


def error_code(exc: BaseException) -> Optional[int]:
    """The HTTP status on a google.genai APIError, or None for anything else"""
    code = getattr(exc, "code", None)
    return code if isinstance(code, int) else None


def is_retryable(exc: BaseException) -> bool:
    return error_code(exc) in RETRYABLE_CODES


def model_chain(primary: str, fallback: Optional[str]) -> List[str]:
    """Primary first, then the fallback if one is set and differs"""
    chain = [primary]
    if fallback and fallback.strip() and fallback.strip() != primary:
        chain.append(fallback.strip())
    return chain


async def generate_with_fallback(
    call: Callable[[str], Awaitable[str]],
    models: List[str],
    attempts: int = ATTEMPTS_PER_MODEL,
    delay: float = RETRY_DELAY_SECONDS,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
) -> str:
    last_error: Optional[BaseException] = None
    for model in models:
        for attempt in range(attempts):
            try:
                return await call(model)
            except Exception as exc:
                if not is_retryable(exc):
                    raise
                last_error = exc
                if attempt < attempts - 1:
                    await sleep(delay)
    if last_error is None:
        raise ValueError("No model configured for the copilot")
    raise last_error


def friendly_error(exc: BaseException) -> str:
    """Short text for the chat bubble instead of the raw API payload"""
    code = error_code(exc)
    if code == 429:
        return "The AI is getting too many requests right now. Try again in a minute."
    if code in RETRYABLE_CODES:
        return "The AI model is overloaded right now. Try again in a minute."
    return f"Copilot connection error: {exc}"
