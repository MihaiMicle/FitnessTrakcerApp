'use client';

import type { FeedEventItem } from '@/types/feed';
import FeedExercisesList from './FeedExercisesList';
import FeedFoodsList from './FeedFoodsList';
import FeedMealsGrouped from './FeedMealsGrouped';

interface FeedCardDetailsProps {
  event: FeedEventItem;
}

/* Whether any of the three detail panels actually have something to show */
export function hasDetails(event: FeedEventItem): boolean {
  return (
    (event.payload.foods?.length ?? 0) > 0 ||
    (event.payload.meals?.length ?? 0) > 0 ||
    (event.payload.exercises?.length ?? 0) > 0
  );
}

export default function FeedCardDetails({ event }: FeedCardDetailsProps) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-1">
      <FeedFoodsList foods={event.payload.foods ?? []} />
      <FeedMealsGrouped meals={event.payload.meals ?? []} />
      <FeedExercisesList
        exercises={event.payload.exercises ?? []}
        eventType={event.event_type}
      />
    </div>
  );
}
