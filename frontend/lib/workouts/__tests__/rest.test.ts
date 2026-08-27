import { describe, it, expect } from 'vitest';
import {
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  clampRestSeconds,
  exerciseRestSeconds,
  formatRest,
  hasRestOverride,
  normalizeSetType,
  parseRestInput,
  planRestAfterSet,
  resolveRestSeconds,
  supersetGroupIndexes,
  withExerciseRest,
  withSetRest,
  type RestExercise,
} from '../rest';

/*
 * The rules being pinned here are the ones a user notices immediately when
 * they break: resting 90 seconds between warm-ups, a drop set that makes you
 * wait, or a superset that starts a timer halfway through the round
 */

function exercise(overrides: Partial<RestExercise> = {}): RestExercise {
  return {
    id: 'ex-1',
    name: 'Bench Press',
    superset_id: null,
    sets: [
      { set: 1, set_type: 'working', completed: false },
      { set: 2, set_type: 'working', completed: false },
    ],
    ...overrides,
  };
}

describe('normalizeSetType', () => {
  it('keeps the four known types', () => {
    for (const type of ['working', 'W', 'D', 'F']) {
      expect(normalizeSetType(type)).toBe(type);
    }
  });

  it('treats anything else as a working set', () => {
    /* Old rows predate set types and have no `set_type` at all */
    expect(normalizeSetType(undefined)).toBe('working');
    expect(normalizeSetType(null)).toBe('working');
    expect(normalizeSetType('')).toBe('working');
    expect(normalizeSetType('warmup')).toBe('working');
    expect(normalizeSetType(3)).toBe('working');
  });
});

describe('DEFAULT_REST_SECONDS', () => {
  it('rests drop sets for ten seconds', () => {
    /* Straight from the task, a drop set is meant to follow immediately */
    expect(DEFAULT_REST_SECONDS.D).toBe(10);
  });

  it('rests warm-ups less than working sets', () => {
    expect(DEFAULT_REST_SECONDS.W).toBeLessThan(DEFAULT_REST_SECONDS.working);
  });

  it('rests failure sets at least as long as working sets', () => {
    expect(DEFAULT_REST_SECONDS.F).toBeGreaterThanOrEqual(
      DEFAULT_REST_SECONDS.working,
    );
  });
});

