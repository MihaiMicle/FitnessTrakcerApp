"""
Tests for the pure nutrient target/macro math in core/nutrition.py

These pin the fallback targets and the add/subtract/delta arithmetic that
routers/nutrition/{logs,meals}.py apply to DailyLog rows, so the numbers in
this module can be trusted without a database
"""

from types import SimpleNamespace

from core.nutrition import (
    CLAMPED_MACRO_FIELDS,
    MACRO_FIELDS,
    TARGET_DEFAULTS,
    add_macros,
    apply_macro_delta,
    meal_macros,
    resolve_targets,
    subtract_macros,
)


class TestResolveTargets:
    def test_no_profile_uses_every_default(self):
        assert resolve_targets(None) == TARGET_DEFAULTS

    def test_a_saved_value_wins_over_the_default(self):
        profile = SimpleNamespace(target_calories=2200, target_protein_g=None)
        targets = resolve_targets(profile)
        assert targets["target_calories"] == 2200
        assert targets["target_protein_g"] == TARGET_DEFAULTS["target_protein_g"]

    def test_a_zero_saved_value_falls_back_to_the_default(self):
        # Matches the original router: a falsy saved value counts as unset
        profile = SimpleNamespace(target_water_ml=0)
        assert resolve_targets(profile)["target_water_ml"] == TARGET_DEFAULTS[
            "target_water_ml"
        ]

    def test_every_target_field_is_covered(self):
        profile = SimpleNamespace()
        targets = resolve_targets(profile)
        assert set(targets) == set(TARGET_DEFAULTS)


class TestMealMacros:
    def test_reads_every_macro_field_off_the_meal(self):
        meal = SimpleNamespace(**{field: 1 for field in MACRO_FIELDS})
        assert meal_macros(meal) == {field: 1 for field in MACRO_FIELDS}


class TestAddMacros:
    def test_adds_a_meals_macros_onto_the_days_totals(self):
        totals = {field: 10 for field in MACRO_FIELDS}
        macros = {field: 5 for field in MACRO_FIELDS}
        result = add_macros(totals, macros)
        assert result == {field: 15 for field in MACRO_FIELDS}

    def test_missing_fields_count_as_zero(self):
        assert add_macros({}, {})["calories"] == 0


class TestSubtractMacros:
    def test_removes_a_meals_macros_from_the_days_totals(self):
        totals = {field: 10 for field in MACRO_FIELDS}
        macros = {field: 4 for field in MACRO_FIELDS}
        result = subtract_macros(totals, macros)
        assert result == {field: 6 for field in MACRO_FIELDS}

    def test_every_field_floors_at_zero_including_calories(self):
        totals = {field: 3 for field in MACRO_FIELDS}
        macros = {field: 10 for field in MACRO_FIELDS}
        result = subtract_macros(totals, macros)
        assert result == {field: 0 for field in MACRO_FIELDS}


class TestApplyMacroDelta:
    def test_a_larger_new_value_increases_the_total(self):
        totals = {field: 10 for field in MACRO_FIELDS}
        old = {field: 5 for field in MACRO_FIELDS}
        new = {field: 8 for field in MACRO_FIELDS}
        result = apply_macro_delta(totals, old, new)
        assert result == {field: 13 for field in MACRO_FIELDS}

    def test_clamped_fields_floor_at_zero(self):
        totals = {field: 2 for field in CLAMPED_MACRO_FIELDS}
        old = {field: 10 for field in CLAMPED_MACRO_FIELDS}
        new = {field: 0 for field in CLAMPED_MACRO_FIELDS}
        result = apply_macro_delta(totals, old, new)
        assert all(result[field] == 0 for field in CLAMPED_MACRO_FIELDS)

    def test_calories_are_not_clamped_even_though_every_other_field_is(self):
        # Pinned as-is: the endpoint this was extracted from floors every
        # field except calories, which can go negative on a big downward edit
        totals = {"calories": 2, **{f: 2 for f in CLAMPED_MACRO_FIELDS}}
        old = {"calories": 10, **{f: 10 for f in CLAMPED_MACRO_FIELDS}}
        new = {"calories": 0, **{f: 0 for f in CLAMPED_MACRO_FIELDS}}
        result = apply_macro_delta(totals, old, new)
        assert result["calories"] == -8
        assert all(result[f] == 0 for f in CLAMPED_MACRO_FIELDS)
