import { describe, it, expect, vi } from 'vitest';
import {
  classifyError,
  classifyStatus,
  isRetryableStatus,
  runSync,
} from '../sync';
import { emptyQueue, enqueue } from '../queue';
import type { SendResult, SyncQueue } from '../types';

function withSaves(ids: string[]): SyncQueue {
  return ids.reduce(
    (q, id) =>
      enqueue(q, { kind: 'save_session', entityId: id, payload: {} }, 0),
    emptyQueue(),
  );
}

const clock = { now: () => 0 };

describe('isRetryableStatus', () => {
  it('retries transport and server side problems', () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(408)).toBe(true);
  });

  it('retries an expired token, which the next attempt will have refreshed', () => {
    expect(isRetryableStatus(401)).toBe(true);
  });

  it('does not retry a request the server will always reject', () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(403)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(422)).toBe(false);
  });
});

describe('classifyStatus', () => {
  it('accepts any 2xx', () => {
    expect(classifyStatus(200).ok).toBe(true);
    expect(classifyStatus(204).ok).toBe(true);
  });

  it('reports the status on a failure', () => {
    const result = classifyStatus(503);
    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.error).toContain('503');
  });
});

describe('classifyError', () => {
  it('treats a thrown fetch as retryable', () => {
    const result = classifyError(new Error('Failed to fetch'));
    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.error).toBe('Failed to fetch');
  });

  it('handles a thrown non-error', () => {
    expect(classifyError('boom').error).toBe('boom');
  });
});

describe('runSync', () => {
  const ok: SendResult = { ok: true, retryable: false };

  it('clears the queue when everything succeeds', async () => {
    const send = vi.fn().mockResolvedValue(ok);
    const report = await runSync(withSaves(['a', 'b']), send, clock);

    expect(send).toHaveBeenCalledTimes(2);
    expect(report.succeeded).toBe(2);
    expect(report.queue.operations).toHaveLength(0);
  });

  it('keeps a retryable failure queued', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ ok: false, retryable: true, error: 'HTTP 500' });
    const report = await runSync(withSaves(['a']), send, clock);

    expect(report.failed).toBe(1);
    expect(report.queue.operations).toHaveLength(1);
    expect(report.queue.failed).toHaveLength(0);
  });

  it('dead letters a permanent failure', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ ok: false, retryable: false, error: 'HTTP 422' });
    const report = await runSync(withSaves(['a']), send, clock);

    expect(report.queue.operations).toHaveLength(0);
    expect(report.queue.failed).toHaveLength(1);
  });

  it('treats a sender that throws as retryable rather than crashing', async () => {
    const send = vi.fn().mockRejectedValue(new Error('network down'));
    const report = await runSync(withSaves(['a']), send, clock);

    expect(report.failed).toBe(1);
    expect(report.queue.operations[0].lastError).toBe('network down');
  });

  it('does not let one failure stop the rest of the batch', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, retryable: true, error: 'x' })
      .mockResolvedValueOnce(ok);
    const report = await runSync(withSaves(['a', 'b']), send, clock);

    expect(report.attempted).toBe(2);
    expect(report.succeeded).toBe(1);
    expect(report.failed).toBe(1);
  });

  it('sends at most maxOps in one drain', async () => {
    const send = vi.fn().mockResolvedValue(ok);
    const report = await runSync(withSaves(['a', 'b', 'c']), send, {
      ...clock,
      maxOps: 2,
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(report.queue.operations).toHaveLength(1);
  });

  it('sends nothing when the queue is empty', async () => {
    const send = vi.fn();
    const report = await runSync(emptyQueue(), send, clock);

    expect(send).not.toHaveBeenCalled();
    expect(report.attempted).toBe(0);
  });
});
