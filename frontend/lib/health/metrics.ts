/*
 * Canonical health metrics, mirroring backend/core/health.py
 *
 * Apple HealthKit, Android Health Connect and an exported archive all name the
 * same measurements differently and in different units. Everything is folded
 * onto one vocabulary before it leaves the device, so nothing downstream has
 * to know which of the three it came from
 *
 * The backend normalizes again on the way in, which is deliberate: a browser
 * upload never passes through here at all, so the server cannot trust that
 * this ran. What this file is really for is showing a value to the user and
 * deciding what is worth sending
 *
 * `metrics.test.ts` pins this table and `backend/tests/test_health.py` pins
 * the same one, so a change to either side alone fails a test rather than
 * leaving a phone and a browser disagreeing about what a kilogram is
 */

export type Dimension =
  | 'mass'
  | 'length'
  | 'energy'
  | 'volume'
  | 'time'
  | 'count'
  | 'percent'
  | 'rate';

export type Reduction = 'last' | 'sum' | 'mean' | 'max';

export interface MetricSpec {
  dimension: Dimension;
  unit: string;
  reduce: Reduction;
  label: string;
  writable: boolean;
}

/* Keep the keys in step with METRICS in backend/core/health.py */
export const CANONICAL_METRICS = {
  weight_kg: {
    dimension: 'mass',
    unit: 'kg',
    reduce: 'last',
    label: 'Body weight',
    writable: true,
  },
  body_fat_percent: {
    dimension: 'percent',
    unit: 'percent',
    reduce: 'last',
    label: 'Body fat',
    writable: true,
  },
  height_cm: {
    dimension: 'length',
    unit: 'cm',
    reduce: 'last',
    label: 'Height',
    writable: false,
  },
  steps: {
    dimension: 'count',
    unit: 'count',
    reduce: 'sum',
    label: 'Steps',
    writable: false,
  },
  active_energy_kcal: {
    dimension: 'energy',
    unit: 'kcal',
    reduce: 'sum',
    label: 'Active energy',
    writable: false,
  },
  resting_energy_kcal: {
    dimension: 'energy',
    unit: 'kcal',
    reduce: 'sum',
    label: 'Resting energy',
    writable: false,
  },
  heart_rate_bpm: {
    dimension: 'rate',
    unit: 'bpm',
    reduce: 'mean',
    label: 'Heart rate',
    writable: false,
  },
  resting_heart_rate_bpm: {
    dimension: 'rate',
    unit: 'bpm',
    reduce: 'last',
    label: 'Resting heart rate',
    writable: false,
  },
  distance_km: {
    dimension: 'length',
    unit: 'km',
    reduce: 'sum',
    label: 'Distance',
    writable: false,
  },
  sleep_minutes: {
    dimension: 'time',
    unit: 'min',
    reduce: 'sum',
    label: 'Sleep',
    writable: false,
  },
  water_ml: {
    dimension: 'volume',
    unit: 'ml',
    reduce: 'sum',
    label: 'Water',
    writable: true,
  },
  energy_intake_kcal: {
    dimension: 'energy',
    unit: 'kcal',
    reduce: 'sum',
    label: 'Calories eaten',
    writable: true,
  },
  protein_g: {
    dimension: 'mass',
    unit: 'g',
    reduce: 'sum',
    label: 'Protein',
    writable: true,
  },
  carbs_g: {
    dimension: 'mass',
    unit: 'g',
    reduce: 'sum',
    label: 'Carbs',
    writable: true,
  },
  fat_g: {
    dimension: 'mass',
    unit: 'g',
    reduce: 'sum',
    label: 'Fat',
    writable: true,
  },
  workout_minutes: {
    dimension: 'time',
    unit: 'min',
    reduce: 'sum',
    label: 'Workouts',
    writable: true,
  },
} as const satisfies Record<string, MetricSpec>;

export type HealthMetric = keyof typeof CANONICAL_METRICS;

export const METRIC_KEYS = Object.keys(CANONICAL_METRICS) as HealthMetric[];

