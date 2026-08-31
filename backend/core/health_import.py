"""
Reading an Apple Health export, which is how a browser gets HealthKit data

There is no web API for HealthKit or for Health Connect, and the Google Fit
REST API stopped accepting new developers in May 2024 and is being retired, so
a browser cannot talk to any of the three. What a browser can do is accept the
archive the user exports from the Health app themselves

The file is one XML document holding every sample ever recorded, so it is
routinely hundreds of megabytes. Nothing here loads it whole: `iterparse`
walks the document element by element and each one is discarded as soon as it
has been read. Two limits keep a pathological file from exhausting the process

  * only metrics the caller asked for are kept, and heart rate is left out of
    the default set because a few years of watch wear is millions of rows
  * `max_records` caps what is returned, and the caller is told it truncated

Output is the same loose shape a native plugin sends, so it goes through
`core.health.normalize_batch` like every other provider
"""

from __future__ import annotations

import xml.etree.ElementTree as ElementTree
import zipfile
from typing import IO, Any, Iterator, Optional, Sequence

from core.health import HEALTHKIT_METRICS, METRICS, parse_instant

# Everything except heart rate, which is high frequency and rarely worth the
# import cost. A caller that wants it can ask for it explicitly
DEFAULT_IMPORT_METRICS = tuple(
    metric for metric in METRICS if metric != "heart_rate_bpm"
)

MAX_RECORDS = 200_000

# Name of the document inside the archive the Health app produces
EXPORT_MEMBER_SUFFIX = "export.xml"


class HealthImportError(Exception):
    """The upload was not an Apple Health export we can read"""


def open_export(upload: IO[bytes]) -> IO[bytes]:
    """
    A readable XML stream, whether the upload was the zip or the bare xml

    The Health app shares a zip, but people unpack it before uploading often
    enough that accepting both is worth the six lines
    """
    head = upload.read(4)
    upload.seek(0)

    if head[:2] != b"PK":
        return upload

    try:
        archive = zipfile.ZipFile(upload)
    except zipfile.BadZipFile as exc:
        raise HealthImportError("That file is not a readable archive") from exc

    members = [
        name
        for name in archive.namelist()
        if name.endswith(EXPORT_MEMBER_SUFFIX) and not name.startswith("__MACOSX")
    ]
    if not members:
        raise HealthImportError(
            "No export.xml inside the archive. Share the export from the "
            "Health app rather than a folder of your own"
        )

    # The smallest match is export.xml itself, not export_cda.xml
    members.sort(key=len)
    return archive.open(members[0])


def _record_to_sample(attrs: dict) -> Optional[dict]:
    """A <Record> element as a loose sample, or None when it is not one we map"""
    metric = HEALTHKIT_METRICS.get(attrs.get("type", ""))
    if metric is None:
        return None

    start = attrs.get("startDate")
    end = attrs.get("endDate") or start

    if metric == "sleep_minutes":
        return _sleep_to_sample(attrs, start, end)

    try:
        value: Any = float(attrs.get("value"))
    except (TypeError, ValueError):
        return None

    return {
        "metric": metric,
        "start_at": start,
        "end_at": end,
        "value": value,
        "unit": attrs.get("unit"),
        "source": attrs.get("sourceName"),
    }


def _sleep_to_sample(attrs: dict, start: Any, end: Any) -> Optional[dict]:
    """
    Sleep analysis as minutes, counting only the stages spent asleep

    The category value is a string, so the measurement has to come from the
    interval. In bed is deliberately excluded: it includes the half hour of
    reading before sleep and would overstate the night
    """
    if "Asleep" not in str(attrs.get("value", "")):
        return None

    started = parse_instant(start)
    ended = parse_instant(end)
    if started is None or ended is None:
        return None

    minutes = abs((ended - started).total_seconds()) / 60.0
    if minutes <= 0:
        return None

    return {
        "metric": "sleep_minutes",
        "start_at": start,
        "end_at": end,
        "value": minutes,
        "unit": "min",
        "source": attrs.get("sourceName"),
    }


def _workout_to_sample(attrs: dict) -> Optional[dict]:
    """A <Workout> element as a duration sample"""
    try:
        duration = float(attrs.get("duration"))
    except (TypeError, ValueError):
        return None

    start = attrs.get("startDate")
    return {
        "metric": "workout_minutes",
        "start_at": start,
        "end_at": attrs.get("endDate") or start,
        "value": duration,
        "unit": attrs.get("durationUnit") or "min",
        "source": attrs.get("sourceName"),
        "payload": {"activity_type": attrs.get("workoutActivityType")},
    }


def iter_samples(
    stream: IO[bytes], metrics: Optional[Sequence[str]] = None
) -> Iterator[dict]:
    """Walk the export, yielding one loose sample per element we recognise"""
    wanted = set(metrics or DEFAULT_IMPORT_METRICS)

    try:
        context = ElementTree.iterparse(stream, events=("end",))
        for _, element in context:
            sample = None
            if element.tag == "Record":
                sample = _record_to_sample(element.attrib)
            elif element.tag == "Workout":
                sample = _workout_to_sample(element.attrib)

            # Free the element either way, or the tree grows to the file size
            if element.tag in ("Record", "Workout", "MetadataEntry"):
                element.clear()

            if sample is not None and sample["metric"] in wanted:
                yield sample
    except ElementTree.ParseError as exc:
        raise HealthImportError(
            "That export could not be read. It may have been truncated during "
            "the share"
        ) from exc


def parse_export(
    upload: IO[bytes],
    metrics: Optional[Sequence[str]] = None,
    max_records: int = MAX_RECORDS,
) -> tuple[list[dict], bool]:
    """
    Loose samples from an export, and whether the cap stopped us early

    Truncation is reported rather than raised so a user with a decade of
    history still gets the import they asked for, and can be told what is
    missing
    """
    samples: list[dict] = []
    stream = open_export(upload)

    for sample in iter_samples(stream, metrics):
        if len(samples) >= max_records:
            return samples, True
        samples.append(sample)

    return samples, False
