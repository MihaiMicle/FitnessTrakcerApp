import { describe, expect, it } from 'vitest';
import {
  FIRST_READ_DAYS,
  OVERLAP_MINUTES,
  describeResult,
  emptyResult,
  mergeResults,
  resolveReadWindow,
} from '@/lib/health/sync';
import type { SyncResult, WireHealthSample } from '@/lib/health/types';

const NOW = Date.parse('2026-08-31T12:00:00.000Z');
const DAY_MS = 86_400_000;

describe('resolveReadWindow', () => {
  it('asks for the first window when there is no cursor', () => {
    const window = resolveReadWindow(null, NOW);
    expect(Date.parse(window.end)).toBe(NOW);
    expect(Date.parse(window.start)).toBe(NOW - FIRST_READ_DAYS * DAY_MS);
  });

  it('overlaps the cursor rather than reading strictly forward', () => {
    /* A watch that syncs late writes yesterday's sample today, and reading
       forward from the cursor would miss it forever */
    const cursor = new Date(NOW - DAY_MS).toISOString();
    const window = resolveReadWindow(cursor, NOW);
    expect(Date.parse(window.start)).toBe(
      Date.parse(cursor) - OVERLAP_MINUTES * 60_000,
    );
  });

  it('falls back to a full read when the cursor is in the future', () => {
    const cursor = new Date(NOW + DAY_MS).toISOString();
    const window = resolveReadWindow(cursor, NOW);
    expect(Date.parse(window.start)).toBe(NOW - FIRST_READ_DAYS * DAY_MS);
  });

  it('falls back to a full read on an unreadable cursor', () => {
    const window = resolveReadWindow('whenever', NOW);
    expect(Date.parse(window.start)).toBe(NOW - FIRST_READ_DAYS * DAY_MS);
  });
});

describe('mergeResults', () => {
  const chunk = (over: Partial<SyncResult>): SyncResult => ({
    ...emptyResult(),
    ...over,
  });

  it('adds the counts up', () => {
    const merged = mergeResults([
      chunk({ accepted: 3, duplicates: 1, skipped: 2 }),
      chunk({ accepted: 4, duplicates: 0, skipped: 1 }),
    ]);
    expect(merged.accepted).toBe(7);
    expect(merged.duplicates).toBe(1);
    expect(merged.skipped).toBe(3);
  });

  it('adds up what was applied per metric', () => {
    const merged = mergeResults([
      chunk({ applied: { weight_kg: 2 } }),
      chunk({ applied: { weight_kg: 1, water_ml: 4 } }),
    ]);
    expect(merged.applied).toEqual({ weight_kg: 3, water_ml: 4 });
  });

  it('keeps the furthest cursor', () => {
    const merged = mergeResults([
      chunk({ last_import_at: '2026-08-30T00:00:00Z' }),
      chunk({ last_import_at: '2026-08-31T00:00:00Z' }),
    ]);
    expect(merged.last_import_at).toBe('2026-08-31T00:00:00Z');
  });

  it('merges nothing into an empty result', () => {
    expect(mergeResults([])).toEqual(emptyResult());
  });
});

describe('describeResult', () => {
  const samples = [{}] as WireHealthSample[];

  it('says so when the read found nothing', () => {
    expect(describeResult(emptyResult(), [])).toBe('Already up to date');
  });

  it('reports what landed', () => {
    const summary = describeResult(
      { accepted: 5, duplicates: 2, skipped: 1, applied: { weight_kg: 3 } },
      samples,
    );
    expect(summary).toContain('5 new');
    expect(summary).toContain('2 already had');
    expect(summary).toContain('3 added to your log');
  });
});