export const WRITABLE_METRICS = METRIC_KEYS.filter(
  (key) => CANONICAL_METRICS[key].writable,
);

/* unit -> [dimension, factor into that dimension's base unit] */
export const UNIT_FACTORS: Record<string, [Dimension, number]> = {
  /* mass, base gram */
  g: ['mass', 1],
  kg: ['mass', 1000],
  mg: ['mass', 0.001],
  lb: ['mass', 453.59237],
  oz: ['mass', 28.349523125],
  /* length, base metre */
  m: ['length', 1],
  km: ['length', 1000],
  cm: ['length', 0.01],
  mm: ['length', 0.001],
  mi: ['length', 1609.344],
  ft: ['length', 0.3048],
  in: ['length', 0.0254],
  /* energy, base kilocalorie */
  kcal: ['energy', 1],
  cal: ['energy', 0.001],
  kj: ['energy', 0.2390057361],
  /* volume, base millilitre */
  ml: ['volume', 1],
  l: ['volume', 1000],
  floz: ['volume', 29.5735295625],
  cup: ['volume', 236.5882365],
  /* time, base minute */
  min: ['time', 1],
  s: ['time', 1 / 60],
  h: ['time', 60],
  ms: ['time', 1 / 60000],
  d: ['time', 1440],
  /* dimensionless */
  count: ['count', 1],
  percent: ['percent', 1],
  fraction: ['percent', 100],
  bpm: ['rate', 1],
};

/* Spellings seen in real exports, folded onto the canonical unit key */
export const UNIT_ALIASES: Record<string, string> = {
  kilogram: 'kg',
  kilograms: 'kg',
  kgs: 'kg',
  gram: 'g',
  grams: 'g',
  gm: 'g',
  milligram: 'mg',
  milligrams: 'mg',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  ounce: 'oz',
  ounces: 'oz',
  metre: 'm',
  meter: 'm',
  meters: 'm',
  metres: 'm',
  kilometer: 'km',
  kilometre: 'km',
  kilometers: 'km',
  kilometres: 'km',
  centimeter: 'cm',
  centimetre: 'cm',
  centimeters: 'cm',
  mile: 'mi',
  miles: 'mi',
  foot: 'ft',
  feet: 'ft',
  inch: 'in',
  inches: 'in',
  calorie: 'cal',
  calories: 'kcal',
  kilocalorie: 'kcal',
  kilocalories: 'kcal',
  kilojoule: 'kj',
  kilojoules: 'kj',
  millilitre: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitres: 'ml',
  litre: 'l',
  liter: 'l',
  liters: 'l',
  litres: 'l',
  fl_oz: 'floz',
  'fl oz': 'floz',
  fluid_ounce: 'floz',
  cups: 'cup',
  minute: 'min',
  minutes: 'min',
  mins: 'min',
  second: 's',
  seconds: 's',
  sec: 's',
  secs: 's',
  hour: 'h',
  hours: 'h',
  hr: 'h',
  hrs: 'h',
  millisecond: 'ms',
  milliseconds: 'ms',
  day: 'd',
  days: 'd',
  '%': 'percent',
  pct: 'percent',
  'count/min': 'bpm',
  'counts/min': 'bpm',
  'count/minute': 'bpm',
  'beats/min': 'bpm',
};

/* HealthKit sample identifiers */
export const HEALTHKIT_METRICS: Record<string, HealthMetric> = {
  HKQuantityTypeIdentifierBodyMass: 'weight_kg',
  HKQuantityTypeIdentifierBodyFatPercentage: 'body_fat_percent',
  HKQuantityTypeIdentifierHeight: 'height_cm',
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKQuantityTypeIdentifierActiveEnergyBurned: 'active_energy_kcal',
  HKQuantityTypeIdentifierBasalEnergyBurned: 'resting_energy_kcal',
  HKQuantityTypeIdentifierHeartRate: 'heart_rate_bpm',
  HKQuantityTypeIdentifierRestingHeartRate: 'resting_heart_rate_bpm',
  HKQuantityTypeIdentifierDistanceWalkingRunning: 'distance_km',
  HKQuantityTypeIdentifierDistanceCycling: 'distance_km',
  HKCategoryTypeIdentifierSleepAnalysis: 'sleep_minutes',
  HKQuantityTypeIdentifierDietaryWater: 'water_ml',
  HKQuantityTypeIdentifierDietaryEnergyConsumed: 'energy_intake_kcal',
  HKQuantityTypeIdentifierDietaryProtein: 'protein_g',
  HKQuantityTypeIdentifierDietaryCarbohydrates: 'carbs_g',
  HKQuantityTypeIdentifierDietaryFatTotal: 'fat_g',
  HKWorkout: 'workout_minutes',
};

