// lib/nutrition/macros.ts
// The nutrient field list and the arithmetic done on it. Previously this list
// was spelled out by hand in a dozen places.

export const MACRO_FIELDS = [
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
] as const;

export type MacroField = (typeof MACRO_FIELDS)[number];
export type MacroTotals = Record<MacroField, number>;

/** Fields reported as whole numbers; everything else keeps one decimal. */
const WHOLE_NUMBER_FIELDS = new Set<MacroField>([
  'calories',
  'potassium_mg',
  'sodium_mg',
]);

const toNumber = (value: unknown): number => Number(value) || 0;

const round = (field: MacroField, value: number): number =>
  WHOLE_NUMBER_FIELDS.has(field) ? Math.round(value) : Number(value.toFixed(1));

export function emptyMacros(): MacroTotals {
  return MACRO_FIELDS.reduce((acc, field) => {
    acc[field] = 0;
    return acc;
  }, {} as MacroTotals);
}

/** Coerces a form's string inputs into numbers without rounding. */
export function toNumericMacros(source: any): MacroTotals {
  return MACRO_FIELDS.reduce((acc, field) => {
    acc[field] = toNumber(source?.[field]);
    return acc;
  }, {} as MacroTotals);
}

/** Scales every nutrient by `ratio` and applies each field's rounding rule. */
export function scaleMacros(source: any, ratio: number): MacroTotals {
  return MACRO_FIELDS.reduce((acc, field) => {
    acc[field] = round(field, toNumber(source?.[field]) * ratio);
    return acc;
  }, {} as MacroTotals);
}

/** Unrounded running total across a list of foods. */
export function sumMacros(foods: any[]): MacroTotals {
  return foods.reduce<MacroTotals>((acc, food) => {
    MACRO_FIELDS.forEach((field) => {
      acc[field] += toNumber(food?.[field]);
    });
    return acc;
  }, emptyMacros());
}

/**
 * Nutrient values as they should sit in a form: the food's value, or an empty
 * string so the input renders blank rather than as 0.
 */
export function macrosForForm(source: any): Record<MacroField, number | ''> {
  return MACRO_FIELDS.reduce(
    (acc, field) => {
      acc[field] = source?.[field] ?? '';
      return acc;
    },
    {} as Record<MacroField, number | ''>,
  );
}

/** Blank nutrient values, for a fresh form. */
export function blankMacroFields(): Record<MacroField, ''> {
  return MACRO_FIELDS.reduce(
    (acc, field) => {
      acc[field] = '';
      return acc;
    },
    {} as Record<MacroField, ''>,
  );
}
