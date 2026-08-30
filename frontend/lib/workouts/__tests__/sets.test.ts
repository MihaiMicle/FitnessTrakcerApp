import { describe, it, expect } from 'vitest';
import {
  addSetTo,
  asRoutineExercises,
  findNextSet,
  isInSuperset,
  removeExerciseFrom,
  removeSetFrom,
  reorderExercises,
  toggleSetCompleted,
  toggleSupersetAt,
  updateSetField,
  updateSetTypeIn,
  type WorkoutExercise,
} from '../sets';

/*
 * The superset rules are the interesting ones. A superset is stored as a shared
 * id on adjacent exercises, so unlinking one has to consider whether the other
 * is left alone in its group, and reordering has to break the link rather than
 * leave a group split across the list
 */

function exercise(
  id: string,
  overrides: Partial<WorkoutExercise> = {},
): WorkoutExercise {
  return {
    id,
    name: id,
    tracking_fields: ['weight', 'reps'],
    sets: [{ set: 1, set_type: 'working', completed: false }],
    ...overrides,
  };
}

describe('addSetTo', () => {
  it('carries the previous set numbers forward', () => {
    const start = [
      exercise('a', {
        sets: [
          {
            set: 1,
            set_type: 'working',
            completed: true,
            weight_kg: 100,
            reps: 5,
          },
        ],
      }),
    ];
    const [ex] = addSetTo(start, 'a');
    expect(ex.sets).toHaveLength(2);
    expect(ex.sets[1]).toMatchObject({ weight_kg: 100, reps: 5, set: 2 });
  });

  it('never carries the completed flag forward', () => {
    const start = [
      exercise('a', {
        sets: [{ set: 1, set_type: 'working', completed: true }],
      }),
    ];
    expect(addSetTo(start, 'a')[0].sets[1].completed).toBe(false);
  });

  it('only creates fields the exercise actually tracks', () => {
    const start = [exercise('a', { tracking_fields: ['time'] })];
    const newSet = addSetTo(start, 'a')[0].sets[1];
    expect(newSet).toHaveProperty('duration_minutes');
    expect(newSet).not.toHaveProperty('weight_kg');
  });

  it('ignores a tracking field with no matching set property', () => {
    const start = [exercise('a', { tracking_fields: ['bogus'] })];
    expect(Object.keys(addSetTo(start, 'a')[0].sets[1]).sort()).toEqual([
      'completed',
      'set',
      'set_type',
    ]);
  });

  it('copes with an exercise that declares no tracking fields', () => {
    const start = [exercise('a', { tracking_fields: undefined })];
    expect(addSetTo(start, 'a')[0].sets).toHaveLength(2);
  });

  it('leaves other exercises alone', () => {
    const start = [exercise('a'), exercise('b')];
    expect(addSetTo(start, 'a')[1]).toBe(start[1]);
  });
});

describe('updateSetField and updateSetTypeIn', () => {
  it('writes one field without touching the others', () => {
    const start = [exercise('a')];
    const [ex] = updateSetField(start, 'a', 0, 'weight_kg', '80');
    expect(ex.sets[0].weight_kg).toBe('80');
    expect(ex.sets[0].set_type).toBe('working');
  });

  it('sets the set type', () => {
    const [ex] = updateSetTypeIn([exercise('a')], 'a', 0, 'W');
    expect(ex.sets[0].set_type).toBe('W');
  });
});

describe('toggleSetCompleted', () => {
  it('flips both ways', () => {
    const once = toggleSetCompleted([exercise('a')], 'a', 0);
    expect(once[0].sets[0].completed).toBe(true);
    expect(toggleSetCompleted(once, 'a', 0)[0].sets[0].completed).toBe(false);
  });
});

describe('removeSetFrom', () => {
  it('renumbers the sets left behind', () => {
    const start = [
      exercise('a', {
        sets: [
          { set: 1, set_type: 'working', completed: false },
          { set: 2, set_type: 'W', completed: false },
          { set: 3, set_type: 'working', completed: false },
        ],
      }),
    ];
    const [ex] = removeSetFrom(start, 'a', 0);
    expect(ex.sets.map((s) => s.set)).toEqual([1, 2]);
    expect(ex.sets[0].set_type).toBe('W');
  });
});

describe('removeExerciseFrom', () => {
  it('drops only the named exercise', () => {
    const result = removeExerciseFrom([exercise('a'), exercise('b')], 'a');
    expect(result.map((e) => e.id)).toEqual(['b']);
  });
});

