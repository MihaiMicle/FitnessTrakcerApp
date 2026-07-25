"use client";

import { DailySummary } from "@/types/nutrition";
import { DEFAULT_MACRO_TARGETS } from "@/lib/constants";

interface MacroGoalsProps {
  summary: DailySummary | null;
}

export default function MacroGoals({ summary }: MacroGoalsProps) {
  const calProgress = Math.min(((summary?.total_calories || 0) / DEFAULT_MACRO_TARGETS.calories) * 100, 100);
  const protProgress = Math.min(((summary?.total_protein_g || 0) / DEFAULT_MACRO_TARGETS.protein) * 100, 100);
  const carbsProgress = Math.min(((summary?.total_carbs_g || 0) / DEFAULT_MACRO_TARGETS.carbs) * 100, 100);
  const fatsProgress = Math.min(((summary?.total_fats_g || 0) / DEFAULT_MACRO_TARGETS.fats) * 100, 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Calories</span>
          <span className="font-mono font-bold">
            {summary?.total_calories || 0} / {DEFAULT_MACRO_TARGETS.calories} kcal
          </span>
        </div>
        <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${calProgress}%` }} />
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Protein</span>
          <span className="font-mono font-bold">
            {summary?.total_protein_g || 0} / {DEFAULT_MACRO_TARGETS.protein} g
          </span>
        </div>
        <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${protProgress}%` }} />
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Carbs</span>
          <span className="font-mono font-bold">
            {summary?.total_carbs_g || 0} / {DEFAULT_MACRO_TARGETS.carbs} g
          </span>
        </div>
        <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
          <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${carbsProgress}%` }} />
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Fats</span>
          <span className="font-mono font-bold">
            {summary?.total_fats_g || 0} / {DEFAULT_MACRO_TARGETS.fats} g
          </span>
        </div>
        <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
          <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${fatsProgress}%` }} />
        </div>
      </div>
    </div>
  );
}