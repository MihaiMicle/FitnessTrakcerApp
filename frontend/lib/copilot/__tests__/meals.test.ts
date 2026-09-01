/* lib/copilot/__tests__/meals.test.ts */

import { describe, it, expect } from 'vitest';
import {
  exceedsRemaining,
  mealTotals,
  normalizeUnit,
  remainingFromLog,
  toLogMealLines,
} from '../meals';
import type { CopilotMeal } from '../types';

const meal: CopilotMeal = {
  title: 'Chicken bowl',
  meal_type: 'dinner',
  foods: [
    {
      food_name: 'Chicken breast',
      serving_size: 170,
      serving_unit: 'g',
      calories: 280,
      protein_g: 52,
      carbs_g: 0,
      fats_g: 6,
    },
    {
      food_name: 'White rice',
      serving_size: 150,
      serving_unit: 'g',
      calories: 195,
      protein_g: 4,
      carbs_g: 43,
      fats_g: 0.4,
    },
  ],
};

describe('normalizeUnit', () => {
  it('passes a valid unit through', () => {
    expect(normalizeUnit('ml')).toBe('ml');
  });

  it('lowercases before checking', () => {
    expect(normalizeUnit('OZ')).toBe('oz');
  });

  it('falls back to grams for a unit the API would reject', () => {
    /* The model reaches for "cup" and "serving" often enough that letting it
       through would fail the POST after the user tapped log */
    expect(normalizeUnit('cup')).toBe('g');
  });

  it('falls back to grams for a missing unit', () => {
    expect(normalizeUnit(undefined)).toBe('g');
  });
});

describe('mealTotals', () => {
  it('sums every food in the meal', () => {
    expect(mealTotals(meal)).toEqual({
      calories: 475,
      protein_g: 56,
      carbs_g: 43,
      fats_g: 6.4,
    });
  });

  it('returns zeros for a meal with no foods', () => {
    expect(mealTotals({ title: 'x', meal_type: 'lunch', foods: [] })).toEqual({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    });
  });
});

describe('toLogMealLines', () => {
  it('produces one line per food', () => {
    expect(toLogMealLines(meal, '2026-09-01')).toHaveLength(2);
  });

  it('stamps every line with the meal type and date', () => {
    const lines = toLogMealLines(meal, '2026-09-01');
    expect(lines.every((l) => l.meal_type === 'dinner')).toBe(true);
    expect(lines.every((l) => l.date === '2026-09-01')).toBe(true);
  });

  it('rounds calories to an integer', () => {
    /* The Meal model stores calories as an Integer column */
    const lines = toLogMealLines(
      {
        title: 'x',
        meal_type: 'snack',
        foods: [{ ...meal.foods[0], calories: 280.6 }],
      },
      '2026-09-01',
    );
    expect(lines[0].calories).toBe(281);
  });

  it('defaults a missing serving size to 100', () => {
    const lines = toLogMealLines(
      {
        title: 'x',
        meal_type: 'snack',
        foods: [{ ...meal.foods[0], serving_size: 0 }],
      },
      '2026-09-01',
    );
    expect(lines[0].serving_size).toBe(100);
  });
});

describe('exceedsRemaining', () => {
  it('names every macro the meal would blow past', () => {
    const over = exceedsRemaining(mealTotals(meal), {
      calories: 400,
      protein_g: 100,
      carbs_g: 20,
      fats_g: 40,
    });
    expect(over).toEqual(['calories', 'carbs_g']);
  });

  it('returns nothing when the meal fits', () => {
    const over = exceedsRemaining(mealTotals(meal), {
      calories: 900,
      protein_g: 90,
      carbs_g: 120,
      fats_g: 40,
    });
    expect(over).toEqual([]);
  });

  it('returns nothing when there is no remaining data to compare against', () => {
    expect(exceedsRemaining(mealTotals(meal), null)).toEqual([]);
  });

  it('flags a macro the user is already over on', () => {
    expect(
      exceedsRemaining(mealTotals(meal), { calories: -200 }),
    ).toEqual(['calories']);
  });
});

describe('remainingFromLog', () => {
  it('subtracts totals from targets', () => {
    expect(
      remainingFromLog({
        target_calories: 2500,
        total_calories: 1800,
        target_protein_g: 180,
        total_protein_g: 120,
        target_carbs_g: 300,
        total_carbs_g: 200,
        target_fats_g: 70,
        total_fats_g: 50,
      }),
    ).toEqual({ calories: 700, protein_g: 60, carbs_g: 100, fats_g: 20 });
  });

  it('returns null without a log', () => {
    expect(remainingFromLog(null)).toBeNull();
  });

  it('keeps the negative when the user is over', () => {
    expect(
      remainingFromLog({ target_calories: 2000, total_calories: 2300 })
        ?.calories,
    ).toBe(-300);
  });
});
