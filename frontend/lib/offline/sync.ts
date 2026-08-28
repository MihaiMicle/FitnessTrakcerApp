/*
 * Draining the queue
 *
 * The sender is injected rather than imported so this whole file runs in tests
 * with no network and no fake timers
 *
 * The distinction that matters is retryable against permanent. A dropped
 * connection or a 503 will succeed later and must be kept. A 422 means the
 * payload will never be accepted, so retrying it forever would only hide the
 * problem behind a spinner
 */

import { dueOperations, markFailure, markSuccess } from '@/lib/offline/queue';
import type { SendResult, Sender, SyncQueue } from '@/lib/offline/types';

/* Sent per drain, so a large backlog does not block the tab */
export const DEFAULT_MAX_OPS = 25;

export interface SyncReport {
  queue: SyncQueue;
  attempted: number;
  succeeded: number;
  failed: number;
}

/*
 * Whether a status code is worth trying again
 *
 * 401 is retryable because the usual cause is an access token that expired
 * mid workout and will be refreshed before the next attempt
 */
export function isRetryableStatus(status: number): boolean {
  if (status === 401 || status === 408 || status === 429) return true;
  return status >= 500;
}

export function classifyStatus(status: number): SendResult {
  if (status >= 200 && status < 300) {
    return { ok: true, retryable: false, status };
  }
  return {
    ok: false,
    retryable: isRetryableStatus(status),
    status,
    error: `HTTP ${status}`,
  };
}

/* A thrown fetch is a transport problem, which is always worth retrying */
export function classifyError(error: unknown): SendResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, retryable: true, error: message };
}

/*
 * Attempt every operation that is due
 *
 * Operations run one at a time. Concurrency would buy little here, since the
 * queue holds at most one save per session, and serial sending keeps the
 * ordering guarantee obvious
 */
export async function runSync(
  queue: SyncQueue,
  send: Sender,
  options: { now: () => number; maxOps?: number },
): Promise<SyncReport> {
  const maxOps = options.maxOps ?? DEFAULT_MAX_OPS;
  const batch = dueOperations(queue, options.now()).slice(0, maxOps);

  let next = queue;
  let succeeded = 0;
  let failed = 0;

  for (const op of batch) {
    let result: SendResult;
    try {
      result = await send(op);
    } catch (error) {
      result = classifyError(error);
    }

    if (result.ok) {
      next = markSuccess(next, op.id);
      succeeded += 1;
    } else {
      next = markFailure(next, op.id, {
        retryable: result.retryable,
        error: result.error ?? null,
        now: options.now(),
      });
      failed += 1;
    }
  }

  return { queue: next, attempted: batch.length, succeeded, failed };
}
