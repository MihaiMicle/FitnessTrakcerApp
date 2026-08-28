import { describe, it, expect } from 'vitest';
import {
  backoffDelay,
  BASE_BACKOFF_MS,
  dueOperations,
  emptyQueue,
  enqueue,
  failedCount,
  hasPendingFor,
  markFailure,
  markSuccess,
  MAX_ATTEMPTS,
  MAX_BACKOFF_MS,
  pendingCount,
  retryFailed,
} from '../queue';
import type { SyncQueue } from '../types';

const A = 'session-a';
const B = 'session-b';

function save(
  queue: SyncQueue,
  entityId: string,
  payload: Record<string, unknown>,
  now = 0,
) {
  return enqueue(queue, { kind: 'save_session', entityId, payload }, now);
}

function remove(queue: SyncQueue, entityId: string, now = 0) {
  return enqueue(queue, { kind: 'delete_session', entityId }, now);
}

describe('enqueue', () => {
  it('adds one operation per session', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = save(q, B, { reps: 8 });
    expect(pendingCount(q)).toBe(2);
  });

  it('coalesces repeated saves for the same session', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = save(q, A, { reps: 6 });
    q = save(q, A, { reps: 7 });

    expect(pendingCount(q)).toBe(1);
    expect(q.operations[0].payload).toEqual({ reps: 7 });
  });

  it('keeps the queue position when coalescing', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = save(q, B, { reps: 1 });
    q = save(q, A, { reps: 9 });

    expect(q.operations.map((o) => o.entityId)).toEqual([A, B]);
  });

  it('keeps attempts but brings the retry forward when coalescing', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = markFailure(q, q.operations[0].id, {
      retryable: true,
      error: 'offline',
      now: 0,
    });
    expect(q.operations[0].nextAttemptAt).toBeGreaterThan(0);

    q = save(q, A, { reps: 6 }, 500);
    expect(q.operations[0].attempts).toBe(1);
    expect(q.operations[0].nextAttemptAt).toBe(500);
    expect(q.operations[0].lastError).toBeNull();
  });

  it('drops pending work for a session that is being deleted', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = save(q, B, { reps: 5 });
    q = remove(q, A);

    expect(q.operations).toHaveLength(2);
    expect(q.operations.map((o) => o.kind)).toEqual([
      'save_session',
      'delete_session',
    ]);
    expect(q.operations[0].entityId).toBe(B);
  });

  it('does not fold a delete into an earlier delete', () => {
    let q = remove(emptyQueue(), A);
    q = remove(q, A, 10);
    expect(pendingCount(q)).toBe(1);
  });
});

describe('dueOperations', () => {
  it('returns operations whose backoff has expired', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = markFailure(q, q.operations[0].id, { retryable: true, now: 0 });

    expect(dueOperations(q, 0)).toHaveLength(0);
    expect(dueOperations(q, BASE_BACKOFF_MS)).toHaveLength(1);
  });

  it('never lets a later operation overtake one for the same session', () => {
    let q = remove(emptyQueue(), A);
    q = markFailure(q, q.operations[0].id, { retryable: true, now: 0 });
    q = save(q, A, { reps: 5 }, 1);

    /* The delete is still backing off, so the save must wait behind it */
    expect(q.operations).toHaveLength(2);
    expect(dueOperations(q, 1)).toHaveLength(0);
  });

  /* Cancelling drops the queued save, so there is nothing left to wait for */
  it('lets a delete run immediately even if the save it replaced was backing off', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = markFailure(q, q.operations[0].id, { retryable: true, now: 0 });
    q = remove(q, A, 1);

    const due = dueOperations(q, 1);
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe('delete_session');
  });

  it('does not let one stalled session block another', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = markFailure(q, q.operations[0].id, { retryable: true, now: 0 });
    q = save(q, B, { reps: 5 }, 1);

    const due = dueOperations(q, 1);
    expect(due).toHaveLength(1);
    expect(due[0].entityId).toBe(B);
  });
});

describe('backoffDelay', () => {
  it('doubles each attempt', () => {
    expect(backoffDelay(1)).toBe(BASE_BACKOFF_MS);
    expect(backoffDelay(2)).toBe(BASE_BACKOFF_MS * 2);
    expect(backoffDelay(3)).toBe(BASE_BACKOFF_MS * 4);
  });

  it('is capped so a long outage still retries', () => {
    expect(backoffDelay(50)).toBe(MAX_BACKOFF_MS);
  });

  it('is zero before the first failure', () => {
    expect(backoffDelay(0)).toBe(0);
  });
});

describe('markSuccess', () => {
  it('removes the operation', () => {
    const q = save(emptyQueue(), A, { reps: 5 });
    expect(pendingCount(markSuccess(q, q.operations[0].id))).toBe(0);
  });

  it('ignores an id that is not queued', () => {
    const q = save(emptyQueue(), A, { reps: 5 });
    expect(pendingCount(markSuccess(q, 'nope'))).toBe(1);
  });
});

describe('markFailure', () => {
  it('backs a retryable failure off rather than dropping it', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = markFailure(q, q.operations[0].id, {
      retryable: true,
      error: 'HTTP 503',
      now: 1_000,
    });

    expect(pendingCount(q)).toBe(1);
    expect(q.operations[0].attempts).toBe(1);
    expect(q.operations[0].lastError).toBe('HTTP 503');
    expect(q.operations[0].nextAttemptAt).toBe(1_000 + BASE_BACKOFF_MS);
  });

  it('dead letters a permanent failure immediately', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = markFailure(q, q.operations[0].id, {
      retryable: false,
      error: 'HTTP 422',
      now: 0,
    });

    expect(pendingCount(q)).toBe(0);
    expect(failedCount(q)).toBe(1);
    expect(q.failed[0].lastError).toBe('HTTP 422');
  });

  it('gives up after the attempt cap', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      const op = q.operations[0];
      if (!op) break;
      q = markFailure(q, op.id, { retryable: true, now: i });
    }

    expect(pendingCount(q)).toBe(0);
    expect(failedCount(q)).toBe(1);
    expect(q.failed[0].attempts).toBe(MAX_ATTEMPTS);
  });

  it('keeps the payload when it gives up, so nothing is lost silently', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = markFailure(q, q.operations[0].id, { retryable: false, now: 0 });
    expect(q.failed[0].payload).toEqual({ reps: 5 });
  });

  it('ignores an id that is not queued', () => {
    const q = save(emptyQueue(), A, { reps: 5 });
    expect(markFailure(q, 'nope', { retryable: true, now: 0 })).toBe(q);
  });
});

describe('retryFailed', () => {
  it('moves dead lettered operations back and clears their history', () => {
    let q = save(emptyQueue(), A, { reps: 5 });
    q = markFailure(q, q.operations[0].id, {
      retryable: false,
      error: 'HTTP 400',
      now: 0,
    });
    q = retryFailed(q, 5_000);

    expect(failedCount(q)).toBe(0);
    expect(pendingCount(q)).toBe(1);
    expect(q.operations[0].attempts).toBe(0);
    expect(q.operations[0].nextAttemptAt).toBe(5_000);
    expect(q.operations[0].lastError).toBeNull();
  });

  it('is a no-op with nothing to retry', () => {
    const q = save(emptyQueue(), A, { reps: 5 });
    expect(retryFailed(q, 0)).toBe(q);
  });
});

describe('hasPendingFor', () => {
  it('reports unsent work for one session', () => {
    const q = save(emptyQueue(), A, { reps: 5 });
    expect(hasPendingFor(q, A)).toBe(true);
    expect(hasPendingFor(q, B)).toBe(false);
  });
});
