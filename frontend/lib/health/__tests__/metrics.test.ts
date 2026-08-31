import { describe, expect, it } from 'vitest';
import {
  CANONICAL_METRICS,
  HEALTHKIT_METRICS,
  HEALTH_CONNECT_METRICS,
  METRIC_KEYS,
  UNIT_FACTORS,
  convertValue,
  formatValue,
  isMetric,
  normalizeMetric,
  normalizeUnit,
} from '@/lib/health/metrics';

/*
 * The same table is pinned in backend/tests/test_health.py
 *
 * A metric added on one side and not the other fails here rather than in
 * production, where it would show up as a phone and a browser disagreeing
 * about what they just synced
 */
describe('the canonical metric table', () => {
  it('matches the set the backend knows', () => {
    expect(new Set(METRIC_KEYS)).toEqual(
      new Set([
        'weight_kg',
        'body_fat_percent',
        'height_cm',
        'steps',
        'active_energy_kcal',
        'resting_energy_kcal',
        'heart_rate_bpm',
        'resting_heart_rate_bpm',
        'distance_km',
        'sleep_minutes',
        'water_ml',
        'energy_intake_kcal',
        'protein_g',
        'carbs_g',
        'fat_g',
        'workout_minutes',
      ]),
    );
  });

  it('gives every metric a unit from its own dimension', () => {
    for (const metric of METRIC_KEYS) {
      const spec = CANONICAL_METRICS[metric];
      expect(UNIT_FACTORS[spec.unit], metric).toBeDefined();
      expect(UNIT_FACTORS[spec.unit][0], metric).toBe(spec.dimension);
    }
  });

  it('only maps provider identifiers onto real metrics', () => {
    for (const table of [HEALTHKIT_METRICS, HEALTH_CONNECT_METRICS]) {
      for (const [identifier, metric] of Object.entries(table)) {
        expect(isMetric(metric), identifier).toBe(true);
      }
    }
  });
});

describe('normalizeUnit', () => {
  it.each([
    ['kg', 'kg'],
    ['Kilograms', 'kg'],
    ['lbs', 'lb'],
    ['%', 'percent'],
    ['count/min', 'bpm'],
    ['  KCAL  ', 'kcal'],
    ['mL', 'ml'],
  ])('folds %s onto %s', (given, expected) => {
    expect(normalizeUnit(given)).toBe(expected);
  });

  it.each([['parsecs'], [''], [null], [5], ['kg/m2']])(
    'rejects %s',
    (given) => {
      expect(normalizeUnit(given)).toBeNull();
    },
  );
});

describe('normalizeMetric', () => {
  it('passes canonical names straight through', () => {
    expect(normalizeMetric('weight_kg')).toBe('weight_kg');
  });

  it('maps a HealthKit identifier', () => {
    expect(
      normalizeMetric('HKQuantityTypeIdentifierStepCount', 'apple_health'),
    ).toBe('steps');
  });

  it('maps a Health Connect record', () => {
    expect(normalizeMetric('HydrationRecord', 'health_connect')).toBe('water_ml');
  });

  it('tries both vocabularies when given no provider', () => {
    expect(normalizeMetric('WeightRecord')).toBe('weight_kg');
    expect(normalizeMetric('HKQuantityTypeIdentifierBodyMass')).toBe('weight_kg');
  });

  it.each([['nonsense'], [null], [7], ['']])('drops %s', (given) => {
    expect(normalizeMetric(given)).toBeNull();
  });
});

describe('convertValue', () => {
  it('converts pounds to kilograms', () => {
    expect(convertValue('weight_kg', 176.37, 'lb')).toBeCloseTo(80, 2);
  });

  it('converts miles to kilometres', () => {
    expect(convertValue('distance_km', 1, 'mi')).toBeCloseTo(1.609344, 6);
  });

  it('converts litres to millilitres', () => {
    expect(convertValue('water_ml', 2, 'l')).toBeCloseTo(2000);
  });

  it('converts hours to minutes', () => {
    expect(convertValue('sleep_minutes', 7, 'h')).toBeCloseTo(420);
  });

  it('treats a missing unit as already canonical', () => {
    expect(convertValue('steps', 8000)).toBe(8000);
  });

  it('refuses a unit from another dimension', () => {
    /* Reading a kilogram as a kilometre is worse than dropping the sample */
    expect(convertValue('weight_kg', 80, 'km')).toBeNull();
  });

  it.each([[null], ['80'], [undefined], [NaN]])(
    'rejects the non-number %s',
    (value) => {
      expect(convertValue('weight_kg', value, 'kg')).toBeNull();
    },
  );
});

describe('formatValue', () => {
  it('renders steps as a whole number without a unit', () => {
    expect(formatValue('steps', 8421.4)).toBe('8421');
  });

  it('renders body fat as a percentage', () => {
    expect(formatValue('body_fat_percent', 18.25)).toBe('18.3 %');
  });

  it('renders weight with its unit', () => {
    expect(formatValue('weight_kg', 80)).toBe('80.0 kg');
  });
});
