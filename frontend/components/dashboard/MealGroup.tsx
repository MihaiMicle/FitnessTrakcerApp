"use client";

import { MealEntry } from "@/types/nutrition";
import MealItem from "@/components/meals/MealItem";

interface MealGroupProps {
  label: string;
  meals: MealEntry[];
  onDeleteMeal: (id: string) => void;
}

export default function MealGroup({
  label,
  meals,
  onDeleteMeal,
}: MealGroupProps) {
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein_g || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0);
  const totalFats = meals.reduce((sum, m) => sum + (m.fats_g || 0), 0);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">{label}</h3>
          <span className="text-xs font-medium bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
            {meals.length} {meals.length === 1 ? "item" : "items"}
          </span>
        </div>

        {meals.length > 0 && (
          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 mt-2 sm:mt-0">
            <span>
              <strong className="text-white">{totalCalories}</strong> kcal
            </span>
            <span>•</span>
            {/* Changed from emerald to blue to match Protein goal */}
            <span>
              <strong className="text-blue-500">
                {totalProtein.toFixed(1)}g
              </strong>{" "}
              P
            </span>
            {/* Changed from blue to amber to match Carbs goal */}
            <span>
              <strong className="text-amber-500">
                {totalCarbs.toFixed(1)}g
              </strong>{" "}
              C
            </span>
            {/* Kept rose to match Fats goal */}
            <span>
              <strong className="text-rose-500">{totalFats.toFixed(1)}g</strong>{" "}
              F
            </span>
          </div>
        )}
      </div>

      {meals.length === 0 ? (
        <p className="text-sm text-neutral-600 italic py-2">
          No foods logged for {label.toLowerCase()} yet.
        </p>
      ) : (
        <div className="divide-y divide-neutral-800">
          {meals.map((meal) => (
            <MealItem key={meal.id} meal={meal} onDelete={onDeleteMeal} />
          ))}
        </div>
      )}
    </div>
  );
}
