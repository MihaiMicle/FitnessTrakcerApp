'use client';

interface FeedFoodsListProps {
  foods: any[];
}

/* Foods for Meals/Recipes */
export default function FeedFoodsList({ foods }: FeedFoodsListProps) {
  if (!Array.isArray(foods) || foods.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5 bg-neutral-950 p-3 rounded-lg border border-neutral-800/50">
      {foods.map((f: any, idx: number) => (
        <div
          key={idx}
          className="flex justify-between items-start text-xs font-mono gap-4"
        >
          <span className="text-neutral-300 flex-1 leading-snug">
            • {f.food_name || f.name}
          </span>
          <span className="text-neutral-500 shrink-0 mt-0.5">
            {f.serving_size}
            {f.serving_unit || 'g'}
          </span>
        </div>
      ))}
    </div>
  );
}
