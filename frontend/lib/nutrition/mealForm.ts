// lib/nutrition/mealForm.ts
// Shapes the food form's state and turns it back into API payloads.

import {
  blankMacroFields,
  macrosForForm,
  toNumericMacros,
} from './macros';

export interface MealFormData {
  meal_type: string;
  food_name: string;
  brand: string;
  serving_size: number | string;
  serving_unit: string;
  [nutrient: string]: any;
}

export function createEmptyMealForm(mealType = 'lunch'): MealFormData {
  return {
    meal_type: mealType,
    food_name: '',
    brand: '',
    serving_size: '',
    serving_unit: 'g',
    ...blankMacroFields(),
  };
}

/**
 * Builds form state from a food-like object (a diary entry, a search result, a
 * scanned barcode). `foodName` is passed in because callers disagree on whether
 * `name` or `food_name` wins.
 */
export function buildMealForm(
  source: any,
  overrides: {
    mealType: string;
    foodName: string;
    servingSize: number | string;
    servingUnit: string;
  },
): MealFormData {
  return {
    meal_type: overrides.mealType,
    food_name: overrides.foodName,
    brand: source?.brand || '',
    serving_size: overrides.servingSize,
    serving_unit: overrides.servingUnit,
    ...macrosForForm(source),
  };
}

/** The food half of a diary payload: numbers only, no meal_type. */
export function buildFoodPayload(formData: MealFormData) {
  return {
    food_name: formData.food_name,
    brand: formData.brand || '',
    serving_size: Number(formData.serving_size) || 0,
    serving_unit: formData.serving_unit,
    ...toNumericMacros(formData),
  };
}

/**
 * Normalises an already-logged meal back into a diary payload, e.g. when
 * copying it to another day or moving it between meal sections.
 */
export function buildDiaryEntryPayload(meal: any, mealType: string) {
  return {
    meal_type: mealType,
    food_name: meal.food_name || meal.name,
    brand: meal.brand || '',
    serving_size: meal.serving_size,
    serving_unit: meal.serving_unit,
    ...toNumericMacros(meal),
  };
}

/** The same values reshaped for the custom_foods table. */
export function buildCustomFoodPayload(
  payload: ReturnType<typeof buildFoodPayload>,
  baseFood: any,
) {
  const { food_name, serving_size, serving_unit, ...rest } = payload;
  return {
    ...rest,
    name: food_name,
    serving_size: serving_size || 1,
    serving_unit: serving_unit || 'serving',
    custom_servings: baseFood?.custom_servings
      ? [...baseFood.custom_servings]
      : [],
  };
}
