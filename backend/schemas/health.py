from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, Union
from datetime import date, datetime
from uuid import UUID


class HealthConnectionUpsert(BaseModel):
    provider: str
    direction: Optional[str] = None
    enabled_metrics: Optional[List[str]] = None
    is_active: Optional[bool] = None
    device_platform: Optional[str] = None
    device_name: Optional[str] = None


class HealthConnectionResponse(BaseModel):
    id: UUID
    provider: str
    direction: str
    enabled_metrics: List[str] = []
    is_active: bool
    device_platform: Optional[str] = None
    device_name: Optional[str] = None
    last_import_at: Optional[datetime] = None
    last_export_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HealthSampleIn(BaseModel):
    """
    One record as a provider hands it over

    Deliberately loose. HealthKit, Health Connect and a file import each name
    and unit their fields differently, and `core.health.normalize_sample`
    resolves all of that in one place. Validating the provider's vocabulary
    here would just mean maintaining the same table twice
    """

    metric: str
    value: Optional[float] = None
    unit: Optional[str] = None
    start_at: Union[datetime, str, int, float]
    end_at: Optional[Union[datetime, str, int, float]] = None
    external_id: Optional[str] = None
    source: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


class HealthSyncRequest(BaseModel):
    provider: str
    samples: List[HealthSampleIn] = Field(default_factory=list)

    # Advance the read cursor once the batch lands, so the device can ask for
    # a window next time instead of re-reading its whole history
    synced_through: Optional[datetime] = None


class HealthSyncResponse(BaseModel):
    accepted: int
    duplicates: int
    skipped: int
    applied: Dict[str, int] = {}
    last_import_at: Optional[datetime] = None


class HealthSampleResponse(BaseModel):
    id: UUID
    provider: str
    metric: str
    value: float
    unit: str
    start_at: datetime
    end_at: datetime
    source_name: Optional[str] = None

    class Config:
        from_attributes = True


class HealthDailyPoint(BaseModel):
    day: date
    metric: str
    value: float
    unit: str


class HealthExportItem(BaseModel):
    """One thing the app owns, shaped for writing into a health store"""

    export_key: str
    metric: str
    value: float
    unit: str
    start_at: datetime
    end_at: datetime
    payload: Optional[Dict[str, Any]] = None


class HealthExportResponse(BaseModel):
    items: List[HealthExportItem] = []
    cursor: Optional[datetime] = None


class HealthExportAck(BaseModel):
    """Confirms a device wrote everything up to a point, moving the cursor"""

    provider: str
    written_through: datetime


class HealthImportResponse(HealthSyncResponse):
    truncated: bool = False
