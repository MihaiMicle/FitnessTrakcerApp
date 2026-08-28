import { describe, it, expect, vi } from 'vitest';
import { emptyQueue, enqueue, pendingCount } from '../queue';
import { runSync } from '../sync';
import {
  chooseActiveWorkout,
  isDraft,
  makeDraft,
  newLocalSession,
} from '../draft';
import { parseQueue } from '../storage';
import type { SendResult, SyncQueue } from '../types';

/*
 * The actual journey, rather than the pieces
 *
 * A user walks into a basement gym with no signal, logs a full workout, the
 * phone evicts the tab halfway through, and they only get a connection back in
 * the car park. Nothing may be lost at any point
 */

const OFFLINE: SendResult = {
  ok: false,
  retryable: true,
  error: 'Failed to fetch',
};
const ONLINE: SendResult = { ok: true, retryable: false };

const START = 1_700_000_000_000;

function saveWorkout(
  queue: SyncQueue,
  session: Record<string, unknown>,
  exercises: unknown[],
  status: string,
  now: number,
): SyncQueue {
  return enqueue(
    queue,
    {
      kind: 'save_session',
      entityId: session.id as string,
      payload: { ...session, status, exercises },
    },
    now,
  );
}

describe('a workout logged with no signal', () => {
  it('survives the whole session and uploads once at the end', async () => {
    /* The workout starts on the device, with no request involved */
    const session = newLocalSession('Push Day', [], START);
    let queue = saveWorkout(emptyQueue(), session, [], 'in_progress', START);

    /* Twelve sets get checked off over the next hour */
    let exercises: unknown[] = [];
    for (let i = 1; i <= 12; i += 1) {
      exercises = [
        { id: 'ex-1', name: 'Bench Press', sets: Array.from({ length: i }) },
      ];
      queue = saveWorkout(
        queue,
        session,
        exercises,
        'in_progress',
        START + i * 60_000,
      );
    }

    /* Every attempt to send has failed, but coalescing kept it to one save */
    const offlineSend = vi.fn().mockResolvedValue(OFFLINE);
    const stalled = await runSync(queue, offlineSend, {
      now: () => START + 12 * 60_000,
    });

    expect(pendingCount(stalled.queue)).toBe(1);
    expect(offlineSend).toHaveBeenCalledTimes(1);
    expect(stalled.queue.failed).toHaveLength(0);

    /* Finishing coalesces onto the same operation, so completed wins */
    queue = saveWorkout(
      stalled.queue,
      session,
      exercises,
      'completed',
      START + 70 * 60_000,
    );
    expect(pendingCount(queue)).toBe(1);

    /* Signal returns in the car park */
    const onlineSend = vi.fn().mockResolvedValue(ONLINE);
    const flushed = await runSync(queue, onlineSend, {
      now: () => START + 71 * 60_000,
    });

    expect(flushed.queue.operations).toHaveLength(0);
    expect(onlineSend).toHaveBeenCalledOnce();

    const sent = onlineSend.mock.calls[0][0].payload;
    expect(sent.status).toBe('completed');
    expect(sent.id).toBe(session.id);
    expect(sent.exercises).toEqual(exercises);
  });

  it('restores the workout after the tab is evicted mid session', () => {
    const session = newLocalSession('Push Day', [], START);
    const exercises = [{ id: 'ex-1', name: 'Squat', sets: [{ set: 1 }] }];

    const draft = makeDraft(
      {
        sessionId: session.id as string,
        name: 'Push Day',
        startTime: session.start_time as string,
        exercises,
      },
      START + 20 * 60_000,
    );

    /* What comes back out of local storage after the reload */
    const rehydrated = JSON.parse(JSON.stringify(draft));
    expect(isDraft(rehydrated)).toBe(true);

    /* The server never heard about this workout, so it offers nothing */
    const restored = chooseActiveWorkout(rehydrated, null, START + 21 * 60_000);

    expect(restored).toMatchObject({ id: session.id, name: 'Push Day' });
    expect((restored as any).exercises).toEqual(exercises);
  });

  it('keeps the unsent sets when the server offers a staler copy', () => {
    const session = newLocalSession('Push Day', [], START);
    const draft = makeDraft(
      {
        sessionId: session.id as string,
        name: 'Push Day',
        startTime: session.start_time as string,
        exercises: [{ id: 'ex-1', sets: [{ set: 1 }, { set: 2 }] }],
      },
      START + 20 * 60_000,
    );

    /* The server has the session, but only as it was when it was created */
    const stale = {
      id: session.id as string,
      name: 'Push Day',
      status: 'in_progress',
      start_time: session.start_time as string,
      exercises: [],
    };

    const chosen = chooseActiveWorkout(draft, stale, START + 21 * 60_000);
    expect((chosen as any).exercises).toHaveLength(1);
  });

  it('survives a queue that was written to storage and read back', () => {
    const session = newLocalSession('Push Day', [], START);
    const queue = saveWorkout(emptyQueue(), session, [], 'in_progress', START);

    const round = parseQueue(JSON.parse(JSON.stringify(queue)));
    expect(round.operations).toHaveLength(1);
    expect(round.operations[0].entityId).toBe(session.id);
  });

  it('holds the workout rather than losing it when the token expired', async () => {
    const session = newLocalSession('Push Day', [], START);
    const queue = saveWorkout(emptyQueue(), session, [], 'completed', START);

    const send = vi
      .fn()
      .mockResolvedValue({ ok: false, retryable: true, error: 'HTTP 401' });
    const report = await runSync(queue, send, { now: () => START });

    expect(report.queue.operations).toHaveLength(1);
    expect(report.queue.failed).toHaveLength(0);
  });
});