describe('clampRestSeconds', () => {
  it('rounds to whole seconds', () => {
    expect(clampRestSeconds(90.4)).toBe(90);
    expect(clampRestSeconds(90.6)).toBe(91);
  });

  it('floors at zero and caps at an hour', () => {
    expect(clampRestSeconds(-30)).toBe(0);
    expect(clampRestSeconds(999999)).toBe(MAX_REST_SECONDS);
  });

  it('handles values that are not real numbers', () => {
    expect(clampRestSeconds(Number.NaN)).toBe(0);
    expect(clampRestSeconds(Number.POSITIVE_INFINITY)).toBe(MAX_REST_SECONDS);
    expect(clampRestSeconds(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('parseRestInput', () => {
  it('reads a number out of a form field', () => {
    expect(parseRestInput('120')).toBe(120);
    expect(parseRestInput(45)).toBe(45);
  });

  it('treats blank as inherit rather than zero', () => {
    /* Clearing the field must fall back to the default, not to no rest */
    expect(parseRestInput('')).toBeNull();
    expect(parseRestInput('   ')).toBeNull();
    expect(parseRestInput(null)).toBeNull();
    expect(parseRestInput(undefined)).toBeNull();
  });

  it('keeps an explicit zero', () => {
    /* Zero is a real choice, it means take no rest at all */
    expect(parseRestInput('0')).toBe(0);
  });

  it('ignores junk', () => {
    expect(parseRestInput('abc')).toBeNull();
  });
});

describe('resolveRestSeconds', () => {
  it('falls back to the default for the set type', () => {
    const ex = exercise();
    expect(resolveRestSeconds(ex, { set_type: 'W' })).toBe(
      DEFAULT_REST_SECONDS.W,
    );
    expect(resolveRestSeconds(ex, { set_type: 'D' })).toBe(10);
  });

  it('prefers the exercise setting over the default', () => {
    const ex = exercise({ rest_by_type: { working: 150 } });
    expect(resolveRestSeconds(ex, { set_type: 'working' })).toBe(150);
  });

  it('applies the exercise setting per set type, not across all of them', () => {
    const ex = exercise({ rest_by_type: { working: 150 } });
    expect(resolveRestSeconds(ex, { set_type: 'W' })).toBe(
      DEFAULT_REST_SECONDS.W,
    );
  });

  it('prefers a single set override over everything', () => {
    const ex = exercise({ rest_by_type: { working: 150 } });
    expect(
      resolveRestSeconds(ex, { set_type: 'working', rest_seconds: 45 }),
    ).toBe(45);
  });

  it('honours a zero override', () => {
    const ex = exercise({ rest_by_type: { working: 150 } });
    expect(
      resolveRestSeconds(ex, { set_type: 'working', rest_seconds: 0 }),
    ).toBe(0);
  });

  it('ignores a null override', () => {
    const ex = exercise({ rest_by_type: { working: 150 } });
    expect(
      resolveRestSeconds(ex, { set_type: 'working', rest_seconds: null }),
    ).toBe(150);
  });

  it('survives a missing exercise or set', () => {
    expect(resolveRestSeconds(null, null)).toBe(DEFAULT_REST_SECONDS.working);
    expect(resolveRestSeconds(undefined, undefined)).toBe(
      DEFAULT_REST_SECONDS.working,
    );
  });

  it('clamps a stored value that is out of range', () => {
    const ex = exercise({ rest_by_type: { working: -5 } });
    expect(resolveRestSeconds(ex, { set_type: 'working' })).toBe(0);
  });
});

describe('exerciseRestSeconds', () => {
  it('reports the exercise level rest, ignoring set overrides', () => {
    const ex = exercise({ rest_by_type: { W: 20 } });
    expect(exerciseRestSeconds(ex, 'W')).toBe(20);
    expect(exerciseRestSeconds(ex, 'working')).toBe(
      DEFAULT_REST_SECONDS.working,
    );
  });

  it('handles a missing exercise', () => {
    expect(exerciseRestSeconds(null, 'D')).toBe(10);
  });
});

describe('hasRestOverride', () => {
  it('is true only for a stored number', () => {
    expect(hasRestOverride({ rest_seconds: 60 })).toBe(true);
    expect(hasRestOverride({ rest_seconds: 0 })).toBe(true);
    expect(hasRestOverride({ rest_seconds: null })).toBe(false);
    expect(hasRestOverride({})).toBe(false);
    expect(hasRestOverride(null)).toBe(false);
  });
});

describe('formatRest', () => {
  it('renders minutes and seconds', () => {
    expect(formatRest(90)).toBe('1:30');
    expect(formatRest(10)).toBe('0:10');
    expect(formatRest(60)).toBe('1:00');
    expect(formatRest(3600)).toBe('60:00');
  });

  it('never renders a negative time', () => {
    expect(formatRest(-5)).toBe('0:00');
  });
});

describe('supersetGroupIndexes', () => {
  const linked = (): RestExercise[] => [
    { id: 'a', superset_id: null, sets: [] },
    { id: 'b', superset_id: 'ss-1', sets: [] },
    { id: 'c', superset_id: 'ss-1', sets: [] },
    { id: 'd', superset_id: null, sets: [] },
  ];

  it('returns just the exercise when it is not in a superset', () => {
    expect(supersetGroupIndexes(linked(), 0)).toEqual([0]);
  });

  it('finds every member from any position in the group', () => {
    expect(supersetGroupIndexes(linked(), 1)).toEqual([1, 2]);
    expect(supersetGroupIndexes(linked(), 2)).toEqual([1, 2]);
  });

  it('does not merge two separate runs that reuse an id', () => {
    /* Reordering can leave a stale id further down the list */
    const exercises: RestExercise[] = [
      { id: 'a', superset_id: 'ss-1', sets: [] },
      { id: 'b', superset_id: null, sets: [] },
      { id: 'c', superset_id: 'ss-1', sets: [] },
    ];
    expect(supersetGroupIndexes(exercises, 0)).toEqual([0]);
    expect(supersetGroupIndexes(exercises, 2)).toEqual([2]);
  });

  it('returns nothing for an index that is not there', () => {
    expect(supersetGroupIndexes(linked(), 99)).toEqual([]);
  });
});

describe('planRestAfterSet', () => {
  it('starts rest when a set is checked', () => {
    const exercises = [
      exercise({ sets: [{ set: 1, set_type: 'working', completed: true }] }),
    ];
    expect(planRestAfterSet(exercises, 'ex-1', 0)).toEqual({
      seconds: DEFAULT_REST_SECONDS.working,
      label: 'Bench Press · Set 1',
    });
  });

  it('does not start rest when a set is unchecked', () => {
    const exercises = [
      exercise({ sets: [{ set: 1, set_type: 'working', completed: false }] }),
    ];
    expect(planRestAfterSet(exercises, 'ex-1', 0)).toBeNull();
  });

  it('uses the set type default, so a warm-up rests less', () => {
    const exercises = [
      exercise({ sets: [{ set: 1, set_type: 'W', completed: true }] }),
    ];
    expect(planRestAfterSet(exercises, 'ex-1', 0)?.seconds).toBe(
      DEFAULT_REST_SECONDS.W,
    );
  });

  it('returns null when rest is set to zero', () => {
    const exercises = [
      exercise({
        sets: [
          { set: 1, set_type: 'working', completed: true, rest_seconds: 0 },
        ],
      }),
    ];
    expect(planRestAfterSet(exercises, 'ex-1', 0)).toBeNull();
  });

  it('returns null for an unknown exercise or set index', () => {
    const exercises = [exercise()];
    expect(planRestAfterSet(exercises, 'nope', 0)).toBeNull();
    expect(planRestAfterSet(exercises, 'ex-1', 9)).toBeNull();
  });

  describe('supersets', () => {
    const pair = (aDone: boolean, bDone: boolean): RestExercise[] => [
      {
        id: 'a',
        name: 'Curl',
        superset_id: 'ss-1',
        sets: [{ set: 1, set_type: 'working', completed: aDone }],
      },
      {
        id: 'b',
        name: 'Pushdown',
        superset_id: 'ss-1',
        sets: [{ set: 1, set_type: 'working', completed: bDone }],
      },
    ];

    it('waits for the round instead of resting between exercises', () => {
      expect(planRestAfterSet(pair(true, false), 'a', 0)).toBeNull();
    });

    it('starts once the last exercise in the round is checked', () => {
      const plan = planRestAfterSet(pair(true, true), 'b', 0);
      expect(plan).toEqual({
        seconds: DEFAULT_REST_SECONDS.working,
        label: 'Superset · Set 1',
      });
    });

    it('takes the longest rest in the group', () => {
      const exercises = pair(true, true);
      exercises[0].rest_by_type = { working: 45 };
      exercises[1].rest_by_type = { working: 120 };
      expect(planRestAfterSet(exercises, 'b', 0)?.seconds).toBe(120);
    });

    it('is not held up by an exercise with fewer sets', () => {
      /* An unequal superset would otherwise never release the timer */
      const exercises: RestExercise[] = [
        {
          id: 'a',
          superset_id: 'ss-1',
          sets: [
            { set: 1, completed: true },
            { set: 2, completed: true },
          ],
        },
        { id: 'b', superset_id: 'ss-1', sets: [{ set: 1, completed: true }] },
      ];
      expect(planRestAfterSet(exercises, 'a', 1)).not.toBeNull();
    });
  });
});

describe('withExerciseRest', () => {
  it('stores a rest for one set type', () => {
    const next = withExerciseRest([exercise()], 'ex-1', 'W', 20);
    expect(next[0].rest_by_type).toEqual({ W: 20 });
  });

  it('leaves other set types alone', () => {
    const start = withExerciseRest([exercise()], 'ex-1', 'W', 20);
    const next = withExerciseRest(start, 'ex-1', 'working', 120);
    expect(next[0].rest_by_type).toEqual({ W: 20, working: 120 });
  });

  it('drops the key on null so the default applies again', () => {
    const start = withExerciseRest([exercise()], 'ex-1', 'W', 20);
    const next = withExerciseRest(start, 'ex-1', 'W', null);
    expect(next[0].rest_by_type).toBeNull();
  });

  it('leaves other exercises untouched', () => {
    const exercises = [exercise(), exercise({ id: 'ex-2' })];
    const next = withExerciseRest(exercises, 'ex-1', 'W', 20);
    expect(next[1]).toBe(exercises[1]);
  });
});

describe('withSetRest', () => {
  it('stores an override on one set only', () => {
    const next = withSetRest([exercise()], 'ex-1', 1, 45);
    expect(next[0].sets?.[0].rest_seconds).toBeUndefined();
    expect(next[0].sets?.[1].rest_seconds).toBe(45);
  });

  it('clears the override on null', () => {
    const start = withSetRest([exercise()], 'ex-1', 0, 45);
    const next = withSetRest(start, 'ex-1', 0, null);
    expect(next[0].sets?.[0].rest_seconds).toBeNull();
  });

  it('ignores a set index that is not there', () => {
    const exercises = [exercise()];
    expect(withSetRest(exercises, 'ex-1', 9, 45)[0]).toBe(exercises[0]);
  });

  it('leaves other exercises untouched', () => {
    const exercises = [exercise(), exercise({ id: 'ex-2' })];
    expect(withSetRest(exercises, 'ex-1', 0, 45)[1]).toBe(exercises[1]);
  });
});
