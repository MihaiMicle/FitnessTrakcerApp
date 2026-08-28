import { describe, it, expect } from 'vitest';
import {
  chooseActiveWorkout,
  DRAFT_MAX_AGE_MS,
  draftToSession,
  isDraft,
  isDraftStale,
  isResumable,
  makeDraft,
  newLocalSession,
  type WorkoutDraft,
} from '../draft';
import { isUuid } from '../ids';

const NOW = 1_700_000_000_000;

function draft(overrides: Partial<WorkoutDraft> = {}): WorkoutDraft {
  return {
    ...makeDraft(
      {
        sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        name: 'Push Day',
        startTime: new Date(NOW - 60_000).toISOString(),
        exercises: [{ id: 'ex-1', sets: [] }],
      },
      NOW,
    ),
    ...overrides,
  };
}

describe('makeDraft', () => {
  it('defaults an unfinished workout with no sets logged yet', () => {
    const d = makeDraft(
      { sessionId: 'x', name: 'Legs', startTime: 'now' },
      NOW,
    );
    expect(d.status).toBe('in_progress');
    expect(d.durationSeconds).toBe(0);
    expect(d.exercises).toEqual([]);
    expect(d.updatedAt).toBe(NOW);
  });
});

describe('isDraft', () => {
  it('accepts a well formed draft', () => {
    expect(isDraft(draft())).toBe(true);
  });

  it('rejects anything that is not one', () => {
    expect(isDraft(null)).toBe(false);
    expect(isDraft('workout')).toBe(false);
    expect(isDraft({ sessionId: 'x' })).toBe(false);
    expect(isDraft({ ...draft(), exercises: 'not an array' })).toBe(false);
  });
});

describe('isDraftStale', () => {
  it('accepts one saved recently', () => {
    expect(isDraftStale(draft(), NOW + 60_000)).toBe(false);
  });

  it('rejects one left over from days ago', () => {
    expect(isDraftStale(draft(), NOW + DRAFT_MAX_AGE_MS + 1)).toBe(true);
  });
});

describe('isResumable', () => {
  it('resumes a recent workout still in progress', () => {
    expect(isResumable(draft(), NOW)).toBe(true);
  });

  it('does not resume a finished workout', () => {
    expect(isResumable(draft({ status: 'completed' }), NOW)).toBe(false);
  });

  it('does not resume a stale one', () => {
    expect(isResumable(draft(), NOW + DRAFT_MAX_AGE_MS + 1)).toBe(false);
  });

  it('handles there being no draft', () => {
    expect(isResumable(null, NOW)).toBe(false);
  });
});

describe('draftToSession', () => {
  it('produces the shape the workout context expects', () => {
    expect(draftToSession(draft())).toMatchObject({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Push Day',
      status: 'in_progress',
    });
  });
});

describe('chooseActiveWorkout', () => {
  const server = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Server Workout',
    status: 'in_progress',
    start_time: new Date(NOW - 120_000).toISOString(),
    exercises: [],
  };

  it('returns nothing when there is neither', () => {
    expect(chooseActiveWorkout(null, null, NOW)).toBeNull();
  });

  it('uses the draft when the server has no active session', () => {
    expect(chooseActiveWorkout(draft(), null, NOW)).toMatchObject({
      name: 'Push Day',
    });
  });

  it('uses the server when there is no draft', () => {
    expect(chooseActiveWorkout(null, server, NOW)).toMatchObject({
      name: 'Server Workout',
    });
  });

  /* The whole point of the draft: it holds sets the server has not seen */
  it('prefers the draft when both describe the same session', () => {
    const sameId = { ...server, id: draft().sessionId, name: 'Stale Copy' };
    expect(chooseActiveWorkout(draft(), sameId, NOW)).toMatchObject({
      name: 'Push Day',
    });
  });

  it('prefers a workout started more recently on another device', () => {
    const newer = { ...server, start_time: new Date(NOW).toISOString() };
    expect(chooseActiveWorkout(draft(), newer, NOW)).toMatchObject({
      name: 'Server Workout',
    });
  });

  it('keeps the draft when it is the more recent of two workouts', () => {
    expect(chooseActiveWorkout(draft(), server, NOW)).toMatchObject({
      name: 'Push Day',
    });
  });

  it('falls back to the server when the draft is stale', () => {
    const later = NOW + DRAFT_MAX_AGE_MS + 1;
    expect(chooseActiveWorkout(draft(), server, later)).toMatchObject({
      name: 'Server Workout',
    });
  });

  it('keeps the draft when the server session has no usable start time', () => {
    const undated = { ...server, start_time: undefined };
    expect(chooseActiveWorkout(draft(), undated, NOW)).toMatchObject({
      name: 'Push Day',
    });
  });
});

describe('newLocalSession', () => {
  it('is loggable before any request has been made', () => {
    const session = newLocalSession('Pull Day', [{ id: 'ex-1' }], NOW);

    expect(isUuid(session.id)).toBe(true);
    expect(session.status).toBe('in_progress');
    expect(session.duration_seconds).toBe(0);
    expect(session.start_time).toBe(new Date(NOW).toISOString());
    expect(session.exercises).toHaveLength(1);
  });

  it('gives every session a distinct id', () => {
    const a = newLocalSession('a', [], NOW);
    const b = newLocalSession('b', [], NOW);
    expect(a.id).not.toBe(b.id);
  });
});
