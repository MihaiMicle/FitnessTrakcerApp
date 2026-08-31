"""
Tests for the rules that turn any provider's record into one of ours

`core/health.py` imports nothing from the app, so none of this needs a
database. The metric table and the unit factors are pinned here and in
`frontend/lib/health/__tests__/metrics.test.ts`, so a change to one side
without the other fails a test instead of producing a phone and a browser
that disagree about what a kilogram is
"""

from datetime import datetime, timedelta, timezone

import pytest

from core.health import (
    DIRECTION_BOTH,
    DIRECTION_READ,
    DIRECTION_WRITE,
    HEALTHKIT_METRICS,
    HEALTH_CONNECT_METRICS,
    METRICS,
    PROVIDER_APPLE_HEALTH,
    PROVIDER_HEALTH_CONNECT,
    SELF_SOURCE_NAME,
    UNIT_FACTORS,
    convert_value,
    direction_allows_read,
    direction_allows_write,
    is_own_write,
    normalize_batch,
    normalize_direction,
    normalize_enabled_metrics,
    normalize_metric,
    normalize_sample,
    normalize_unit,
    parse_instant,
    reduce_daily,
    sample_fingerprint,
)

NOW = datetime(2026, 8, 31, 12, 0, tzinfo=timezone.utc)


class TestMetricTable:
    def test_every_metric_declares_a_known_unit(self):
        for metric, (dimension, unit, _) in METRICS.items():
            assert unit in UNIT_FACTORS, metric
            assert UNIT_FACTORS[unit][0] == dimension, metric

    def test_provider_maps_only_point_at_real_metrics(self):
        for table in (HEALTHKIT_METRICS, HEALTH_CONNECT_METRICS):
            for identifier, metric in table.items():
                assert metric in METRICS, identifier

    def test_the_canonical_set_is_pinned(self):
        # Mirrors CANONICAL_METRICS in frontend/lib/health/metrics.ts
        assert set(METRICS) == {
            "weight_kg",
            "body_fat_percent",
            "height_cm",
            "steps",
            "active_energy_kcal",
            "resting_energy_kcal",
            "heart_rate_bpm",
            "resting_heart_rate_bpm",
            "distance_km",
            "sleep_minutes",
            "water_ml",
            "energy_intake_kcal",
            "protein_g",
            "carbs_g",
            "fat_g",
            "workout_minutes",
        }


class TestNormalizeUnit:
    @pytest.mark.parametrize(
        "given,expected",
        [
            ("kg", "kg"),
            ("Kilograms", "kg"),
            ("lbs", "lb"),
            ("%", "percent"),
            ("count/min", "bpm"),
            ("  KCAL  ", "kcal"),
            ("mL", "ml"),
        ],
    )
    def test_folds_real_spellings(self, given, expected):
        assert normalize_unit(given) == expected

    @pytest.mark.parametrize("given", ["parsecs", "", None, 5, "kg/m2"])
    def test_rejects_anything_else(self, given):
        assert normalize_unit(given) is None


class TestNormalizeMetric:
    def test_canonical_names_pass_through(self):
        assert normalize_metric("weight_kg") == "weight_kg"

    def test_maps_healthkit_identifiers(self):
        assert (
            normalize_metric("HKQuantityTypeIdentifierStepCount", PROVIDER_APPLE_HEALTH)
            == "steps"
        )

    def test_maps_health_connect_records(self):
        assert (
            normalize_metric("HydrationRecord", PROVIDER_HEALTH_CONNECT) == "water_ml"
        )

    def test_falls_back_to_both_vocabularies_without_a_hint(self):
        assert normalize_metric("WeightRecord") == "weight_kg"
        assert normalize_metric("HKQuantityTypeIdentifierBodyMass") == "weight_kg"

    @pytest.mark.parametrize("given", ["nonsense", None, 7, ""])
    def test_unknown_names_are_dropped(self, given):
        assert normalize_metric(given) is None


