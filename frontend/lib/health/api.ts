/* lib/health/api.ts */

import { supabase } from '@/lib/supabase';
import type { HealthMetric } from '@/lib/health/metrics';
import type {
  HealthConnection,
  HealthConnectionUpdate,
  HealthDailyPoint,
  HealthExportBatch,
  HealthProvider,
  SyncResult,
  WireHealthSample,
} from '@/lib/health/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

async function getToken(): Promise<string | undefined> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  /* 204 from disconnect has no body */
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getConnections(): Promise<HealthConnection[]> {
  return request<HealthConnection[]>('/health/connections');
}

export function saveConnection(
  payload: HealthConnectionUpdate,
): Promise<HealthConnection> {
  return request<HealthConnection>('/health/connections', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function disconnect(provider: HealthProvider): Promise<void> {
  return request<void>(`/health/connections/${provider}?purge=true`, {
    method: 'DELETE',
  });
}

export function postSync(payload: {
  provider: HealthProvider;
  samples: WireHealthSample[];
  synced_through?: string;
}): Promise<SyncResult> {
  return request<SyncResult>('/health/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchExport(
  provider: HealthProvider,
  since?: string,
): Promise<HealthExportBatch> {
  const params = new URLSearchParams({ provider });
  if (since) params.set('since', since);
  return request<HealthExportBatch>(`/health/export?${params.toString()}`);
}

export function postExportAck(payload: {
  provider: HealthProvider;
  written_through: string;
}): Promise<HealthExportBatch> {
  return request<HealthExportBatch>('/health/export/ack', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getDaily(
  metric: HealthMetric,
  start?: string,
  end?: string,
): Promise<HealthDailyPoint[]> {
  const params = new URLSearchParams({ metric });
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  return request<HealthDailyPoint[]>(`/health/daily?${params.toString()}`);
}

/*
 * Upload an Apple Health export
 *
 * The archive is parsed on the server, not here. These files run to hundreds
 * of megabytes and a tab that holds one in memory while parsing XML gets
 * killed on a phone, which is the device the export came from
 *
 * fetch sets its own multipart boundary, so the Content-Type header the other
 * calls share has to be left off
 */
export async function importAppleExport(file: File): Promise<SyncResult> {
  const token = await getToken();
  const body = new FormData();
  body.append('file', file);

  const res = await fetch(`${BASE_URL}/health/import/apple`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Import failed: ${res.status}`);
  }

  return res.json();
}
