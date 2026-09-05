/* lib/feed/copyToLibrary.ts */

import type { FeedEventItem } from '@/types/feed';

export type CopyDestination = 'routine' | 'recipe' | 'meal' | 'none';

/* Which table a copy of this event belongs in, or 'none' for a type nothing
   here recognises */
export function copyDestinationFor(eventType: FeedEventItem['event_type']): CopyDestination {
  if (eventType === 'workout' || eventType === 'routine_shared') return 'routine';
  if (eventType === 'recipe_shared') return 'recipe';
  if (eventType === 'meal_shared' || eventType === 'diary_shared') return 'meal';
  return 'none';
}

/* Routines start fresh: nothing about how far a friend got should carry over */
export function cleanExercisesForCopy(exercises: any[] = []) {
  return exercises.map((exercise) => ({
    ...exercise,
    sets: (exercise.sets || []).map((set: any) => ({ ...set, completed: false })),
  }));
}

export function routineTemplatePayload(event: FeedEventItem) {
  return {
    name: `${event.title} (Copied)`,
    exercises: cleanExercisesForCopy(event.payload.exercises),
    visibility: 'private',
  };
}

export function recipePayload(event: FeedEventItem, userId: string) {
  return {
    user_id: userId,
    name: `${event.title} (Copied)`,
    ingredients: event.payload.foods || [],
    servings: 1, // Fallback to 1 serving
    macros_per_serving: {
      calories: event.payload.calories || 0,
      protein_g: event.payload.protein_g || 0,
      carbs_g: event.payload.carbs_g || 0,
      fats_g: event.payload.fats_g || 0,
    },
  };
}

export function savedMealPayload(event: FeedEventItem, userId: string) {
  const foods =
    event.event_type === 'diary_shared' && event.payload.meals
      ? event.payload.meals
      : event.payload.foods || [];
  return {
    user_id: userId,
    name: `${event.title} (Copied)`,
    foods,
  };
}
