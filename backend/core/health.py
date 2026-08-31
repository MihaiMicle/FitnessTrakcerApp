"""
Canonical health metrics, mirroring frontend/lib/health/metrics.ts

Apple HealthKit, Android Health Connect and a Google Takeout export all
describe the same handful of facts in different vocabularies and different
units. Nothing downstream should have to know that, so every provider is
normalized to one canonical metric name and one canonical unit before it
reaches the database

The important consequence is that a phone reading HealthKit and a browser
importing an `export.xml` produce byte identical rows, which is what makes
the two paths interchangeable

`test_health.py` pins the metric table and the unit factors. Keep them in step
with the TypeScript ones so a drift on either side fails a test rather than
producing two clients that disagree about what a kilogram is
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

PROVIDER_APPLE_HEALTH = "apple_health"
PROVIDER_HEALTH_CONNECT = "health_connect"
PROVIDER_FILE_IMPORT = "file_import"
PROVIDER_MANUAL = "manual"

PROVIDERS = (
    PROVIDER_APPLE_HEALTH,
    PROVIDER_HEALTH_CONNECT,
    PROVIDER_FILE_IMPORT,
    PROVIDER_MANUAL,
)

DIRECTION_READ = "read"
DIRECTION_WRITE = "write"
DIRECTION_BOTH = "both"
DIRECTIONS = (DIRECTION_READ, DIRECTION_WRITE, DIRECTION_BOTH)

# How several samples for the same metric on the same day collapse into one
REDUCE_LAST = "last"
REDUCE_SUM = "sum"
REDUCE_MEAN = "mean"
REDUCE_MAX = "max"

# metric -> (dimension, canonical unit, daily reduction)
METRICS: dict[str, tuple[str, str, str]] = {
    "weight_kg": ("mass", "kg", REDUCE_LAST),
    "body_fat_percent": ("percent", "percent", REDUCE_LAST),
    "height_cm": ("length", "cm", REDUCE_LAST),
    "steps": ("count", "count", REDUCE_SUM),
    "active_energy_kcal": ("energy", "kcal", REDUCE_SUM),
    "resting_energy_kcal": ("energy", "kcal", REDUCE_SUM),
    "heart_rate_bpm": ("rate", "bpm", REDUCE_MEAN),
    "resting_heart_rate_bpm": ("rate", "bpm", REDUCE_LAST),
    "distance_km": ("length", "km", REDUCE_SUM),
    "sleep_minutes": ("time", "min", REDUCE_SUM),
    "water_ml": ("volume", "ml", REDUCE_SUM),
    "energy_intake_kcal": ("energy", "kcal", REDUCE_SUM),
    "protein_g": ("mass", "g", REDUCE_SUM),
    "carbs_g": ("mass", "g", REDUCE_SUM),
    "fat_g": ("mass", "g", REDUCE_SUM),
    "workout_minutes": ("time", "min", REDUCE_SUM),
}

# Metrics the app is willing to push back out to a health store
WRITABLE_METRICS = (
    "weight_kg",
    "body_fat_percent",
    "water_ml",
    "energy_intake_kcal",
    "protein_g",
    "carbs_g",
    "fat_g",
    "workout_minutes",
)

# unit -> (dimension, factor into the dimension's base unit)
UNIT_FACTORS: dict[str, tuple[str, float]] = {
    # mass, base gram
    "g": ("mass", 1.0),
    "kg": ("mass", 1000.0),
    "mg": ("mass", 0.001),
    "lb": ("mass", 453.59237),
    "oz": ("mass", 28.349523125),
    # length, base metre
    "m": ("length", 1.0),
    "km": ("length", 1000.0),
    "cm": ("length", 0.01),
    "mm": ("length", 0.001),
    "mi": ("length", 1609.344),
    "ft": ("length", 0.3048),
    "in": ("length", 0.0254),
    # energy, base kilocalorie
    "kcal": ("energy", 1.0),
    "cal": ("energy", 0.001),
    "kj": ("energy", 0.2390057361),
    # volume, base millilitre
    "ml": ("volume", 1.0),
    "l": ("volume", 1000.0),
    "floz": ("volume", 29.5735295625),
    "cup": ("volume", 236.5882365),
    # time, base minute
    "min": ("time", 1.0),
    "s": ("time", 1.0 / 60.0),
    "h": ("time", 60.0),
    "ms": ("time", 1.0 / 60000.0),
    "d": ("time", 1440.0),
    # dimensionless
    "count": ("count", 1.0),
    "percent": ("percent", 1.0),
    "fraction": ("percent", 100.0),
    "bpm": ("rate", 1.0),
}

# Spellings seen in real exports, folded onto the canonical unit key
UNIT_ALIASES: dict[str, str] = {
    "kilogram": "kg", "kilograms": "kg", "kgs": "kg",
    "gram": "g", "grams": "g", "gm": "g",
    "milligram": "mg", "milligrams": "mg",
    "lbs": "lb", "pound": "lb", "pounds": "lb",
    "ounce": "oz", "ounces": "oz",
    "metre": "m", "meter": "m", "meters": "m", "metres": "m",
    "kilometer": "km", "kilometre": "km", "kilometers": "km", "kilometres": "km",
    "centimeter": "cm", "centimetre": "cm", "centimeters": "cm",
    "mile": "mi", "miles": "mi",
    "foot": "ft", "feet": "ft",
    "inch": "in", "inches": "in",
    "calorie": "cal", "calories": "kcal", "kilocalorie": "kcal", "kilocalories": "kcal",
    "kilojoule": "kj", "kilojoules": "kj",
    "millilitre": "ml", "milliliter": "ml", "milliliters": "ml", "millilitres": "ml",
    "litre": "l", "liter": "l", "liters": "l", "litres": "l",
    "fl_oz": "floz", "fl oz": "floz", "fluid_ounce": "floz",
    "cups": "cup",
    "minute": "min", "minutes": "min", "mins": "min",
    "second": "s", "seconds": "s", "sec": "s", "secs": "s",
    "hour": "h", "hours": "h", "hr": "h", "hrs": "h",
    "millisecond": "ms", "milliseconds": "ms",
    "day": "d", "days": "d",
    "%": "percent", "pct": "percent",
    "count/min": "bpm", "counts/min": "bpm", "count/minute": "bpm", "beats/min": "bpm",
}

# HealthKit sample identifiers
HEALTHKIT_METRICS: dict[str, str] = {
    "HKQuantityTypeIdentifierBodyMass": "weight_kg",
    "HKQuantityTypeIdentifierBodyFatPercentage": "body_fat_percent",
    "HKQuantityTypeIdentifierHeight": "height_cm",
    "HKQuantityTypeIdentifierStepCount": "steps",
    "HKQuantityTypeIdentifierActiveEnergyBurned": "active_energy_kcal",
    "HKQuantityTypeIdentifierBasalEnergyBurned": "resting_energy_kcal",
    "HKQuantityTypeIdentifierHeartRate": "heart_rate_bpm",
    "HKQuantityTypeIdentifierRestingHeartRate": "resting_heart_rate_bpm",
    "HKQuantityTypeIdentifierDistanceWalkingRunning": "distance_km",
    "HKQuantityTypeIdentifierDistanceCycling": "distance_km",
    "HKCategoryTypeIdentifierSleepAnalysis": "sleep_minutes",
    "HKQuantityTypeIdentifierDietaryWater": "water_ml",
    "HKQuantityTypeIdentifierDietaryEnergyConsumed": "energy_intake_kcal",
    "HKQuantityTypeIdentifierDietaryProtein": "protein_g",
    "HKQuantityTypeIdentifierDietaryCarbohydrates": "carbs_g",
    "HKQuantityTypeIdentifierDietaryFatTotal": "fat_g",
    "HKWorkout": "workout_minutes",
}

# Health Connect record class names
HEALTH_CONNECT_METRICS: dict[str, str] = {
    "WeightRecord": "weight_kg",
    "BodyFatRecord": "body_fat_percent",
    "HeightRecord": "height_cm",
    "StepsRecord": "steps",
    "ActiveCaloriesBurnedRecord": "active_energy_kcal",
    "BasalMetabolicRateRecord": "resting_energy_kcal",
    "HeartRateRecord": "heart_rate_bpm",
    "RestingHeartRateRecord": "resting_heart_rate_bpm",
    "DistanceRecord": "distance_km",
    "SleepSessionRecord": "sleep_minutes",
    "HydrationRecord": "water_ml",
    "NutritionRecord": "energy_intake_kcal",
    "ExerciseSessionRecord": "workout_minutes",
}

# A sample this far out is a clock bug or a parse error, not a measurement
MAX_FUTURE_SKEW_SECONDS = 86400

# The name this app writes under when it pushes data into a health store
SELF_SOURCE_NAME = "FitnessTracker"


def is_own_write(source: Any) -> bool:
    """
    Whether a sample is one we wrote out ourselves

    Two way sync has an obvious failure: the app writes a workout into Apple
    Health, the next read pulls it back in, and the projection counts it a
    second time. The native plugin filters on the writing app before it ever
    sends the batch, and this is the second line of defence for the providers
    where it cannot
    """
    if not isinstance(source, str):
        return False
    return SELF_SOURCE_NAME.lower() in source.strip().lower()


def normalize_unit(unit: Any) -> Optional[str]:
    """The canonical spelling of a unit, or None when it is unrecognised"""
    if not isinstance(unit, str):
        return None
    key = unit.strip().lower().replace("\u00b5", "u")
    key = UNIT_ALIASES.get(key, key)
    return key if key in UNIT_FACTORS else None


def normalize_metric(name: Any, provider: Any = None) -> Optional[str]:
    """
    Resolve a provider's name for a measurement to a canonical metric

    Canonical names pass straight through, so a native plugin that already
    speaks our vocabulary needs no mapping table of its own
    """
    if not isinstance(name, str):
        return None

    key = name.strip()
    if key in METRICS:
        return key
    if provider == PROVIDER_HEALTH_CONNECT:
        return HEALTH_CONNECT_METRICS.get(key)
    if provider == PROVIDER_APPLE_HEALTH:
        return HEALTHKIT_METRICS.get(key)

    # An import has no provider hint, so try both vocabularies
    return HEALTHKIT_METRICS.get(key) or HEALTH_CONNECT_METRICS.get(key)


def convert_value(metric: str, value: Any, unit: Any) -> Optional[float]:
    """
    A value expressed in the metric's canonical unit

    Returns None rather than guessing when the unit belongs to a different
    dimension, because silently reading a kilogram as a kilometre is worse
    than dropping the sample
    """
    spec = METRICS.get(metric)
    if spec is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if value != value:  # NaN
        return None

    dimension, canonical_unit, _ = spec
    source = normalize_unit(unit)

    # No unit given means the value is already canonical
    if source is None:
        return float(value) if unit in (None, "") else None

    source_dimension, source_factor = UNIT_FACTORS[source]
    if source_dimension != dimension:
        return None

    _, target_factor = UNIT_FACTORS[canonical_unit]
    return float(value) * source_factor / target_factor


def parse_instant(value: Any) -> Optional[datetime]:
    """A timezone aware datetime from an ISO string, epoch seconds or ms"""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        seconds = value / 1000.0 if abs(value) > 1e11 else float(value)
        try:
            return datetime.fromtimestamp(seconds, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None

    if not isinstance(value, str) or not value.strip():
        return None

    text = value.strip().replace("Z", "+00:00")
    # Apple writes "2026-08-30 07:14:22 +0200", which fromisoformat rejects
    if " " in text and "T" not in text:
        text = text.replace(" ", "T", 1)
    if len(text) > 5 and (text[-5] in "+-") and ":" not in text[-5:]:
        text = f"{text[:-2]}:{text[-2:]}"

    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def sample_fingerprint(
    metric: str,
    start_at: datetime,
    end_at: datetime,
    value: float,
    source: Any = None,
) -> str:
    """
    A stable id for a sample that arrived without one

    HealthKit and Health Connect both hand out their own uuid per record, and
    that is what we key on. A file import has nothing of the sort, so the
    identity has to come from the content instead. Rounding the value keeps a
    re-import of the same file from producing near duplicates through float
    noise
    """
    parts = (
        metric,
        start_at.astimezone(timezone.utc).isoformat(),
        end_at.astimezone(timezone.utc).isoformat(),
        f"{round(float(value), 6):.6f}",
        str(source or ""),
    )
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return f"fp_{digest[:32]}"


def normalize_sample(
    raw: Mapping[str, Any],
    provider: str,
    now: Optional[datetime] = None,
) -> Optional[dict]:
    """
    One provider record turned into a row, or None when it is unusable

    Dropping a bad sample is deliberate. A sync is a batch of hundreds and one
    unreadable entry should not fail the other four hundred, so the caller
    counts what was skipped instead of raising
    """
    metric = normalize_metric(raw.get("metric") or raw.get("type"), provider)
    if metric is None:
        return None

    start_at = parse_instant(raw.get("start_at") or raw.get("start"))
    if start_at is None:
        return None
    end_at = parse_instant(raw.get("end_at") or raw.get("end")) or start_at

    # A reversed interval is a provider bug, and ordering it costs nothing
    if end_at < start_at:
        start_at, end_at = end_at, start_at

    moment = now or datetime.now(timezone.utc)
    if (start_at - moment).total_seconds() > MAX_FUTURE_SKEW_SECONDS:
        return None

    value = convert_value(metric, raw.get("value"), raw.get("unit"))
    if value is None:
        return None

    source = raw.get("source") or raw.get("source_name")
    if is_own_write(source):
        return None

    external_id = raw.get("external_id") or raw.get("id")
    if not isinstance(external_id, str) or not external_id.strip():
        external_id = sample_fingerprint(metric, start_at, end_at, value, source)

    return {
        "provider": provider,
        "external_id": external_id.strip(),
        "metric": metric,
        "value": value,
        "unit": METRICS[metric][1],
        "start_at": start_at,
        "end_at": end_at,
        "source_name": str(source)[:200] if source else None,
        "payload": raw.get("payload") if isinstance(raw.get("payload"), dict) else None,
    }


def normalize_batch(
    raws: Any, provider: str, now: Optional[datetime] = None
) -> tuple[list[dict], int]:
    """
    Normalize a sync batch, deduplicating on external id within the batch

    A provider that reads overlapping windows will send the same record twice
    in one call, and the database constraint would reject the whole insert
    """
    if not isinstance(raws, (list, tuple)):
        return [], 0

    seen: dict[str, dict] = {}
    skipped = 0
    for raw in raws:
        row = normalize_sample(raw, provider, now) if isinstance(raw, Mapping) else None
        if row is None:
            skipped += 1
            continue
        # Later wins, matching the upsert the database will do anyway
        seen[row["external_id"]] = row

    return list(seen.values()), skipped


def reduce_daily(metric: str, values: list[float]) -> Optional[float]:
    """Collapse a day's samples for one metric using that metric's strategy"""
    numbers = [v for v in values if isinstance(v, (int, float)) and v == v]
    if not numbers:
        return None

    strategy = METRICS.get(metric, (None, None, REDUCE_LAST))[2]
    if strategy == REDUCE_SUM:
        return float(sum(numbers))
    if strategy == REDUCE_MEAN:
        return float(sum(numbers)) / len(numbers)
    if strategy == REDUCE_MAX:
        return float(max(numbers))
    return float(numbers[-1])


def normalize_direction(value: Any) -> str:
    """Anything unrecognised is read only, the least surprising default"""
    return value if value in DIRECTIONS else DIRECTION_READ


def direction_allows_read(direction: Any) -> bool:
    return normalize_direction(direction) in (DIRECTION_READ, DIRECTION_BOTH)


def direction_allows_write(direction: Any) -> bool:
    return normalize_direction(direction) in (DIRECTION_WRITE, DIRECTION_BOTH)


def normalize_enabled_metrics(value: Any) -> list[str]:
    """Keep only real metrics, preserving order and dropping repeats"""
    if not isinstance(value, (list, tuple)):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str) and item in METRICS and item not in out:
            out.append(item)
    return out
