"""
Nutrient target defaults and meal macro arithmetic, extracted from routers/nutrition.py

Everything here is a function of plain values, not ORM rows, so the fallback
targets and the macro math that update_meal/delete_meal/create_meal rely on can
be unit tested with no database. The router modules stay responsible for
reading and writing DailyLog/Meal rows
"""

from __future__ import annotations

from typing import Mapping, Optional

# One entry per macro/micronutrient the daily log tracks. Meal.<field> and
# DailyLog.total_<field> share these names, water is handled separately since
# it is not part of a logged meal
MACRO_FIELDS = (
    "calories",
    "protein_g",
    "carbs_g",
    "fats_g",
    "saturated_fats_g",
    "fiber_g",
    "sugar_g",
    "potassium_mg",
    "sodium_mg",
    "iron_mg",
    "vitamin_d_mcg",
    "zinc_mg",
    "magnesium_mg",
    "calcium_mg",
    "cholesterol_mg",
)

# calories is intentionally excluded: the update endpoint this was extracted
# from never clamped it, only the other fields, so that stays true here too
CLAMPED_MACRO_FIELDS = tuple(field for field in MACRO_FIELDS if field != "calories")

# Fallback targets when the user's profile has none saved. A falsy saved value
# (unset, or explicitly zero) is treated the same as missing
TARGET_DEFAULTS: dict[str, float] = {
    "target_calories": 2500,
    "target_protein_g": 180,
    "target_carbs_g": 300,
    "target_fats_g": 70,
    "target_saturated_fats_g": 20,
    "target_fiber_g": 30,
    "target_sugar_g": 50,
    "target_potassium_mg": 4000,
    "target_sodium_mg": 2300,
    "target_iron_mg": 8.0,
    "target_vitamin_d_mcg": 25.0,
    "target_zinc_mg": 11.0,
    "target_magnesium_mg": 400.0,
    "target_calcium_mg": 1200.0,
    "target_cholesterol_mg": 300.0,
    "target_water_ml": 3000,
}


def resolve_targets(profile: Optional[object]) -> dict[str, float]:
    """The user's saved targets, falling back to app defaults field by field"""
    return {
        field: (getattr(profile, field, None) or default) if profile else default
        for field, default in TARGET_DEFAULTS.items()
    }


def meal_macros(meal: object) -> dict[str, float]:
    """A meal's macros as a plain dict, keyed the same as MACRO_FIELDS"""
    return {field: getattr(meal, field) for field in MACRO_FIELDS}


def add_macros(
    totals: Mapping[str, float], macros: Mapping[str, float]
) -> dict[str, float]:
    """Daily totals after a new meal is logged"""
    return {
        field: (totals.get(field) or 0) + (macros.get(field) or 0)
        for field in MACRO_FIELDS
    }


def subtract_macros(
    totals: Mapping[str, float], macros: Mapping[str, float]
) -> dict[str, float]:
    """Daily totals after a meal is deleted, floored at zero on every field"""
    result = {
        "calories": max(0, (totals.get("calories") or 0) - (macros.get("calories") or 0))
    }
    for field in CLAMPED_MACRO_FIELDS:
        result[field] = max(0.0, (totals.get(field) or 0) - (macros.get(field) or 0))
    return result


def apply_macro_delta(
    totals: Mapping[str, float],
    old_macros: Mapping[str, float],
    new_macros: Mapping[str, float],
) -> dict[str, float]:
    """
    Daily totals after an already logged meal's macros change

    Calories are not floored at zero, matching the endpoint this was pulled
    from; every other field is, so editing a meal down cannot push a total
    negative
    """
    result = {
        "calories": (totals.get("calories") or 0)
        + ((new_macros.get("calories") or 0) - (old_macros.get("calories") or 0))
    }
    for field in CLAMPED_MACRO_FIELDS:
        result[field] = max(
            0.0,
            (totals.get(field) or 0)
            + ((new_macros.get(field) or 0) - (old_macros.get(field) or 0)),
        )
    return result