describe('toggleSupersetAt', () => {
  it('links an exercise to the one above it', () => {
    const result = toggleSupersetAt([exercise('a'), exercise('b')], 1);
    expect(result[0].superset_id).toBeTruthy();
    expect(result[1].superset_id).toBe(result[0].superset_id);
  });

  it('clears both sides when unlinking leaves a group of one', () => {
    const linked = toggleSupersetAt([exercise('a'), exercise('b')], 1);
    const unlinked = toggleSupersetAt(linked, 1);
    expect(unlinked[0].superset_id).toBeNull();
    expect(unlinked[1].superset_id).toBeNull();
  });

  it('keeps the group when a third member is still in it', () => {
    let list = [exercise('a'), exercise('b'), exercise('c')];
    list = toggleSupersetAt(list, 1);
    list = toggleSupersetAt(list, 2);
    const groupId = list[0].superset_id;

    const unlinked = toggleSupersetAt(list, 2);
    expect(unlinked[0].superset_id).toBe(groupId);
    expect(unlinked[1].superset_id).toBe(groupId);
    expect(unlinked[2].superset_id).toBeNull();
  });

  it('starts a new group id when neither side is already grouped', () => {
    const list = toggleSupersetAt([exercise('a'), exercise('b')], 1);
    expect(list[0].superset_id).toMatch(/^ss-/);
  });

  it('joins the group above rather than minting a second id', () => {
    let list = [exercise('a'), exercise('b'), exercise('c')];
    list = toggleSupersetAt(list, 1);
    const groupId = list[0].superset_id;
    list = toggleSupersetAt(list, 2);
    expect(list[2].superset_id).toBe(groupId);
  });

  it('does nothing for the first exercise or an index off the end', () => {
    const list = [exercise('a'), exercise('b')];
    expect(toggleSupersetAt(list, 0)).toBe(list);
    expect(toggleSupersetAt(list, 5)).toBe(list);
  });
});

describe('isInSuperset', () => {
  it('is true for both members of a pair', () => {
    const list = toggleSupersetAt([exercise('a'), exercise('b')], 1);
    expect(isInSuperset(list, 0)).toBe(true);
    expect(isInSuperset(list, 1)).toBe(true);
  });

  it('is false for an id no neighbour shares', () => {
    const orphan = [exercise('a', { superset_id: 'ss-1' }), exercise('b')];
    expect(isInSuperset(orphan, 0)).toBe(false);
  });

  it('is false for an exercise with no group', () => {
    expect(isInSuperset([exercise('a')], 0)).toBe(false);
  });
});

describe('findNextSet', () => {
  it('finds the first set nobody has ticked', () => {
    const list = [
      exercise('a', {
        sets: [{ set: 1, set_type: 'working', completed: true }],
      }),
      exercise('b'),
    ];
    expect(findNextSet(list)?.exercise.id).toBe('b');
  });

  it('is null once everything is done', () => {
    const list = [
      exercise('a', {
        sets: [{ set: 1, set_type: 'working', completed: true }],
      }),
    ];
    expect(findNextSet(list)).toBeNull();
  });
});

describe('reorderExercises', () => {
  it('moves the exercise to the target index', () => {
    const list = [exercise('a'), exercise('b'), exercise('c')];
    expect(reorderExercises(list, 0, 2).map((e) => e.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('breaks the superset link on the exercise it moves', () => {
    const list = toggleSupersetAt(
      [exercise('a'), exercise('b'), exercise('c')],
      1,
    );
    expect(reorderExercises(list, 1, 2)[2].superset_id).toBeNull();
  });

  it('is a no op when nothing moves', () => {
    const list = [exercise('a')];
    expect(reorderExercises(list, 0, 0)).toBe(list);
  });
});

describe('asRoutineExercises', () => {
  it('resets every set so the routine starts clean', () => {
    const list = [
      exercise('a', {
        sets: [
          {
            set: 1,
            set_type: 'working',
            completed: true,
            weight_kg: 100,
          } as WorkoutExercise['sets'][number],
        ],
      }),
    ];
    const routine = asRoutineExercises(list);
    expect(routine[0].sets[0].completed).toBe(false);
    expect(routine[0].sets[0].weight_kg).toBe(100);
  });

  it('does not mutate the session it copies', () => {
    const list = [
      exercise('a', {
        sets: [{ set: 1, set_type: 'working', completed: true }],
      }),
    ];
    asRoutineExercises(list);
    expect(list[0].sets[0].completed).toBe(true);
  });
});
