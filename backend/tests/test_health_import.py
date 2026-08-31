"""
Tests for reading an Apple Health export

The parser is the browser's only route to HealthKit data, so it has to cope
with a file it did not produce: unfamiliar record types, category values that
are strings rather than numbers, and a zip that may or may not be one

Nothing here needs a database or a real export. The fixtures are the same
element shapes the Health app writes, kept small enough to read
"""

import io
import zipfile

import pytest

from core.health import PROVIDER_FILE_IMPORT, normalize_batch
from core.health_import import (
    DEFAULT_IMPORT_METRICS,
    HealthImportError,
    open_export,
    parse_export,
)

EXPORT = """<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_GB">
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Withings"
          unit="kg" startDate="2026-08-30 07:14:22 +0200"
          endDate="2026-08-30 07:14:22 +0200" value="80.4"/>
  <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone"
          unit="count" startDate="2026-08-30 09:00:00 +0200"
          endDate="2026-08-30 10:00:00 +0200" value="1240"/>
  <Record type="HKQuantityTypeIdentifierHeartRate" sourceName="Watch"
          unit="count/min" startDate="2026-08-30 09:05:00 +0200"
          endDate="2026-08-30 09:05:00 +0200" value="72"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch"
          startDate="2026-08-30 23:00:00 +0200"
          endDate="2026-08-31 05:00:00 +0200"
          value="HKCategoryValueSleepAnalysisAsleepCore"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch"
          startDate="2026-08-30 22:00:00 +0200"
          endDate="2026-08-30 23:00:00 +0200"
          value="HKCategoryValueSleepAnalysisInBed"/>
  <Record type="HKQuantityTypeIdentifierSomethingWeDoNotMap" sourceName="iPhone"
          unit="count" startDate="2026-08-30 09:00:00 +0200"
          endDate="2026-08-30 09:00:00 +0200" value="1"/>
  <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining"
           duration="45.5" durationUnit="min" sourceName="FitTrack"
           startDate="2026-08-30 18:00:00 +0200"
           endDate="2026-08-30 18:45:30 +0200">
    <MetadataEntry key="HKIndoorWorkout" value="1"/>
  </Workout>
</HealthData>
"""


def as_stream(text: str = EXPORT) -> io.BytesIO:
    return io.BytesIO(text.encode("utf-8"))


def as_zip(text: str = EXPORT, name: str = "apple_health_export/export.xml"):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(name, text)
    buffer.seek(0)
    return buffer


class TestOpenExport:
    def test_accepts_a_bare_xml_upload(self):
        stream = as_stream()
        assert open_export(stream).read(5) == b"<?xml"

    def test_accepts_the_zip_the_health_app_shares(self):
        assert b"HealthData" in open_export(as_zip()).read()

    def test_prefers_export_over_the_clinical_document(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("apple_health_export/export_cda.xml", "<ClinicalDocument/>")
            archive.writestr("apple_health_export/export.xml", EXPORT)
        buffer.seek(0)
        assert b"HealthData" in open_export(buffer).read()

    def test_ignores_the_macos_resource_fork(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("__MACOSX/._export.xml", "junk")
            archive.writestr("apple_health_export/export.xml", EXPORT)
        buffer.seek(0)
        assert b"HealthData" in open_export(buffer).read()

    def test_rejects_an_archive_without_an_export(self):
        with pytest.raises(HealthImportError):
            open_export(as_zip(name="notes.txt"))

    def test_rejects_something_that_only_looks_like_a_zip(self):
        with pytest.raises(HealthImportError):
            open_export(io.BytesIO(b"PK not really an archive"))


class TestParseExport:
    def test_reads_the_records_it_maps(self):
        samples, truncated = parse_export(as_stream())
        metrics = [sample["metric"] for sample in samples]

        assert truncated is False
        assert "weight_kg" in metrics
        assert "steps" in metrics
        assert "workout_minutes" in metrics

    def test_skips_record_types_it_does_not_map(self):
        samples, _ = parse_export(as_stream())
        assert all(sample["metric"] is not None for sample in samples)
        assert len(samples) == 4

    def test_leaves_heart_rate_out_of_the_default_set(self):
        # A few years of watch wear is millions of rows, and importing them by
        # default would make every upload a timeout
        assert "heart_rate_bpm" not in DEFAULT_IMPORT_METRICS
        samples, _ = parse_export(as_stream())
        assert "heart_rate_bpm" not in {sample["metric"] for sample in samples}

    def test_reads_heart_rate_when_it_is_asked_for(self):
        samples, _ = parse_export(as_stream(), metrics=["heart_rate_bpm"])
        assert [sample["metric"] for sample in samples] == ["heart_rate_bpm"]

    def test_counts_sleep_from_the_interval_and_ignores_time_in_bed(self):
        # In bed includes the half hour of reading first, so counting it would
        # overstate the night
        samples, _ = parse_export(as_stream(), metrics=["sleep_minutes"])
        assert len(samples) == 1
        assert samples[0]["value"] == pytest.approx(360.0)

    def test_carries_the_workout_activity_through(self):
        samples, _ = parse_export(as_stream(), metrics=["workout_minutes"])
        assert samples[0]["value"] == pytest.approx(45.5)
        assert (
            samples[0]["payload"]["activity_type"]
            == "HKWorkoutActivityTypeTraditionalStrengthTraining"
        )

    def test_reports_truncation_rather_than_failing(self):
        samples, truncated = parse_export(as_stream(), max_records=2)
        assert truncated is True
        assert len(samples) == 2

    def test_rejects_a_document_that_was_cut_short(self):
        with pytest.raises(HealthImportError):
            parse_export(as_stream("<HealthData><Record type=\"x\""))


class TestImportedSamplesNormalize:
    def test_an_import_produces_the_same_rows_a_phone_would(self):
        # This is the whole point of the shared normalization: importing the
        # file and connecting the phone later must not create two copies
        samples, _ = parse_export(as_stream())
        rows, skipped = normalize_batch(samples, PROVIDER_FILE_IMPORT)

        assert skipped == 0
        weight = next(row for row in rows if row["metric"] == "weight_kg")
        assert weight["unit"] == "kg"
        assert weight["value"] == pytest.approx(80.4)
        # Nothing in the export carries an id, so every row gets a content hash
        assert all(row["external_id"].startswith("fp_") for row in rows)

    def test_reimporting_the_same_file_produces_the_same_ids(self):
        first, _ = normalize_batch(
            parse_export(as_stream())[0], PROVIDER_FILE_IMPORT
        )
        second, _ = normalize_batch(
            parse_export(as_stream())[0], PROVIDER_FILE_IMPORT
        )
        assert [row["external_id"] for row in first] == [
            row["external_id"] for row in second
        ]
