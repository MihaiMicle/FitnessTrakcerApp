/* lib/feed/__tests__/copyToLibrary.test.ts */

import { describe, expect, it } from 'vitest';
import {
  cleanExercisesForCopy,
  copyDestinationFor,
  recipePayload,
  routineTemplatePayload,
  savedMealPayload,
} from '@/lib/feed/copyToLibrary';
import type { FeedEventItem } from '@/types/feed';

function makeEvent(overrides: Partial<FeedEventItem> = {}): FeedEventItem {
  return {
    id: 'event-1',
    event_type: 'workout',
    visibility: 'public',
    author: {
      id: 'user-1',
      username: 'tudor',
      first_name: 'Tudor',
      last_name: null,
      avatar_url: null,
      relationship: 'self',
    } as any,
    subject_type: null,
    subject_id: null,
    title: 'Push Day',
    payload: {},
    like_count: 0,
    comment_count: 0,
    liked_by_me: false,
    occurred_at: null,
    ...overrides,
  };
}

describe('copyDestinationFor', () => {
  it('sends workouts and shared routines to the routine table', () => {
    expect(copyDestinationFor('workout')).toBe('routine');
    expect(copyDestinationFor('routine_shared')).toBe('routine');
  });

  it('sends shared recipes to the recipe table', () => {
    expect(copyDestinationFor('recipe_shared')).toBe('recipe');
  });

  it('sends shared meals and diaries to the meal table', () => {
    expect(copyDestinationFor('meal_shared')).toBe('meal');
    expect(copyDestinationFor('diary_shared')).toBe('meal');
  });

  it('has no destination for a personal record', () => {
    expect(copyDestinationFor('personal_record')).toBe('none');
  });
});

describe('cleanExercisesForCopy', () => {
  it('marks every set as not completed', () => {
    const cleaned = cleanExercisesForCopy([
      { name: 'Squat', sets: [{ set: 1, completed: true }, { set: 2, completed: true }] },
    ]);
    expect(cleaned[0].sets.every((s: any) => s.completed === false)).toBe(true);
  });

  it('keeps every other field on the exercise and set', () => {
    const cleaned = cleanExercisesForCopy([
      { name: 'Squat', notes: 'pause reps', sets: [{ set: 1, weight_kg: 100, completed: true }] },
    ]);
    expect(cleaned[0].notes).toBe('pause reps');
    expect(cleaned[0].sets[0].weight_kg).toBe(100);
  });

  it('defaults to an empty list', () => {
    expect(cleanExercisesForCopy()).toEqual([]);
  });
});

describe('routineTemplatePayload', () => {
  it('names the copy after the original with a suffix', () => {
    const event = makeEvent({ title: 'Push Day' });
    expect(routineTemplatePayload(event).name).toBe('Push Day (Copied)');
  });

  it('starts the copy private, regardless of the original visibility', () => {
    const event = makeEvent({ visibility: 'public' });
    expect(routineTemplatePayload(event).visibility).toBe('private');
  });

  it('cleans the exercises the same way cleanExercisesForCopy does', () => {
    const event = makeEvent({
      payload: { exercises: [{ name: 'Row', sets: [{ set: 1, completed: true }] }] },
    });
    expect(routineTemplatePayload(event).exercises[0].sets[0].completed).toBe(false);
  });
});

describe('recipePayload', () => {
  it('carries the foods over as ingredients', () => {
    const event = makeEvent({ payload: { foods: [{ name: 'Rice' }] } });
    expect(recipePayload(event, 'user-1').ingredients).toEqual([{ name: 'Rice' }]);
  });

  it('defaults every macro to zero when the payload has none', () => {
    const event = makeEvent({ payload: {} });
    expect(recipePayload(event, 'user-1').macros_per_serving).toEqual({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    });
  });

  it('always saves as a single serving', () => {
    const event = makeEvent();
    expect(recipePayload(event, 'user-1').servings).toBe(1);
  });
});

describe('savedMealPayload', () => {
  it('reads foods for a shared meal', () => {
    const event = makeEvent({
      event_type: 'meal_shared',
      payload: { foods: [{ name: 'Chicken' }] },
    });
    expect(savedMealPayload(event, 'user-1').foods).toEqual([{ name: 'Chicken' }]);
  });

  it('reads meals for a shared diary, not foods', () => {
    const event = makeEvent({
      event_type: 'diary_shared',
      payload: { meals: [{ name: 'Breakfast' }], foods: [{ name: 'ignored' }] },
    });
    expect(savedMealPayload(event, 'user-1').foods).toEqual([{ name: 'Breakfast' }]);
  });

  it('falls back to an empty list when neither is present', () => {
    const event = makeEvent({ event_type: 'meal_shared', payload: {} });
    expect(savedMealPayload(event, 'user-1').foods).toEqual([]);
  });
});
