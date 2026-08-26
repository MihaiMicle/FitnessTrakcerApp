import { describe, it, expect } from 'vitest';
import {
  MACRO_FIELDS,
  blankMacroFields,
  emptyMacros,
  macrosForForm,
  scaleMacros,
  sumMacros,
  toNumericMacros,
} from '../macros';

/*
  These four functions sit under every nutrition number the user sees
  A wrong answer here doesn't throw — it renders as a plausible calorie count
 */

const chickenBreast = {
  calories: 165,
  protein_g: 31,
  carbs_g: 0,
  fats_g: 3.6,
  saturated_fats_g: 1,
  fiber_g: 0,
  sugar_g: 0,
  potassium_mg: 256,
  sodium_mg: 74,
  iron_mg: 1,
  vitamin_d_mcg: 0.1,
  zinc_mg: 1,
  magnesium_mg: 29,
  calcium_mg: 15,
  cholesterol_mg: 85,
};

describe('MACRO_FIELDS', () => {
  it('covers all 15 tracked nutrients with no duplicates', () => {
    expect(MACRO_FIELDS).toHaveLength(15);
    expect(new Set(MACRO_FIELDS).size).toBe(15);
  });

  it('matches the column names the API expects', () => {
    // Guard against a rename on one side only: these strings are sent verbatim
    // as payload keys and read verbatim off API responses
    expect([...MACRO_FIELDS]).toEqual([
      'calories',
      'protein_g',
      'carbs_g',
      'fats_g',
      'saturated_fats_g',
      'fiber_g',
      'sugar_g',
      'potassium_mg',
      'sodium_mg',
      'iron_mg',
      'vitamin_d_mcg',
      'zinc_mg',
      'magnesium_mg',
      'calcium_mg',
      'cholesterol_mg',
    ]);
  });
});

describe('emptyMacros', () => {
  it('returns every field at zero', () => {
    const empty = emptyMacros();
    expect(Object.keys(empty)).toHaveLength(15);
    expect(Object.values(empty).every((v) => v === 0)).toBe(true);
  });

  it('returns a fresh object each call', () => {
    const a = emptyMacros();
    a.calories = 500;
    expect(emptyMacros().calories).toBe(0);
  });
});

