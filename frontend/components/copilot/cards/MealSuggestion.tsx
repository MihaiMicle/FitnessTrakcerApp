'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { exceedsRemaining, mealTotals } from '@/lib/copilot/meals';
import type { CopilotMeal } from '@/lib/copilot/types';
import type { MealTotals } from '@/lib/copilot/meals';
import CardShell from './CardShell';

const MACRO_LABELS: Record<keyof MealTotals, string> = {
  calories: 'calories',
  protein_g: 'protein',
  carbs_g: 'carbs',
  fats_g: 'fat',
};

export default function MealSuggestion({
  meal,
  remaining,
  onLog,
}: {
  meal: CopilotMeal;
  remaining: MealTotals | null;
  onLog: (meal: CopilotMeal) => Promise<void>;
}) {
  const [logged, setLogged] = useState(false);
  const [busy, setBusy] = useState(false);

  const totals = mealTotals(meal);
  const over = exceedsRemaining(totals, remaining);

  const handleLog = async () => {
    setBusy(true);
    await onLog(meal);
    setBusy(false);
    setLogged(true);
  };

  return (
    <CardShell
      label={meal.meal_type}
      title={meal.title}
      meta={`${Math.round(totals.calories)} kcal`}
    >
      {meal.reason && (
        <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
          {meal.reason}
        </p>
      )}

      <ul className="text-xs text-neutral-300 mb-3 space-y-1.5 font-mono">
        {meal.foods.map((food, index) => (
          <li
            key={`${food.food_name}-${index}`}
            className="flex justify-between gap-3 border-b border-neutral-800/50 pb-1"
          >
            <span className="truncate">
              {food.serving_size}
              {food.serving_unit} {food.food_name}
            </span>
            <span className="text-neutral-500 shrink-0">
              {Math.round(food.calories)} kcal
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] font-mono text-neutral-500 mb-3">
        {Math.round(totals.protein_g)}p · {Math.round(totals.carbs_g)}c ·{' '}
        {Math.round(totals.fats_g)}f
      </p>

      {/* Named rather than generic, so the user knows which budget this breaks
          before they commit to it. A warning, not a block: they asked for it */}
      {over.length > 0 && !logged && (
        <p className="text-[11px] text-amber-500/90 mb-3 leading-relaxed">
          Puts you over on {over.map((key) => MACRO_LABELS[key]).join(' and ')}{' '}
          for today.
        </p>
      )}

      <button
        onClick={handleLog}
        disabled={busy || logged}
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {logged ? (
          'Logged to diary'
        ) : (
          <>
            <Plus size={14} /> {busy ? 'Logging...' : 'Log this meal'}
          </>
        )}
      </button>
    </CardShell>
  );
}
