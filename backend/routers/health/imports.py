"""
The browser's way in: uploading an Apple Health export

The archive is parsed on the server rather than in the page. These files run
to hundreds of megabytes and a tab that tries to hold one in memory while
parsing XML will be killed on a phone, which is exactly the device the export
came from
"""

from fastapi import Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from core.database import get_db
from core.health import PROVIDER_FILE_IMPORT, normalize_batch
from core.health_import import HealthImportError, parse_export
from core.security import get_current_user
from schemas.health import HealthImportResponse

from .common import (
    apply_samples,
    ensure_connection,
    health_router,
    readable_metrics,
    store_samples,
    touch_import_cursor,
)

router = health_router()

# Large enough for a decade of history, small enough that a bad upload cannot
# fill the disk. The parser streams, so this bounds transfer rather than memory
MAX_UPLOAD_BYTES = 512 * 1024 * 1024


@router.post("/import/apple", response_model=HealthImportResponse)
async def import_apple_export(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Read an Apple Health export and store what it contains

    The samples land through the same path a phone's sync uses, so importing
    the file and connecting the phone later produce the same rows rather than
    two overlapping copies
    """
    connection = ensure_connection(db, current_user_id, PROVIDER_FILE_IMPORT, "web")
    allowed = readable_metrics(connection)

    try:
        raw_samples, truncated = parse_export(file.file, metrics=sorted(allowed))
    except HealthImportError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        await file.close()

    if not raw_samples:
        raise HTTPException(
            status_code=400,
            detail="No readable health data in that export",
        )

    rows, skipped = normalize_batch(raw_samples, PROVIDER_FILE_IMPORT)
    kept = [row for row in rows if row["metric"] in allowed]
    skipped += len(rows) - len(kept)

    stored, duplicates = store_samples(db, current_user_id, kept)
    applied = apply_samples(db, current_user_id, stored)
    cursor = touch_import_cursor(connection, None)

    db.commit()

    return HealthImportResponse(
        accepted=len(stored) - duplicates,
        duplicates=duplicates,
        skipped=skipped,
        applied=applied,
        last_import_at=cursor,
        truncated=truncated,
    )
