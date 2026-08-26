"""
Tests for the TDEE / macro engine.

These are characterisation tests: they lock in what the function does today so
that refactoring it (or moving it out of the router) can't silently change a
user's calorie target. Where current behaviour looks wrong, the test says so in
a comment rather than quietly asserting it's correct

Expected values are computed by hand from the documented formulas, not copied
from the function's output
"""

import pytest

from core.calculations import (
    MACRO_RESULT_FIELDS,
    calculate_macros,
    macros_as_dict,
)

# A healthy 30-year-old man, 80 kg, 180 cm, training hard. Used as the baseline
# for most assertions so that only one variable changes at a time
BASELINE = dict(
    weight_kg=80,
    height_cm=180,
    age=30,
    gender="male",
    activity_level=1.55,
    goal="maintain",
)


def macros(**overrides):
    return macros_as_dict(**{**BASELINE, **overrides})


# Return shape
def test_returns_sixteen_values_in_documented_order():
    """
    The router unpacks this tuple positionally across five separate assignments.
    If someone appends a field to the return without updating the caller, every
    target after the insertion point silently shifts by one. This test and
    MACRO_RESULT_FIELDS are the guard rail for that.
    """
    result = calculate_macros(**BASELINE)
    assert len(result) == 16
    assert len(MACRO_RESULT_FIELDS) == 16


def test_macro_totals_are_never_negative():
    assert all(v >= 0 for v in calculate_macros(**BASELINE))


# BMR: Mifflin-St Jeor
def test_mifflin_st_jeor_male():
    # BMR = 10(80) + 6.25(180) - 5(30) + 5 = 800 + 1125 - 150 + 5 = 1780
    # TDEE = 1780 * 1.55 = 2759
    assert macros()["calories"] == 2759


def test_mifflin_st_jeor_female():
    # BMR = 10(65) + 6.25(165) - 5(28) - 161 = 650 + 1031.25 - 140 - 161 = 1380.25
    # TDEE = 1380.25 * 1.375 = 1897.84...  cut -> int(1397.84) = 1397
    assert (
        macros(
            weight_kg=65,
            height_cm=165,
            age=28,
            gender="female",
            activity_level=1.375,
            goal="cut",
        )["calories"]
        == 1397
    )


@pytest.mark.parametrize("gender", ["female", "other", "non-binary", "", None, "MALE"])
def test_any_gender_other_than_lowercase_male_gets_the_female_constant(gender):
    """
    The branch is `5 if gender == "male" else -161`. Everything else — including
    "MALE" with different casing — takes the -161 path. Worth knowing before the
    profile form ever offers a third option or the client changes casing.
    """
    female_baseline = macros(gender="female")["calories"]
    assert macros(gender=gender)["calories"] == female_baseline


def test_male_and_female_differ_by_the_expected_166_kcal_of_bmr():
    # +5 vs -161 is a 166 kcal BMR gap, scaled by the activity multiplier.
    male = macros(gender="male", goal="maintain")["calories"]
    female = macros(gender="female", goal="maintain")["calories"]
    assert male - female == pytest.approx(166 * 1.55, abs=1)


# BMR: Katch-McArdle
def test_katch_mcardle_used_when_body_fat_is_known():
    # LBM = 80 * (1 - 0.20) = 64 kg
    # BMR = 370 + 21.6(64) = 370 + 1382.4 = 1752.4
    # TDEE = 1752.4 * 1.55 = 2716.22 -> int = 2716
    assert macros(body_fat_percentage=20.0)["calories"] == 2716


@pytest.mark.parametrize("body_fat", [None, 0, 0.0])
def test_zero_or_missing_body_fat_falls_back_to_mifflin(body_fat):
    """
    The guard is `is not None and > 0`, so a user who types 0 into the body fat
    field gets Mifflin rather than a Katch calculation against their full
    bodyweight. That's the right call — this test pins it.
    """
    assert macros(body_fat_percentage=body_fat)["calories"] == 2759


def test_katch_ignores_height_and_age():
    """Katch-McArdle is a function of lean mass only — a useful invariant."""
    a = macros(body_fat_percentage=20.0, height_cm=150, age=20)
    b = macros(body_fat_percentage=20.0, height_cm=200, age=65)
    assert a["calories"] == b["calories"]


# Goal adjustment
@pytest.mark.parametrize(
    "goal, expected",
    [
        ("cut", 2259),  # 2759 - 500
        ("maintain", 2759),
        ("bulk", 3059),  # 2759 + 300
    ],
)
def test_goal_shifts_calories(goal, expected):
    assert macros(goal=goal)["calories"] == expected


