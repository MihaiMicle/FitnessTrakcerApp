import { describe, it, expect } from 'vitest';
import {
  buildCustomFoodPayload,
  buildDiaryEntryPayload,
  buildFoodPayload,
  buildMealForm,
  createEmptyMealForm,
} from '../mealForm';

/**
  These build the objects that get POSTed. Nothing validates them on the way
  out, so a dropped or misnamed key lands in the database as a silent zero
 */

const scannedBarcodeResult = {
  name: 'Greek Yoghurt',
  brand: 'Fage',
  calories: 97,
  protein_g: 9,
  carbs_g: 3.8,
  fats_g: 5,
  sugar_g: 3.8,
  custom_servings: [{ description: 'pot', equivalent_g: 170 }],
};

describe('createEmptyMealForm', () => {
  it('defaults to lunch and grams', () => {
    const form = createEmptyMealForm();
    expect(form.meal_type).toBe('lunch');
    expect(form.serving_unit).toBe('g');
    expect(form.serving_size).toBe('');
  });

  it('accepts a meal type', () => {
    expect(createEmptyMealForm('breakfast').meal_type).toBe('breakfast');
  });

  it('blanks every nutrient so inputs render empty, not as 0', () => {
    const form = createEmptyMealForm();
    expect(form.calories).toBe('');
    expect(form.cholesterol_mg).toBe('');
  });

  it('returns a fresh object each call', () => {
    const a = createEmptyMealForm();
    a.food_name = 'Chicken';
    expect(createEmptyMealForm().food_name).toBe('');
  });
});

describe('buildMealForm', () => {
  const overrides = {
    mealType: 'breakfast',
    foodName: 'Greek Yoghurt',
    servingSize: 170,
    servingUnit: 'g',
  };

  it('takes identity fields from the overrides, not the source', () => {
    // Callers disagree on whether `name` or `food_name` wins, so the caller
    // decides and passes the answer in
    const form = buildMealForm({ ...scannedBarcodeResult, name: 'WRONG' }, overrides);
    expect(form.food_name).toBe('Greek Yoghurt');
    expect(form.meal_type).toBe('breakfast');
    expect(form.serving_size).toBe(170);
  });

  it('takes brand and nutrients from the source', () => {
    const form = buildMealForm(scannedBarcodeResult, overrides);
    expect(form.brand).toBe('Fage');
    expect(form.calories).toBe(97);
    expect(form.protein_g).toBe(9);
  });

  it('blanks nutrients the source is missing', () => {
    const form = buildMealForm({ calories: 97 }, overrides);
    expect(form.iron_mg).toBe('');
    expect(form.zinc_mg).toBe('');
  });

  it('defaults a missing brand to an empty string, never undefined', () => {
    expect(buildMealForm({ calories: 97 }, overrides).brand).toBe('');
  });

  it('handles a null source', () => {
    const form = buildMealForm(null, overrides);
    expect(form.food_name).toBe('Greek Yoghurt');
    expect(form.calories).toBe('');
  });

  it('does not carry custom_servings into form state', () => {
    // They live on baseFood, not the form. If they leaked in they'd be sent as
    // a nutrient field
    expect(buildMealForm(scannedBarcodeResult, overrides).custom_servings).toBeUndefined();
  });
});

describe('buildFoodPayload', () => {
  it('omits meal_type \u2014 it is the food half only', () => {
    const form = { ...createEmptyMealForm('dinner'), food_name: 'Rice', serving_size: '150' };
    expect(buildFoodPayload(form as any)).not.toHaveProperty('meal_type');
  });

  it('coerces every nutrient to a number', () => {
    const form = {
      ...createEmptyMealForm(),
      food_name: 'Rice',
      serving_size: '150',
      calories: '195',
      protein_g: '4.3',
    };
    const payload = buildFoodPayload(form as any);
    expect(payload.serving_size).toBe(150);
    expect(payload.calories).toBe(195);
    expect(payload.protein_g).toBe(4.3);
  });

  it.each([
    ['an empty serving size', ''],
    ['non-numeric text', 'abc'],
    ['null', null],
  ])('sends 0 for %s rather than NaN', (_label, value) => {
    const form = { ...createEmptyMealForm(), serving_size: value };
    expect(buildFoodPayload(form as any).serving_size).toBe(0);
  });

  it('includes all 15 nutrients plus the four identity fields', () => {
    const payload = buildFoodPayload(createEmptyMealForm() as any);
    expect(Object.keys(payload)).toHaveLength(19);
  });

  it('leaves an untouched form as an all-zero payload', () => {
    const payload = buildFoodPayload(createEmptyMealForm() as any);
    expect(payload.calories).toBe(0);
    expect(payload.food_name).toBe('');
  });
});

