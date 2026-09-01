/* lib/copilot/meals.ts */

import type { ServingUnit } from '@/types/nutrition';
import type { CopilotFood, CopilotMeal, LogMealLine } from './types';

/*
 * Suggested meals to diary entries.
 *
 * The backend logs one row per food, not one per meal, so a three-item meal is
 * three POSTs. Building the payloads up front means the card can show exactly
 * what will be written before the user commits to it
 */

const VALID_UNITS: ServingUnit[] = ['g', 'oz', 'lb', 'ml', 'fl_oz'];

export interface MealTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

function num(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* Anything the model invents that the API would reject falls back to grams */
export function normalizeUnit(unit: string | undefined): ServingUnit {
  const candidate = (unit ?? '').trim().toLowerCase() as ServingUnit;
  return VALID_UNITS.includes(candidate) ? candidate : 'g';
}

export function mealTotals(meal: CopilotMeal): MealTotals {
  return (meal.foods ?? []).reduce<MealTotals>(
    (totals, food) => ({
      calories: totals.calories + num(food.calories),
      protein_g: totals.protein_g + num(food.protein_g),
      carbs_g: totals.carbs_g + num(food.carbs_g),
      fats_g: totals.fats_g + num(food.fats_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
  );
}

export function toLogMealLines(meal: CopilotMeal, date: string): LogMealLine[] {
  return (meal.foods ?? []).map((food: CopilotFood) => ({
    meal_type: meal.meal_type || 'lunch',
    food_name: food.food_name,
    serving_size: num(food.serving_size) || 100,
    serving_unit: normalizeUnit(food.serving_unit),
    calories: Math.round(num(food.calories)),
    protein_g: num(food.protein_g),
    carbs_g: num(food.carbs_g),
    fats_g: num(food.fats_g),
    fiber_g: num(food.fiber_g),
    sugar_g: num(food.sugar_g),
    date,
  }));
}

/*
 * Whether logging this meal would push the user over on any primary macro.
 *
 * Shown as a warning rather than a block. The user asked for the suggestion and
 * may have a reason to take it anyway, so this informs the decision instead of
 * making it for them
 */
export function exceedsRemaining(
  totals: MealTotals,
  remaining: Partial<MealTotals> | null | undefined,
): (keyof MealTotals)[] {
  if (!remaining) return [];
  const keys: (keyof MealTotals)[] = [
    'calories',
    'protein_g',
    'carbs_g',
    'fats_g',
  ];
  return keys.filter((key) => {
    const left = remaining[key];
    return typeof left === 'number' && totals[key] > left;
  });
}

/* Remaining macros from a DailySummary, for the composer's context strip */
export function remainingFromLog(
  log: Record<string, unknown> | null | undefined,
): MealTotals | null {
  if (!log) return null;
  return {
    calories: num(log.target_calories) - num(log.total_calories),
    protein_g: num(log.target_protein_g) - num(log.total_protein_g),
    carbs_g: num(log.target_carbs_g) - num(log.total_carbs_g),
    fats_g: num(log.target_fats_g) - num(log.total_fats_g),
  };
}
