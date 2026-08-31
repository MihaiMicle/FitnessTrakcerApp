"""
The health integration API, split by concern

Each module builds its own APIRouter with the shared /health prefix and this
package stitches them together, so main.py still imports one router
"""

from fastapi import APIRouter

from . import connections, export, imports, sync

router = APIRouter()

for module in (connections, sync, export, imports):
    router.include_router(module.router)

__all__ = ["router"]
