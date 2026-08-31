/*
 * Turning a plugin's records into something worth sending
 *
 * The backend normalizes everything again, and has to: a browser upload never
 * passes through here. What this does is stop the device wasting a request on
 * records the server would only throw away, and collapse the repeats that come
 * from reading overlapping windows
 */

import {
  convertValue,
  CANONICAL_METRICS,
  normalizeMetric,
  type HealthMetric,
} from '@/lib/health/metrics';
import type {
  HealthProvider,
  RawHealthRecord,
  WireHealthSample,
} from '@/lib/health/types';

/* The name this app writes under when it pushes data into a health store */
export const SELF_SOURCE_NAME = 'FitnessTracker';

/* A sample this far ahead is a clock bug, not a measurement */
export const MAX_FUTURE_SKEW_MS = 86_400_000;

/*
 * Whether a record is one we wrote out ourselves
 *
 * Two way sync has an obvious failure: the app writes a workout into Apple
 * Health, the next read pulls it back in, and it is counted twice. The plugin
 * filters on the writing app where the platform exposes it, and this catches
 * the cases where it does not
 */
export function isOwnWrite(source: unknown): boolean {
  if (typeof source !== 'string') return false;
  return source.trim().toLowerCase().includes(SELF_SOURCE_NAME.toLowerCase());
}

function toIso(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    /* Plugins report either seconds or milliseconds, and the magnitude tells */
    const ms = Math.abs(value) > 1e11 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/* One record as a wire sample, or null when it is not worth sending */
export function toWireSample(
  raw: RawHealthRecord,
  provider: HealthProvider,
  now: number = Date.now(),
): WireHealthSample | null {
  if (!raw || typeof raw !== 'object') return null;

  const metric = normalizeMetric(raw.metric, provider);
  if (metric === null) return null;

  if (isOwnWrite(raw.source)) return null;

  const start = toIso(raw.start_at);
  if (start === null) return null;
  let end = toIso(raw.end_at ?? null) ?? start;

  /* A reversed interval is a plugin bug, and ordering it costs nothing */
  let orderedStart = start;
  if (Date.parse(end) < Date.parse(orderedStart)) {
    [orderedStart, end] = [end, orderedStart];
  }

  if (Date.parse(orderedStart) - now > MAX_FUTURE_SKEW_MS) return null;

  const value = convertValue(metric, raw.value, raw.unit ?? undefined);
  if (value === null) return null;

  const sample: WireHealthSample = {
    metric,
    value,
    unit: CANONICAL_METRICS[metric].unit,
    start_at: orderedStart,
    end_at: end,
  };

  if (typeof raw.external_id === 'string' && raw.external_id.trim()) {
    sample.external_id = raw.external_id.trim();
  }
  if (typeof raw.source === 'string' && raw.source.trim()) {
    sample.source = raw.source.trim().slice(0, 200);
  }
  if (raw.payload && typeof raw.payload === 'object') {
    sample.payload = raw.payload;
  }

  return sample;
}

/*
 * A whole read turned into a batch, and how many records were dropped
 *
 * Records without a provider id keep their place: the server hashes their
 * contents to get one, and two genuinely identical readings a second apart
 * are still two readings
 */
export function toWireBatch(
  records: unknown,
  provider: HealthProvider,
  allowed?: HealthMetric[],
  now: number = Date.now(),
): { samples: WireHealthSample[]; skipped: number } {
  if (!Array.isArray(records)) return { samples: [], skipped: 0 };

  const permitted = allowed && allowed.length ? new Set(allowed) : null;
  const byId = new Map<string, WireHealthSample>();
  const unkeyed: WireHealthSample[] = [];
  let skipped = 0;

  for (const record of records) {
    const sample = toWireSample(record as RawHealthRecord, provider, now);
    if (sample === null || (permitted && !permitted.has(sample.metric))) {
      skipped += 1;
      continue;
    }

    if (sample.external_id) {
      /* Later wins, matching the upsert the server will do anyway */
      if (byId.has(sample.external_id)) skipped += 1;
      byId.set(sample.external_id, sample);
    } else {
      unkeyed.push(sample);
    }
  }

  return { samples: [...byId.values(), ...unkeyed], skipped };
}

/*
 * Split a batch into requests the server will accept
 *
 * A phone granting permission for the first time can hand over years of
 * history in one read, which is far more than one request should carry
 */
export function chunkBatch(
  samples: WireHealthSample[],
  size = 1000,
): WireHealthSample[][] {
  if (size < 1) return [samples];
  const chunks: WireHealthSample[][] = [];
  for (let i = 0; i < samples.length; i += size) {
    chunks.push(samples.slice(i, i + size));
  }
  return chunks;
}

/* The newest instant in a batch, used to advance the read cursor */
export function latestInstant(samples: WireHealthSample[]): string | null {
  let latest: number | null = null;
  for (const sample of samples) {
    const parsed = Date.parse(sample.end_at);
    if (!Number.isNaN(parsed) && (latest === null || parsed > latest)) {
      latest = parsed;
    }
  }
  return latest === null ? null : new Date(latest).toISOString();
}
