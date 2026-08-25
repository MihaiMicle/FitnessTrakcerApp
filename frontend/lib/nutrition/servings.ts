// lib/nutrition/servings.ts
// Conversion between serving units and grams, including per-food custom servings.

export interface CustomServing {
  description: string;
  equivalent_g: number;
}

/** Units with a fixed gram equivalent, independent of the food. */
export const UNIT_TO_G: Record<string, number> = {
  g: 1,
  ml: 1,
  oz: 28.3495,
  lb: 453.592,
  kg: 1000,
};

/**
 * Custom servings arrive either as a JSON string (straight from Postgres) or as
 * an already-parsed array. Anything else is treated as "no custom servings".
 */
export function parseCustomServings(value: unknown): CustomServing[] {
  if (Array.isArray(value)) return value as CustomServing[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Returns the custom servings for a food, falling back to those of a food with
 * the same name in the library. Recent foods and diary entries don't carry
 * their own servings, so they borrow them from the matching custom food.
 */
export function resolveCustomServings(
  food: any,
  library: any[] = [],
): CustomServing[] {
  const own = parseCustomServings(food?.custom_servings);
  if (own.length > 0) return own;

  const name = (food?.name || food?.food_name || '').toLowerCase();
  if (!name) return [];

  const match = library.find((f) => (f?.name || '').toLowerCase() === name);
  return match ? parseCustomServings(match.custom_servings) : [];
}

/**
 * How many grams one unit of `unit` weighs for the given food.
 * Returns null when the unit is unknown, which callers use to skip rescaling.
 */
export function getGramsMultiplier(
  unit: string,
  food: any,
  library: any[] = [],
): number | null {
  if (!unit) return null;

  const cleanUnit = unit.toLowerCase().trim();
  if (UNIT_TO_G[cleanUnit]) return UNIT_TO_G[cleanUnit];

  const servings = resolveCustomServings(food, library);
  const custom = servings.find(
    (s) => (s?.description || '').toLowerCase() === cleanUnit,
  );
  return custom ? custom.equivalent_g : null;
}