/* Health Connect record class names */
export const HEALTH_CONNECT_METRICS: Record<string, HealthMetric> = {
  WeightRecord: 'weight_kg',
  BodyFatRecord: 'body_fat_percent',
  HeightRecord: 'height_cm',
  StepsRecord: 'steps',
  ActiveCaloriesBurnedRecord: 'active_energy_kcal',
  BasalMetabolicRateRecord: 'resting_energy_kcal',
  HeartRateRecord: 'heart_rate_bpm',
  RestingHeartRateRecord: 'resting_heart_rate_bpm',
  DistanceRecord: 'distance_km',
  SleepSessionRecord: 'sleep_minutes',
  HydrationRecord: 'water_ml',
  NutritionRecord: 'energy_intake_kcal',
  ExerciseSessionRecord: 'workout_minutes',
};

export function isMetric(value: unknown): value is HealthMetric {
  return typeof value === 'string' && value in CANONICAL_METRICS;
}

/* The canonical spelling of a unit, or null when it is unrecognised */
export function normalizeUnit(unit: unknown): string | null {
  if (typeof unit !== 'string') return null;
  const trimmed = unit.trim().toLowerCase();
  const key = UNIT_ALIASES[trimmed] ?? trimmed;
  return key in UNIT_FACTORS ? key : null;
}

/*
 * Resolve a provider's name for a measurement to a canonical metric
 *
 * Canonical names pass straight through, so a plugin that already speaks our
 * vocabulary needs no mapping table of its own
 */
export function normalizeMetric(
  name: unknown,
  provider?: string,
): HealthMetric | null {
  if (typeof name !== 'string') return null;

  const key = name.trim();
  if (isMetric(key)) return key;
  if (provider === 'health_connect') return HEALTH_CONNECT_METRICS[key] ?? null;
  if (provider === 'apple_health') return HEALTHKIT_METRICS[key] ?? null;

  return HEALTHKIT_METRICS[key] ?? HEALTH_CONNECT_METRICS[key] ?? null;
}

/*
 * A value in the metric's canonical unit, or null when the unit belongs to
 * another dimension
 *
 * Reading a kilogram as a kilometre is worse than dropping the sample, so a
 * mismatch is refused rather than guessed at
 */
export function convertValue(
  metric: HealthMetric,
  value: unknown,
  unit?: unknown,
): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;

  const spec = CANONICAL_METRICS[metric];
  const source = normalizeUnit(unit);

  /* No unit given means the value is already canonical */
  if (source === null) {
    return unit === undefined || unit === null || unit === '' ? value : null;
  }

  const [sourceDimension, sourceFactor] = UNIT_FACTORS[source];
  if (sourceDimension !== spec.dimension) return null;

  const [, targetFactor] = UNIT_FACTORS[spec.unit];
  return (value * sourceFactor) / targetFactor;
}

const DISPLAY_UNITS: Partial<Record<HealthMetric, string>> = {
  body_fat_percent: '%',
  steps: '',
};

/* One value rendered the way the settings panel and charts should show it */
export function formatValue(metric: HealthMetric, value: number): string {
  const spec = CANONICAL_METRICS[metric];
  const suffix = DISPLAY_UNITS[metric] ?? spec.unit;
  const decimals = spec.dimension === 'count' || spec.unit === 'ml' ? 0 : 1;
  const rounded = value.toFixed(decimals);
  return suffix ? `${rounded} ${suffix}`.trim() : rounded;
}