@pytest.mark.parametrize("goal", ["recomp", "", None, "CUT", "gain"])
def test_unrecognised_goal_falls_through_to_maintain(goal):
    """
    There's no validation here — any string that isn't exactly "cut" or "bulk"
    silently means maintain. If the frontend ever sends "Cut", the user gets a
    500 kcal surplus over what they asked for and nothing errors.
    """
    assert macros(goal=goal)["calories"] == 2759


def test_calories_floor_at_1200():
    # Small, older, sedentary, cutting: TDEE 1111.8, minus 500 = 611 -> floored
    result = macros(
        weight_kg=45,
        height_cm=150,
        age=60,
        gender="female",
        activity_level=1.2,
        goal="cut",
    )
    assert result["calories"] == 1200


# Macro split
def test_protein_is_2_2g_per_kg_and_ignores_calorie_target():
    assert macros(weight_kg=80)["protein_g"] == 176  # 80 * 2.2
    assert macros(weight_kg=62.5)["protein_g"] == 137  # int(137.5)


def test_protein_is_driven_by_bodyweight_not_by_goal():
    assert macros(goal="cut")["protein_g"] == macros(goal="bulk")["protein_g"]


def test_fats_are_25_percent_of_calories():
    result = macros()
    assert result["fats_g"] == int((result["calories"] * 0.25) / 9)
    assert result["fats_g"] == 76  # (2759 * 0.25) / 9 = 76.6


def test_carbs_absorb_the_remaining_calories():
    result = macros()
    remaining = result["calories"] - (result["protein_g"] * 4 + result["fats_g"] * 9)
    assert result["carbs_g"] == remaining // 4
    assert result["carbs_g"] == 342


@pytest.mark.parametrize(
    "weight_kg, height_cm, age, gender, activity_level, goal",
    [
        (80, 180, 30, "male", 1.55, "maintain"),
        (65, 165, 28, "female", 1.375, "cut"),
        (95, 190, 45, "male", 1.2, "bulk"),
        (50, 155, 22, "female", 1.9, "maintain"),
        (120, 185, 55, "male", 1.725, "cut"),
    ],
)
def test_macro_grams_reconstruct_the_calorie_target(
    weight_kg, height_cm, age, gender, activity_level, goal
):
    """
    protein*4 + carbs*4 + fats*9 should land on the calorie target. Integer
    truncation costs at most a few kcal. Verified across a 25,200-case grid:
    the worst drift on the Mifflin path is 3 kcal.

    This is the test that catches a transposed coefficient — swapping the 4 and
    the 9 still produces plausible-looking gram counts, and nothing else here
    would notice.
    """
    r = macros_as_dict(weight_kg, height_cm, age, gender, activity_level, goal)
    from_grams = r["protein_g"] * 4 + r["carbs_g"] * 4 + r["fats_g"] * 9
    assert from_grams == pytest.approx(r["calories"], abs=4)


# Known defect: the carb remainder can go negative
#
# Protein is 2.2 g/kg of *total* bodyweight while Katch-McArdle computes BMR
# from *lean* mass. For a heavy user with high body fat on a cut, the protein
# target alone can exceed the calorie target. `max(..., 0)` clamps carbs to
# zero, so the numbers stay non-negative but no longer add up
HIGH_BODY_FAT_CUT = dict(
    weight_kg=150,
    height_cm=170,
    age=45,
    gender="male",
    activity_level=1.2,
    goal="cut",
    body_fat_percentage=60.0,
)


def test_carbs_clamp_to_zero_rather_than_going_negative():
    """Current behaviour. The clamp works; the inputs to it are the problem."""
    result = macros_as_dict(**HIGH_BODY_FAT_CUT)
    assert result["carbs_g"] == 0
    assert result["sugar_g"] == 0.0
    assert result["fiber_g"] == 0.0


@pytest.mark.xfail(
    strict=True,
    reason=(
        "Known defect: 150 kg at 60% body fat cutting gets a 1499 kcal target but "
        "330 g protein + 41 g fat = 1689 kcal, a 13% overshoot, and a 0 g carb "
        "prescription. Protein should be capped against the calorie target (or "
        "based on lean mass) when the remainder goes negative. Remove this xfail "
        "once that's fixed."
    ),
)
def test_macro_grams_reconstruct_calories_even_at_high_body_fat():
    r = macros_as_dict(**HIGH_BODY_FAT_CUT)
    from_grams = r["protein_g"] * 4 + r["carbs_g"] * 4 + r["fats_g"] * 9
    assert from_grams == pytest.approx(r["calories"], abs=4)


