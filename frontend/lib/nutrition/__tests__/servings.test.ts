import { describe, it, expect } from 'vitest';
import {
  UNIT_TO_G,
  getGramsMultiplier,
  parseCustomServings,
  resolveCustomServings,
} from '../servings';

/*
 * getGramsMultiplier feeds the `ratio` in useMealForm that rescales every nutrient
 * A wrong multiplier here silently multiplies the user's whole day
 */

const peanutButter = {
  name: 'Peanut Butter',
  custom_servings: [
    { description: 'tbsp', equivalent_g: 16 },
    { description: 'Serving', equivalent_g: 32 },
  ],
};

describe('UNIT_TO_G', () => {
  it('uses the standard gram equivalents', () => {
    expect(UNIT_TO_G.g).toBe(1);
    expect(UNIT_TO_G.kg).toBe(1000);
    expect(UNIT_TO_G.oz).toBeCloseTo(28.3495, 4);
    expect(UNIT_TO_G.lb).toBeCloseTo(453.592, 3);
  });

  it('treats ml as 1 g, i.e. assumes the density of water', () => {
    // Fine for water and most drinks, wrong for oil (~0.92) and honey (~1.42)
    // Pinned because it's an assumption, not a fact
    expect(UNIT_TO_G.ml).toBe(1);
  });

  it('keeps lb and oz internally consistent', () => {
    expect(UNIT_TO_G.lb / UNIT_TO_G.oz).toBeCloseTo(16, 3);
  });
});

describe('parseCustomServings', () => {
  it('passes an array straight through', () => {
    const servings = [{ description: 'slice', equivalent_g: 28 }];
    expect(parseCustomServings(servings)).toBe(servings);
  });

  it('parses a JSON string, which is how Postgres returns the column', () => {
    expect(parseCustomServings('[{"description":"cup","equivalent_g":240}]')).toEqual([
      { description: 'cup', equivalent_g: 240 },
    ]);
  });

  it.each([
    ['malformed JSON', '{not json'],
    ['a JSON object rather than an array', '{"description":"cup"}'],
    ['a JSON scalar', '42'],
    ['null', null],
    ['undefined', undefined],
    ['a plain object', { description: 'cup' }],
    ['a number', 42],
    ['an empty string', ''],
  ])('returns an empty array for %s', (_label, value) => {
    expect(parseCustomServings(value)).toEqual([]);
  });

  it('never throws, whatever it is handed', () => {
    expect(() => parseCustomServings('[[[')).not.toThrow();
  });
});

describe('resolveCustomServings', () => {
  it('prefers the food\u2019s own servings', () => {
    expect(resolveCustomServings(peanutButter)).toHaveLength(2);
  });

  it('borrows from a library food of the same name', () => {
    // Recent foods and diary entries don't carry their own servings
    const diaryEntry = { food_name: 'Peanut Butter' };
    expect(resolveCustomServings(diaryEntry, [peanutButter])).toHaveLength(2);
  });

  it('matches library names case-insensitively', () => {
    expect(resolveCustomServings({ name: 'PEANUT BUTTER' }, [peanutButter])).toHaveLength(2);
    expect(resolveCustomServings({ name: 'peanut butter' }, [peanutButter])).toHaveLength(2);
  });

  it('accepts either name or food_name on the food', () => {
    expect(resolveCustomServings({ name: 'Peanut Butter' }, [peanutButter])).toHaveLength(2);
    expect(resolveCustomServings({ food_name: 'Peanut Butter' }, [peanutButter])).toHaveLength(2);
  });

  it('does not fall back when the food already has its own servings', () => {
    const own = { name: 'Peanut Butter', custom_servings: [{ description: 'jar', equivalent_g: 500 }] };
    expect(resolveCustomServings(own, [peanutButter])).toEqual([
      { description: 'jar', equivalent_g: 500 },
    ]);
  });

  it.each([
    ['no name', {}],
    ['an empty name', { name: '' }],
    ['a null food', null],
    ['no library match', { name: 'Almond Butter' }],
  ])('returns an empty array for %s', (_label, food) => {
    expect(resolveCustomServings(food, [peanutButter])).toEqual([]);
  });

  it('does not require the library argument', () => {
    expect(resolveCustomServings({ name: 'Peanut Butter' })).toEqual([]);
  });

  it('skips null entries in the library', () => {
    expect(() =>
      resolveCustomServings({ name: 'Peanut Butter' }, [null as any, peanutButter]),
    ).not.toThrow();
  });

  it('does not match on a name that merely contains the library name', () => {
    // Exact match only \u2014 "Peanut Butter Cups" must not inherit peanut butter's
    // 16 g tablespoon
    expect(resolveCustomServings({ name: 'Peanut Butter Cups' }, [peanutButter])).toEqual([]);
  });
});