class TestConvertValue:
    def test_converts_within_a_dimension(self):
        assert convert_value("weight_kg", 176.37, "lb") == pytest.approx(80.0, abs=0.01)

    def test_converts_distance_to_kilometres(self):
        assert convert_value("distance_km", 1, "mi") == pytest.approx(1.609344)

    def test_converts_volume_to_millilitres(self):
        assert convert_value("water_ml", 2, "l") == pytest.approx(2000.0)

    def test_converts_duration_to_minutes(self):
        assert convert_value("sleep_minutes", 7, "h") == pytest.approx(420.0)

    def test_a_missing_unit_means_the_value_is_already_canonical(self):
        assert convert_value("steps", 8000, None) == 8000.0

    def test_refuses_to_read_a_unit_from_another_dimension(self):
        # Reading a kilogram as a kilometre is worse than dropping the sample
        assert convert_value("weight_kg", 80, "km") is None

    @pytest.mark.parametrize("value", [None, "80", True, float("nan")])
    def test_rejects_values_that_are_not_numbers(self, value):
        assert convert_value("weight_kg", value, "kg") is None

    def test_rejects_an_unknown_metric(self):
        assert convert_value("mood", 5, "count") is None


class TestParseInstant:
    def test_reads_iso_with_a_zulu_suffix(self):
        assert parse_instant("2026-08-31T12:00:00Z") == NOW

    def test_reads_the_apple_export_format(self):
        parsed = parse_instant("2026-08-31 14:00:00 +0200")
        assert parsed == NOW

    def test_reads_epoch_seconds_and_milliseconds(self):
        assert parse_instant(NOW.timestamp()) == NOW
        assert parse_instant(NOW.timestamp() * 1000) == NOW

    def test_assumes_utc_when_no_offset_is_given(self):
        assert parse_instant("2026-08-31T12:00:00") == NOW

    @pytest.mark.parametrize("given", ["", None, "yesterday", {}])
    def test_rejects_anything_unreadable(self, given):
        assert parse_instant(given) is None


class TestSampleFingerprint:
    def test_is_stable_for_the_same_content(self):
        args = ("weight_kg", NOW, NOW, 80.0, "Withings")
        assert sample_fingerprint(*args) == sample_fingerprint(*args)

    def test_changes_with_the_value(self):
        a = sample_fingerprint("weight_kg", NOW, NOW, 80.0, "Withings")
        b = sample_fingerprint("weight_kg", NOW, NOW, 80.5, "Withings")
        assert a != b

    def test_ignores_float_noise_below_the_rounding(self):
        a = sample_fingerprint("weight_kg", NOW, NOW, 80.0, None)
        b = sample_fingerprint("weight_kg", NOW, NOW, 80.0000000001, None)
        assert a == b


class TestNormalizeSample:
    def test_builds_a_row_from_a_healthkit_record(self):
        row = normalize_sample(
            {
                "metric": "HKQuantityTypeIdentifierBodyMass",
                "value": 176.37,
                "unit": "lb",
                "start_at": "2026-08-31T12:00:00Z",
                "external_id": "hk-1",
                "source": "Withings",
            },
            PROVIDER_APPLE_HEALTH,
            now=NOW,
        )
        assert row["metric"] == "weight_kg"
        assert row["unit"] == "kg"
        assert row["value"] == pytest.approx(80.0, abs=0.01)
        assert row["external_id"] == "hk-1"
        assert row["end_at"] == row["start_at"]

    def test_synthesises_an_id_when_the_provider_has_none(self):
        row = normalize_sample(
            {"metric": "steps", "value": 900, "start_at": "2026-08-31T12:00:00Z"},
            PROVIDER_HEALTH_CONNECT,
            now=NOW,
        )
        assert row["external_id"].startswith("fp_")

    def test_orders_a_reversed_interval(self):
        row = normalize_sample(
            {
                "metric": "steps",
                "value": 10,
                "start_at": "2026-08-31T12:00:00Z",
                "end_at": "2026-08-31T11:00:00Z",
            },
            PROVIDER_HEALTH_CONNECT,
            now=NOW,
        )
        assert row["start_at"] < row["end_at"]

    def test_drops_a_sample_from_the_far_future(self):
        assert (
            normalize_sample(
                {
                    "metric": "steps",
                    "value": 10,
                    "start_at": (NOW + timedelta(days=30)).isoformat(),
                },
                PROVIDER_HEALTH_CONNECT,
                now=NOW,
            )
            is None
        )

    def test_drops_what_this_app_wrote_out_itself(self):
        # Otherwise a workout we pushed into the health store comes straight
        # back in on the next read and gets counted twice
        assert (
            normalize_sample(
                {
                    "metric": "workout_minutes",
                    "value": 45,
                    "unit": "min",
                    "start_at": "2026-08-31T12:00:00Z",
                    "source": f"{SELF_SOURCE_NAME} iOS",
                },
                PROVIDER_APPLE_HEALTH,
                now=NOW,
            )
            is None
        )

    @pytest.mark.parametrize(
        "raw",
        [
            {"metric": "unknown", "value": 1, "start_at": "2026-08-31T12:00:00Z"},
            {"metric": "steps", "value": 1},
            {"metric": "steps", "start_at": "2026-08-31T12:00:00Z"},
            {"metric": "weight_kg", "value": 80, "unit": "km", "start_at": "2026-08-31T12:00:00Z"},
        ],
    )
    def test_drops_unusable_records(self, raw):
        assert normalize_sample(raw, PROVIDER_HEALTH_CONNECT, now=NOW) is None


