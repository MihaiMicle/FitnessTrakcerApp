/* lib/copilot/__tests__/recipes.test.ts */

import { describe, it, expect } from 'vitest';
import {
  isUsableRecipe,
  recipePerServing,
  recipeServings,
  toRecipeIngredients,
  toRecipeRecord,
} from '../recipes';
import type { CopilotRecipe } from '../types';

const recipe: CopilotRecipe = {
  name: 'Burrito bowls',
  servings: 4,
  steps: ['Dice the chicken', 'Cook it'],
  ingredients: [
    {
      food_name: 'Chicken breast',
      serving_size: 700,
      serving_unit: 'g',
      calories: 1155,
      protein_g: 217,
      carbs_g: 0,
      fats_g: 25,
    },
    {
      food_name: 'White rice',
      serving_size: 600,
      serving_unit: 'g',
      calories: 780,
      protein_g: 16,
      carbs_g: 172,
      fats_g: 2,
    },
  ],
};

describe('isUsableRecipe', () => {
  it('accepts a recipe with ingredients', () => {
    expect(isUsableRecipe(recipe)).toBe(true);
  });

  it('rejects null, non-objects and empty ingredient lists', () => {
    expect(isUsableRecipe(null)).toBe(false);
    expect(isUsableRecipe('recipe')).toBe(false);
    expect(isUsableRecipe({ ...recipe, ingredients: [] })).toBe(false);
  });
});

describe('recipeServings', () => {
  it('passes a valid count through', () => {
    expect(recipeServings(recipe)).toBe(4);
  });

  it('never returns less than one', () => {
    expect(recipeServings({ ...recipe, servings: 0 })).toBe(1);
    expect(recipeServings({ ...recipe, servings: -2 })).toBe(1);
    expect(recipeServings({ ...recipe, servings: NaN })).toBe(1);
  });

  it('rounds to a whole number', () => {
    expect(recipeServings({ ...recipe, servings: 2.6 })).toBe(3);
  });
});

describe('toRecipeIngredients', () => {
  it('falls back to grams for a unit the food form cannot edit', () => {
    const [line] = toRecipeIngredients({
      ...recipe,
      ingredients: [{ ...recipe.ingredients[0], serving_unit: 'cup' }],
    });
    expect(line.serving_unit).toBe('g');
  });

  it('fills missing numbers with zero instead of NaN', () => {
    const [line] = toRecipeIngredients({
      ...recipe,
      ingredients: [{ food_name: 'Salt' } as never],
    });
    expect(line.calories).toBe(0);
    expect(line.serving_size).toBe(100);
  });
});

describe('recipePerServing', () => {
  it('divides the batch totals by the serving count', () => {
    const perServing = recipePerServing(recipe);
    expect(perServing.calories).toBe(484);
    expect(perServing.protein_g).toBe(58.3);
    expect(perServing.carbs_g).toBe(43);
  });
});

describe('toRecipeRecord', () => {
  it('builds the row the recipe builder would write', () => {
    const record = toRecipeRecord(recipe);
    expect(record.name).toBe('Burrito bowls');
    expect(record.servings).toBe(4);
    expect(record.ingredients).toHaveLength(2);
    expect(record.macros_per_serving.calories).toBe(484);
  });

  it('does not carry the steps, which the table has no column for', () => {
    expect(toRecipeRecord(recipe)).not.toHaveProperty('steps');
  });

  it('names an unnamed recipe', () => {
    expect(toRecipeRecord({ ...recipe, name: '  ' }).name).toBe('New recipe');
  });
});
