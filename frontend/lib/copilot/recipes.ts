/* lib/copilot/recipes.ts */

import { scaleMacros, sumMacros, type MacroTotals } from '@/lib/nutrition/macros';
import { normalizeUnit } from './meals';
import type { CopilotFood, CopilotRecipe } from './types';

/* Suggested recipes to rows in the recipes table, in the same shape the recipe builder writes */

export interface RecipeRecord {
  name: string;
  servings: number;
  ingredients: CopilotFood[];
  macros_per_serving: MacroTotals;
}

function num(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* Guard for the card, so an empty recipe never gets a save button */
export function isUsableRecipe(recipe: unknown): recipe is CopilotRecipe {
  if (!recipe || typeof recipe !== 'object') return false;
  const candidate = recipe as CopilotRecipe;
  return Array.isArray(candidate.ingredients) && candidate.ingredients.length > 0;
}

/* Whole number of at least one, since the totals are divided by it */
export function recipeServings(recipe: CopilotRecipe): number {
  const servings = Math.round(num(recipe.servings));
  return servings >= 1 ? servings : 1;
}

export function toRecipeIngredients(recipe: CopilotRecipe): CopilotFood[] {
  return (recipe.ingredients ?? []).map((food) => ({
    food_name: food.food_name || 'Food',
    serving_size: num(food.serving_size) || 100,
    serving_unit: normalizeUnit(food.serving_unit),
    calories: Math.round(num(food.calories)),
    protein_g: num(food.protein_g),
    carbs_g: num(food.carbs_g),
    fats_g: num(food.fats_g),
    fiber_g: num(food.fiber_g),
    sugar_g: num(food.sugar_g),
  }));
}

/* Same arithmetic as the recipe builder, so both paths agree on the numbers */
export function recipePerServing(recipe: CopilotRecipe): MacroTotals {
  return scaleMacros(
    sumMacros(toRecipeIngredients(recipe)),
    1 / recipeServings(recipe),
  );
}

export function toRecipeRecord(recipe: CopilotRecipe): RecipeRecord {
  return {
    name: recipe.name?.trim() || 'New recipe',
    servings: recipeServings(recipe),
    ingredients: toRecipeIngredients(recipe),
    macros_per_serving: recipePerServing(recipe),
  };
}
