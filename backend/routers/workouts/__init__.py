"""
The workouts API, split by concern

Each module builds its own APIRouter with the shared /workouts prefix and this
package stitches them together, so main.py still imports one router
"""

from fastapi import APIRouter

from . import exercises, sessions, templates

router = APIRouter()

for module in (sessions, exercises, templates):
    router.include_router(module.router)

__all__ = ["router"]