describe('toNumericMacros', () => {
  it('coerces the form\u2019s string inputs to numbers', () => {
    const result = toNumericMacros({ calories: '165', protein_g: '31.5' });
    expect(result.calories).toBe(165);
    expect(result.protein_g).toBe(31.5);
  });

  it('does not round \u2014 that is scaleMacros\u2019 job', () => {
    expect(toNumericMacros({ calories: 165.7 }).calories).toBe(165.7);
    expect(toNumericMacros({ protein_g: 31.456 }).protein_g).toBe(31.456);
  });

  it.each([
    ['empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['non-numeric text', 'abc'],
    ['NaN', NaN],
  ])('turns %s into 0 rather than NaN', (_label, value) => {
    // `Number(value) || 0` is what makes a half-filled form safe to submit
    expect(toNumericMacros({ calories: value }).calories).toBe(0);
  });

  it('survives a null or undefined source', () => {
    expect(toNumericMacros(null).calories).toBe(0);
    expect(toNumericMacros(undefined).protein_g).toBe(0);
  });

  it('fills in fields the source is missing', () => {
    const result = toNumericMacros({ calories: 100 });
    expect(Object.keys(result)).toHaveLength(15);
    expect(result.zinc_mg).toBe(0);
  });

  it('drops keys that are not tracked nutrients', () => {
    const result = toNumericMacros({ calories: 100, food_name: 'Chicken' }) as any;
    expect(result.food_name).toBeUndefined();
  });
});

describe('scaleMacros', () => {
  it('scales a 100 g food to 150 g', () => {
    const result = scaleMacros(chickenBreast, 1.5);
    expect(result.calories).toBe(248); // 247.5 rounds to 248
    expect(result.protein_g).toBe(46.5);
    expect(result.fats_g).toBe(5.4);
  });

  it('is the identity at ratio 1, modulo rounding', () => {
    const result = scaleMacros(chickenBreast, 1);
    expect(result.calories).toBe(165);
    expect(result.protein_g).toBe(31);
    expect(result.fats_g).toBe(3.6);
  });

  it('zeroes everything at ratio 0', () => {
    expect(Object.values(scaleMacros(chickenBreast, 0)).every((v) => v === 0)).toBe(true);
  });

  it.each(['calories', 'potassium_mg', 'sodium_mg'] as const)(
    'reports %s as a whole number',
    (field) => {
      const result = scaleMacros({ [field]: 100 }, 1.117);
      expect(Number.isInteger(result[field])).toBe(true);
      expect(result[field]).toBe(112); // 111.7 -> 112
    },
  );

  it.each(['protein_g', 'fats_g', 'iron_mg', 'vitamin_d_mcg'] as const)(
    'keeps one decimal place on %s',
    (field) => {
      const result = scaleMacros({ [field]: 100 }, 1.11749);
      expect(result[field]).toBe(111.7);
    },
  );

  it('rounds an exact half upward on whole-number fields', () => {
    // Math.round is half-up, not banker's rounding
    expect(scaleMacros({ calories: 1 }, 2.5).calories).toBe(3);
    expect(scaleMacros({ calories: 1 }, 3.5).calories).toBe(4);
  });

  it('rounds down when float representation lands just under a half', () => {
    // 100 * 1.005 is 100.49999999999999 in IEEE 754, so this rounds to 100 and
    // not the 101 you'd get from decimal arithmetic. Nothing to fix at the
    // scale of a calorie count, but it's the reason two paths that "should"
    // agree can differ by 1 \u2014 pinned so that surprise is documented, not
    // rediscovered
    expect(scaleMacros({ calories: 100 }, 1.005).calories).toBe(100);
  });

  it('rounds one-decimal fields with toFixed, which is also not half-up', () => {
    // (0.15).toFixed(1) is "0.1" but (0.25).toFixed(1) is "0.3" \u2014 both are
    // correct for the underlying binary values. Same caveat as above
    expect(scaleMacros({ protein_g: 15 }, 0.01).protein_g).toBe(0.1);
    expect(scaleMacros({ protein_g: 25 }, 0.01).protein_g).toBe(0.3);
  });

  it('handles a recipe divided into servings', () => {
    // The path useBundleBuilder takes: scaleMacros(sumMacros(foods), 1 / servings)
    const perServing = scaleMacros({ calories: 1000, protein_g: 75 }, 1 / 3);
    expect(perServing.calories).toBe(333); // 333.33 -> 333
    expect(perServing.protein_g).toBe(25);
  });

  it('handles very small ratios without producing negative zero', () => {
    const result = scaleMacros(chickenBreast, 0.0001);
    expect(Object.is(result.calories, -0)).toBe(false);
    expect(result.calories).toBe(0);
  });

  it('scales up large quantities without precision drift', () => {
    expect(scaleMacros({ calories: 165 }, 100).calories).toBe(16500);
  });

  it('treats a missing field as zero rather than NaN', () => {
    const result = scaleMacros({ calories: 100 }, 2);
    expect(result.protein_g).toBe(0);
    expect(Number.isNaN(result.protein_g)).toBe(false);
  });
});

describe('sumMacros', () => {
  it('adds a list of foods field by field', () => {
    const result = sumMacros([
      { calories: 165, protein_g: 31 },
      { calories: 200, protein_g: 10 },
      { calories: 90, protein_g: 4 },
    ]);
    expect(result.calories).toBe(455);
    expect(result.protein_g).toBe(45);
  });

  it('returns all zeroes for an empty list', () => {
    expect(sumMacros([])).toEqual(emptyMacros());
  });

  it('skips null entries instead of throwing', () => {
    const result = sumMacros([{ calories: 100 }, null as any, { calories: 50 }]);
    expect(result.calories).toBe(150);
  });

  it('does not round, so repeated addition stays exact enough to divide', () => {
    // Documented as "unrounded running total". If rounding crept in here,
    // recipe-per-serving numbers would drift as ingredient counts grew
    const result = sumMacros([{ fats_g: 0.1 }, { fats_g: 0.2 }]);
    expect(result.fats_g).toBeCloseTo(0.3, 10);
  });

  it('does not mutate the input foods', () => {
    const foods = [{ calories: 100 }, { calories: 50 }];
    sumMacros(foods);
    expect(foods).toEqual([{ calories: 100 }, { calories: 50 }]);
  });

  it('sums a realistic 20-ingredient recipe', () => {
    const foods = Array.from({ length: 20 }, () => chickenBreast);
    expect(sumMacros(foods).calories).toBe(3300);
    expect(sumMacros(foods).protein_g).toBe(620);
  });
});

describe('macrosForForm', () => {
  it('preserves a genuine zero instead of blanking it', () => {
    // This is the `??` vs `||` distinction. Chicken breast has 0 g carbs; the
    // input must show 0, not an empty box the user has to guess at
    expect(macrosForForm({ carbs_g: 0 }).carbs_g).toBe(0);
  });

  it('renders a missing nutrient as an empty string', () => {
    expect(macrosForForm({ calories: 165 }).protein_g).toBe('');
  });

  it('renders null as an empty string', () => {
    expect(macrosForForm({ calories: null }).calories).toBe('');
  });

  it('blanks every field for a null source', () => {
    expect(Object.values(macrosForForm(null)).every((v) => v === '')).toBe(true);
  });
});

describe('blankMacroFields', () => {
  it('returns every tracked field as an empty string', () => {
    const blank = blankMacroFields();
    expect(Object.keys(blank)).toHaveLength(15);
    expect(Object.values(blank).every((v) => v === '')).toBe(true);
  });
});

describe('round trips', () => {
  it('scaling by r then by 1/r returns the original, within rounding', () => {
    const scaled = scaleMacros(chickenBreast, 2.5);
    const back = scaleMacros(scaled, 1 / 2.5);
    expect(back.calories).toBeCloseTo(chickenBreast.calories, 0);
    expect(back.protein_g).toBeCloseTo(chickenBreast.protein_g, 0);
  });

  it('summing n copies equals scaling by n', () => {
    const summed = sumMacros(Array.from({ length: 4 }, () => chickenBreast));
    const scaled = scaleMacros(chickenBreast, 4);
    expect(summed.calories).toBe(scaled.calories);
    expect(summed.protein_g).toBe(scaled.protein_g);
  });

  it('a form value survives the toNumericMacros round trip', () => {
    const formState = macrosForForm(chickenBreast);
    expect(toNumericMacros(formState).calories).toBe(165);
    expect(toNumericMacros(formState).carbs_g).toBe(0);
  });
});
