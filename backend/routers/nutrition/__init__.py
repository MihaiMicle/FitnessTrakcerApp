"""
The nutrition API, split by concern

Each module builds its own APIRouter with no prefix (the original router
mounted at the API root) and this package stitches them together, so main.py
still imports one router
"""

from fastapi import APIRouter

from . import logs, meals

router = APIRouter()

for module in (logs, meals):
    router.include_router(module.router)

__all__ = ["router"]