describe('getGramsMultiplier', () => {
  it.each([
    ['g', 1],
    ['kg', 1000],
    ['oz', 28.3495],
    ['lb', 453.592],
    ['ml', 1],
  ])('resolves the fixed unit %s', (unit, expected) => {
    expect(getGramsMultiplier(unit, {})).toBeCloseTo(expected, 4);
  });

  it.each(['G', 'KG', ' oz ', 'Lb', '  ML  '])(
    'is case- and whitespace-insensitive for %s',
    (unit) => {
      expect(getGramsMultiplier(unit, {})).not.toBeNull();
    },
  );

  it('resolves a food\u2019s custom serving', () => {
    expect(getGramsMultiplier('tbsp', peanutButter)).toBe(16);
  });

  it('matches a custom serving case-insensitively', () => {
    expect(getGramsMultiplier('serving', peanutButter)).toBe(32);
    expect(getGramsMultiplier('SERVING', peanutButter)).toBe(32);
  });

  it('falls back to the library for a food without its own servings', () => {
    expect(getGramsMultiplier('tbsp', { food_name: 'Peanut Butter' }, [peanutButter])).toBe(16);
  });

  it('lets a fixed unit win over a same-named custom serving', () => {
    // A food defining a custom "g" cannot redefine what a gram is
    const odd = { name: 'Odd', custom_servings: [{ description: 'g', equivalent_g: 999 }] };
    expect(getGramsMultiplier('g', odd)).toBe(1);
  });

  it.each([
    ['an empty unit', ''],
    ['an unknown unit', 'scoop'],
    ['a unit not in this food\u2019s servings', 'cup'],
  ])('returns null for %s so the caller skips rescaling', (_label, unit) => {
    expect(getGramsMultiplier(unit, peanutButter)).toBeNull();
  });

  it('returns null rather than throwing for a null food', () => {
    expect(getGramsMultiplier('scoop', null)).toBeNull();
  });

  it('returns a real multiplier even when the food is null, for fixed units', () => {
    expect(getGramsMultiplier('g', null)).toBe(1);
  });

  it('returns 0 \u2014 not null \u2014 for a custom serving weighing 0 g', () => {
    // Known sharp edge. useMealForm computes `requestedGrams / baseGrams`; a
    // 0 g base serving yields Infinity or NaN and poisons every macro. Either
    // reject equivalent_g <= 0 at save time or treat it as null here
    const broken = { name: 'Broken', custom_servings: [{ description: 'scoop', equivalent_g: 0 }] };
    expect(getGramsMultiplier('scoop', broken)).toBe(0);
  });
});

describe('conversion round trips', () => {
  it('1 kg equals 1000 g', () => {
    expect(getGramsMultiplier('kg', {})).toBe(getGramsMultiplier('g', {})! * 1000);
  });

  it('2 tbsp of peanut butter equals its 32 g serving', () => {
    const tbsp = getGramsMultiplier('tbsp', peanutButter)!;
    const serving = getGramsMultiplier('serving', peanutButter)!;
    expect(tbsp * 2).toBe(serving);
  });

  it('a 100 g food logged as 3.5 oz is close to a 1.0 ratio', () => {
    const grams = 3.5 * getGramsMultiplier('oz', {})!;
    expect(grams / 100).toBeCloseTo(0.992, 3);
  });
});
