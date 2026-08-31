import { describe, expect, it } from 'vitest';
import {
  MAX_FUTURE_SKEW_MS,
  SELF_SOURCE_NAME,
  chunkBatch,
  isOwnWrite,
  latestInstant,
  toWireBatch,
  toWireSample,
} from '@/lib/health/normalize';
import type { WireHealthSample } from '@/lib/health/types';

const NOW = Date.parse('2026-08-31T12:00:00.000Z');

describe('isOwnWrite', () => {
  it('recognises what this app wrote out', () => {
    expect(isOwnWrite(`${SELF_SOURCE_NAME} iOS`)).toBe(true);
  });

  it('leaves other sources alone', () => {
    expect(isOwnWrite('Withings Health Mate')).toBe(false);
    expect(isOwnWrite(null)).toBe(false);
  });
});

describe('toWireSample', () => {
  it('shapes a HealthKit record', () => {
    const sample = toWireSample(
      {
        metric: 'HKQuantityTypeIdentifierBodyMass',
        value: 176.37,
        unit: 'lb',
        start_at: '2026-08-31T12:00:00Z',
        external_id: 'hk-1',
        source: 'Withings',
      },
      'apple_health',
      NOW,
    );

    expect(sample?.metric).toBe('weight_kg');
    expect(sample?.unit).toBe('kg');
    expect(sample?.value).toBeCloseTo(80, 2);
    expect(sample?.external_id).toBe('hk-1');
    expect(sample?.end_at).toBe(sample?.start_at);
  });

  it('reads epoch seconds and milliseconds alike', () => {
    const seconds = toWireSample(
      { metric: 'steps', value: 10, start_at: NOW / 1000 },
      'health_connect',
      NOW,
    );
    const millis = toWireSample(
      { metric: 'steps', value: 10, start_at: NOW },
      'health_connect',
      NOW,
    );
    expect(seconds?.start_at).toBe('2026-08-31T12:00:00.000Z');
    expect(millis?.start_at).toBe('2026-08-31T12:00:00.000Z');
  });

  it('orders a reversed interval', () => {
    const sample = toWireSample(
      {
        metric: 'steps',
        value: 10,
        start_at: '2026-08-31T12:00:00Z',
        end_at: '2026-08-31T11:00:00Z',
      },
      'health_connect',
      NOW,
    );
    expect(Date.parse(sample!.start_at)).toBeLessThan(Date.parse(sample!.end_at));
  });

  it('drops a record from the far future', () => {
    expect(
      toWireSample(
        {
          metric: 'steps',
          value: 10,
          start_at: new Date(NOW + MAX_FUTURE_SKEW_MS * 2).toISOString(),
        },
        'health_connect',
        NOW,
      ),
    ).toBeNull();
  });

  it('drops what this app wrote out itself', () => {
    /* Otherwise a workout we pushed comes back in and is counted twice */
    expect(
      toWireSample(
        {
          metric: 'workout_minutes',
          value: 45,
          unit: 'min',
          start_at: '2026-08-31T12:00:00Z',
          source: `${SELF_SOURCE_NAME} Android`,
        },
        'apple_health',
        NOW,
      ),
    ).toBeNull();
  });

  it.each([
    [{ metric: 'unknown', value: 1, start_at: '2026-08-31T12:00:00Z' }],
    [{ metric: 'steps', value: 1, start_at: 'not a date' }],
    [{ metric: 'steps', start_at: '2026-08-31T12:00:00Z' }],
    [
      {
        metric: 'weight_kg',
        value: 80,
        unit: 'km',
        start_at: '2026-08-31T12:00:00Z',
      },
    ],
  ])('drops the unusable record %#', (raw) => {
    expect(toWireSample(raw as never, 'health_connect', NOW)).toBeNull();
  });
});

describe('toWireBatch', () => {
  it('counts what it dropped', () => {
    const { samples, skipped } = toWireBatch(
      [
        { metric: 'steps', value: 100, start_at: '2026-08-31T10:00:00Z' },
        { metric: 'nope', value: 1, start_at: '2026-08-31T10:00:00Z' },
        'not a record',
      ],
      'health_connect',
      undefined,
      NOW,
    );
    expect(samples).toHaveLength(1);
    expect(skipped).toBe(2);
  });

  it('collapses a repeat inside one read', () => {
    const record = {
      metric: 'steps',
      value: 100,
      start_at: '2026-08-31T10:00:00Z',
      external_id: 'hc-1',
    };
    const { samples, skipped } = toWireBatch(
      [record, record],
      'health_connect',
      undefined,
      NOW,
    );
    expect(samples).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it('keeps two unkeyed records that only look alike', () => {
    /* The server hashes their contents to tell them apart, so both go */
    const { samples } = toWireBatch(
      [
        { metric: 'steps', value: 100, start_at: '2026-08-31T10:00:00Z' },
        { metric: 'steps', value: 100, start_at: '2026-08-31T10:01:00Z' },
      ],
      'health_connect',
      undefined,
      NOW,
    );
    expect(samples).toHaveLength(2);
  });

  it('drops metrics the user did not consent to', () => {
    const { samples, skipped } = toWireBatch(
      [
        { metric: 'steps', value: 100, start_at: '2026-08-31T10:00:00Z' },
        { metric: 'heart_rate_bpm', value: 60, start_at: '2026-08-31T10:00:00Z' },
      ],
      'health_connect',
      ['steps'],
      NOW,
    );
    expect(samples).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it('treats a non-array as an empty read', () => {
    expect(toWireBatch(null, 'health_connect')).toEqual({ samples: [], skipped: 0 });
  });
});

describe('chunkBatch', () => {
  const samples = Array.from({ length: 5 }, (_, i) => ({ i })) as never as WireHealthSample[];

  it('splits on the requested size', () => {
    expect(chunkBatch(samples, 2).map((c) => c.length)).toEqual([2, 2, 1]);
  });

  it('returns nothing for an empty batch', () => {
    expect(chunkBatch([], 2)).toEqual([]);
  });

  it('refuses to loop forever on a zero size', () => {
    expect(chunkBatch(samples, 0)).toEqual([samples]);
  });
});

describe('latestInstant', () => {
  it('finds the newest end time', () => {
    const samples = [
      { end_at: '2026-08-30T10:00:00.000Z' },
      { end_at: '2026-08-31T10:00:00.000Z' },
    ] as WireHealthSample[];
    expect(latestInstant(samples)).toBe('2026-08-31T10:00:00.000Z');
  });

  it('has no answer for an empty batch', () => {
    expect(latestInstant([])).toBeNull();
  });
});
