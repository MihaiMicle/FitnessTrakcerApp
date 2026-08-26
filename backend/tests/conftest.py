"""
Shared test setup.

`core/database.py` raises at import time when DATABASE_URL is unset, and
`core/security.py` reads Supabase credentials at import time. Neither actually
opens a connection on import, so a throwaway in-memory SQLite URL is enough to
let any test that touches a router module import cleanly

Tests for `core/calculations.py` don't need any of this — that module imports
nothing
"""

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Set before any backend module is imported. python-dotenv's load_dotenv() does
# not override variables that are already set, so this wins over a local .env
# and keeps the test run off the real database
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")
os.environ.setdefault("SUPABASE_KEY", "test-key")