describe('buildDiaryEntryPayload', () => {
  it('carries the meal type through, unlike buildFoodPayload', () => {
    expect(buildDiaryEntryPayload({ food_name: 'Rice' }, 'dinner').meal_type).toBe('dinner');
  });

  it('prefers food_name and falls back to name', () => {
    expect(buildDiaryEntryPayload({ food_name: 'Rice' }, 'lunch').food_name).toBe('Rice');
    expect(buildDiaryEntryPayload({ name: 'Rice' }, 'lunch').food_name).toBe('Rice');
  });

  it('lets food_name win when both are present', () => {
    expect(
      buildDiaryEntryPayload({ food_name: 'Brown Rice', name: 'Rice' }, 'lunch').food_name,
    ).toBe('Brown Rice');
  });

  it('preserves an already-scaled meal exactly when copying to another day', () => {
    // The copy-to-day and drag-between-sections paths. If this rescaled, a meal
    // would change size just by being moved
    const logged = {
      food_name: 'Greek Yoghurt',
      brand: 'Fage',
      serving_size: 170,
      serving_unit: 'g',
      calories: 165,
      protein_g: 15.3,
    };
    const payload = buildDiaryEntryPayload(logged, 'snack');
    expect(payload.calories).toBe(165);
    expect(payload.protein_g).toBe(15.3);
    expect(payload.serving_size).toBe(170);
  });

  it('passes serving_size through untouched, including undefined', () => {
    // Unlike buildFoodPayload, there is no Number() coercion on this path
    expect(buildDiaryEntryPayload({ name: 'Rice' }, 'lunch').serving_size).toBeUndefined();
  });

  it('defaults a missing brand to an empty string', () => {
    expect(buildDiaryEntryPayload({ name: 'Rice' }, 'lunch').brand).toBe('');
  });
});

describe('buildCustomFoodPayload', () => {
  const foodPayload = buildFoodPayload({
    ...createEmptyMealForm(),
    food_name: 'Greek Yoghurt',
    brand: 'Fage',
    serving_size: '170',
    serving_unit: 'g',
    calories: '165',
  } as any);

  it('renames food_name to name for the custom_foods table', () => {
    const custom = buildCustomFoodPayload(foodPayload, {});
    expect(custom.name).toBe('Greek Yoghurt');
    expect(custom).not.toHaveProperty('food_name');
  });

  it('keeps the nutrients', () => {
    expect(buildCustomFoodPayload(foodPayload, {}).calories).toBe(165);
  });

  it('defaults a zero serving size to 1 to avoid a divide-by-zero later', () => {
    const zeroed = { ...foodPayload, serving_size: 0 };
    expect(buildCustomFoodPayload(zeroed, {}).serving_size).toBe(1);
  });

  it('defaults a missing unit to "serving"', () => {
    const noUnit = { ...foodPayload, serving_unit: '' };
    expect(buildCustomFoodPayload(noUnit, {}).serving_unit).toBe('serving');
  });

  it('copies custom_servings from the base food', () => {
    const custom = buildCustomFoodPayload(foodPayload, {
      custom_servings: [{ description: 'pot', equivalent_g: 170 }],
    });
    expect(custom.custom_servings).toEqual([{ description: 'pot', equivalent_g: 170 }]);
  });

  it('copies the array rather than aliasing the base food\u2019s', () => {
    const baseFood = { custom_servings: [{ description: 'pot', equivalent_g: 170 }] };
    const custom = buildCustomFoodPayload(foodPayload, baseFood);
    expect(custom.custom_servings).not.toBe(baseFood.custom_servings);
    custom.custom_servings.push({ description: 'tub', equivalent_g: 500 } as any);
    expect(baseFood.custom_servings).toHaveLength(1);
  });

  it('is a shallow copy \u2014 the serving objects are still shared', () => {
    // Mutating a serving in place would still reach through
    // Fine today because nothing mutates them; pinned so it stays a known limitation
    const baseFood = { custom_servings: [{ description: 'pot', equivalent_g: 170 }] };
    const custom = buildCustomFoodPayload(foodPayload, baseFood);
    expect(custom.custom_servings[0]).toBe(baseFood.custom_servings[0]);
  });

  it.each([
    ['a null base food', null],
    ['a base food with no servings', {}],
  ])('defaults custom_servings to an empty array for %s', (_label, baseFood) => {
    expect(buildCustomFoodPayload(foodPayload, baseFood).custom_servings).toEqual([]);
  });
});

describe('form to payload, end to end', () => {
  it('survives scan \u2192 form \u2192 payload without losing a nutrient', () => {
    const form = buildMealForm(scannedBarcodeResult, {
      mealType: 'breakfast',
      foodName: scannedBarcodeResult.name,
      servingSize: 170,
      servingUnit: 'g',
    });
    const payload = buildFoodPayload(form);

    expect(payload.food_name).toBe('Greek Yoghurt');
    expect(payload.brand).toBe('Fage');
    expect(payload.calories).toBe(97);
    expect(payload.carbs_g).toBe(3.8);
    expect(payload.serving_size).toBe(170);
    // Untouched nutrients become 0, not undefined \u2014 the column is NOT NULL
    expect(payload.iron_mg).toBe(0);
  });

  it('survives form \u2192 payload \u2192 custom food', () => {
    const form = buildMealForm(scannedBarcodeResult, {
      mealType: 'breakfast',
      foodName: 'Greek Yoghurt',
      servingSize: 170,
      servingUnit: 'g',
    });
    const custom = buildCustomFoodPayload(buildFoodPayload(form), scannedBarcodeResult);
    expect(custom.name).toBe('Greek Yoghurt');
    expect(custom.calories).toBe(97);
    expect(custom.custom_servings).toHaveLength(1);
  });
});