class TestNormalizeBatch:
    def test_counts_what_it_skipped(self):
        rows, skipped = normalize_batch(
            [
                {"metric": "steps", "value": 100, "start_at": "2026-08-31T10:00:00Z"},
                {"metric": "nope", "value": 1, "start_at": "2026-08-31T10:00:00Z"},
                "not a record",
            ],
            PROVIDER_HEALTH_CONNECT,
            now=NOW,
        )
        assert len(rows) == 1
        assert skipped == 2

    def test_collapses_a_repeat_inside_one_batch(self):
        # A device reading overlapping windows sends the same record twice, and
        # the unique constraint would otherwise reject the whole insert
        sample = {
            "metric": "steps",
            "value": 100,
            "start_at": "2026-08-31T10:00:00Z",
            "external_id": "hc-1",
        }
        rows, _ = normalize_batch([sample, sample], PROVIDER_HEALTH_CONNECT, now=NOW)
        assert len(rows) == 1

    def test_a_non_list_is_an_empty_batch(self):
        assert normalize_batch(None, PROVIDER_HEALTH_CONNECT) == ([], 0)


class TestReduceDaily:
    def test_steps_add_up(self):
        assert reduce_daily("steps", [100.0, 250.0]) == 350.0

    def test_weight_takes_the_last_reading(self):
        assert reduce_daily("weight_kg", [80.0, 79.5]) == 79.5

    def test_heart_rate_averages(self):
        assert reduce_daily("heart_rate_bpm", [60.0, 80.0]) == 70.0

    def test_an_empty_day_has_no_value(self):
        assert reduce_daily("steps", []) is None
        assert reduce_daily("steps", [float("nan")]) is None


class TestConsent:
    @pytest.mark.parametrize("given", ["sideways", None, "", 3])
    def test_an_unrecognised_direction_is_read_only(self, given):
        assert normalize_direction(given) == DIRECTION_READ

    def test_both_allows_each_direction(self):
        assert direction_allows_read(DIRECTION_BOTH)
        assert direction_allows_write(DIRECTION_BOTH)

    def test_write_only_does_not_allow_reading(self):
        assert not direction_allows_read(DIRECTION_WRITE)

    def test_enabled_metrics_keeps_order_and_drops_junk(self):
        assert normalize_enabled_metrics(
            ["steps", "nope", "steps", "weight_kg", 4]
        ) == ["steps", "weight_kg"]

    def test_enabled_metrics_of_a_non_list_is_empty(self):
        assert normalize_enabled_metrics("steps") == []

    def test_recognises_our_own_source_name(self):
        assert is_own_write(f"{SELF_SOURCE_NAME} Android")
        assert not is_own_write("Withings Health Mate")
        assert not is_own_write(None)
