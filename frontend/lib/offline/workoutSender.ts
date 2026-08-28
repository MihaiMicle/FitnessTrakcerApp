/*
 * Turning a queued operation into a request
 *
 * The only network aware part of the queue. Kept separate so `sync.ts` stays
 * testable without stubbing fetch or Supabase
 */

import { supabase } from '@/lib/supabase';
import { classifyError, classifyStatus } from '@/lib/offline/sync';
import type { SendResult, SyncOperation } from '@/lib/offline/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

async function accessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function sendWorkoutOperation(
  op: SyncOperation,
): Promise<SendResult> {
  const token = await accessToken();

  /* Signed out is temporary, so hold the work until a token exists again */
  if (!token) {
    return { ok: false, retryable: true, error: 'No auth session' };
  }

  const url = `${BASE_URL}/workouts/${op.entityId}`;

  try {
    if (op.kind === 'delete_session') {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      /* Already gone is the outcome the delete wanted */
      if (res.status === 404)
        return { ok: true, retryable: false, status: 404 };
      return classifyStatus(res.status);
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(op.payload ?? {}),
    });
    return classifyStatus(res.status);
  } catch (error) {
    return classifyError(error);
  }
}
