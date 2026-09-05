'use client';

import { groupMealsByType } from '@/lib/feed/events';

interface FeedMealsGroupedProps {
  meals: any[];
}

/* Meals for Diaries, bucketed under a header per meal type */
export default function FeedMealsGrouped({ meals }: FeedMealsGroupedProps) {
  if (!Array.isArray(meals) || meals.length === 0) return null;

  const grouped = groupMealsByType(meals);

  return (
    <div className="mt-3 space-y-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800/50">
      {Object.entries(grouped).map(([type, foods]) => (
        <div key={type}>
          <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
            {type}
          </h4>
          <div className="space-y-2">
            {foods.map((m: any, idx: number) => (
              <div
                key={idx}
                className="flex justify-between items-start text-xs font-mono gap-4"
              >
                <span className="text-neutral-300 flex-1 leading-snug">
                  • {m.name || m.food_name}
                </span>
                <span className="text-neutral-500 shrink-0 mt-0.5">
                  {m.calories} kcal
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