# Sub-macros derived from carbs and fats
def test_sub_macros_scale_off_their_parents():
    r = macros()
    assert r["sugar_g"] == round(r["carbs_g"] * 0.10, 1)
    assert r["fiber_g"] == round(r["carbs_g"] * 0.14, 1)
    assert r["saturated_fats_g"] == round(r["fats_g"] * 0.25, 1)


def test_sub_macros_keep_one_decimal_place():
    r = macros()
    for field in ("sugar_g", "fiber_g", "saturated_fats_g"):
        assert round(r[field], 1) == r[field], f"{field} carries extra precision"


def test_sugar_target_stays_below_total_carbs():
    r = macros()
    assert r["sugar_g"] < r["carbs_g"]
    assert r["fiber_g"] < r["carbs_g"]


# Water
@pytest.mark.parametrize(
    "weight_kg, expected_ml",
    [(80, 2800), (65, 2275), (100, 3500), (52.4, 1834)],
)
def test_water_is_35ml_per_kg(weight_kg, expected_ml):
    assert macros(weight_kg=weight_kg)["water_ml"] == expected_ml


def test_water_is_independent_of_goal_and_activity():
    assert (
        macros(goal="cut", activity_level=1.2)["water_ml"]
        == macros(goal="bulk", activity_level=1.9)["water_ml"]
    )


# Electrolytes: the activity_level >= 1.55 threshold
SEDENTARY_ELECTROLYTES = {
    "sodium_mg": 2300.0,
    "potassium_mg": 4000.0,
    "magnesium_mg": 350.0,
}
ACTIVE_ELECTROLYTES = {
    "sodium_mg": 3500.0,
    "potassium_mg": 4500.0,
    "magnesium_mg": 450.0,
}


@pytest.mark.parametrize(
    "activity_level, expected",
    [
        (1.2, SEDENTARY_ELECTROLYTES),
        (1.375, SEDENTARY_ELECTROLYTES),
        (1.5499, SEDENTARY_ELECTROLYTES),
        (1.55, ACTIVE_ELECTROLYTES),
        (1.725, ACTIVE_ELECTROLYTES),
        (1.9, ACTIVE_ELECTROLYTES),
    ],
)
def test_electrolyte_targets_switch_at_1_55(activity_level, expected):
    r = macros(activity_level=activity_level)
    for field, value in expected.items():
        assert r[field] == value


def test_string_activity_level_raises_instead_of_misbranching():
    """
    `tdee = bmr * float(activity_level)` coerces, but the electrolyte branch
    compares `activity_level >= 1.55` without coercing. A string activity level
    therefore raises rather than silently picking the wrong branch — better than
    a wrong answer, but the caller should still be sending a float
    """
    with pytest.raises(TypeError):
        macros(activity_level="1.55")


# Micronutrient baselines (fixed constants)
@pytest.mark.parametrize(
    "field, value",
    [
        ("iron_mg", 8.0),
        ("zinc_mg", 11.0),
        ("calcium_mg", 1200.0),
        ("vitamin_d_mcg", 25.0),
        ("cholesterol_mg", 300.0),
    ],
)
def test_micronutrient_baselines_are_constant(field, value):
    """
    These don't vary by user today
    Pinned so that if phase 4 makes them
    personalised, every place that assumed a constant shows up as a failure
    """
    assert macros()[field] == value
    assert macros(weight_kg=120, gender="female", goal="bulk")[field] == value


# Monotonicity — properties that must hold whatever the coefficients become
def test_heavier_user_gets_more_calories_protein_and_water():
    light = macros(weight_kg=60)
    heavy = macros(weight_kg=100)
    assert heavy["calories"] > light["calories"]
    assert heavy["protein_g"] > light["protein_g"]
    assert heavy["water_ml"] > light["water_ml"]


def test_older_user_gets_fewer_calories():
    assert macros(age=60)["calories"] < macros(age=25)["calories"]


def test_higher_activity_gets_more_calories():
    levels = [1.2, 1.375, 1.55, 1.725, 1.9]
    calories = [macros(activity_level=lvl)["calories"] for lvl in levels]
    assert calories == sorted(calories)
    assert len(set(calories)) == len(levels)


def test_cut_is_below_maintain_is_below_bulk():
    assert macros(goal="cut")["calories"] < macros(goal="maintain")["calories"]
    assert macros(goal="maintain")["calories"] < macros(goal="bulk")["calories"]
