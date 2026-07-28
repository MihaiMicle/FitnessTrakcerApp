"use client";

import { MealEntry } from "@/types/nutrition";

interface MealItemProps {
  meal: MealEntry;
  onDelete: (id: string) => void;
}

export default function MealItem({ meal, onDelete }: MealItemProps) {
  // Temporary debug log: open browser console (F12) to see the exact properties FastAPI is returning!
  console.log("Logged meal object:", meal);

  // Exhaustive check for any property name your backend might be using for the weight/serving
  const servingSize =
    meal.serving_size ||
    (meal as any).servingSize ||
    meal.quantity_g ||
    (meal as any).quantity ||
    (meal as any).grams ||
    (meal as any).amount ||
    (meal as any).weight ||
    0;

  const servingUnit =
    meal.serving_unit || (meal as any).servingUnit || (meal as any).unit || "g";

  return (
    <div className="py-4 flex justify-between items-center group">
      <div>
        <h4 className="font-medium text-neutral-200">
          {meal.food_name || meal.name || (meal as any).foodName}
        </h4>
        <p className="text-xs text-neutral-400 font-mono mt-0.5">
          {servingSize} {servingUnit} serving
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right font-mono text-sm">
          <div className="text-neutral-200">{meal.calories} kcal</div>
          <div className="text-xs text-neutral-400">
            P: {meal.protein_g}g | C: {meal.carbs_g}g | F: {meal.fats_g}g
          </div>
        </div>

        <button
          onClick={() => onDelete(meal.id)}
          className="text-neutral-500 hover:text-rose-500 p-2 transition-colors text-lg font-bold"
          title="Delete meal"
        >
          ×
        </button>
      </div>
    </div>
  );
}
