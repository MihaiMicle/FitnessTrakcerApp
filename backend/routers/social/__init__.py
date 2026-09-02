"""
The social API, split by concern

Each module builds its own APIRouter with the shared /social prefix and this
package stitches them together, so main.py still imports one router
"""

from fastapi import APIRouter

from . import blocking, discovery, feed, graph, requests, settings

router = APIRouter()

for module in (settings, discovery, graph, requests, blocking, feed):
    router.include_router(module.router)

__all__ = ["router"]
