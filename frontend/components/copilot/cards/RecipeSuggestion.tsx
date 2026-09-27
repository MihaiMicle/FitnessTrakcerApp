'use client';

import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { recipePerServing, recipeServings } from '@/lib/copilot/recipes';
import type { CopilotRecipe } from '@/lib/copilot/types';
import CardShell from './CardShell';

export default function RecipeSuggestion({
  recipe,
  onSave,
}: {
  recipe: CopilotRecipe;
  onSave: (recipe: CopilotRecipe) => Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const servings = recipeServings(recipe);
  const perServing = recipePerServing(recipe);
  const steps = recipe.steps ?? [];

  const handleSave = async () => {
    setBusy(true);
    await onSave(recipe);
    setBusy(false);
    setSaved(true);
  };

  return (
    <CardShell
      label="Recipe"
      title={recipe.name}
      meta={`${servings} ${servings === 1 ? 'serving' : 'servings'} · ${perServing.calories} kcal each`}
    >
      {recipe.reason && (
        <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
          {recipe.reason}
        </p>
      )}

      <ul className="text-xs text-neutral-300 mb-3 space-y-1.5 font-mono">
        {recipe.ingredients.map((food, index) => (
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
        Per serving: {Math.round(perServing.protein_g)}p ·{' '}
        {Math.round(perServing.carbs_g)}c · {Math.round(perServing.fats_g)}f
      </p>

      {steps.length > 0 && (
        <ol className="list-decimal pl-5 text-xs text-neutral-400 mb-4 space-y-1 leading-relaxed">
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}

      <button
        onClick={handleSave}
        disabled={busy || saved}
        className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {saved ? (
          'Saved to your recipes'
        ) : (
          <>
            <BookmarkPlus size={14} /> {busy ? 'Saving...' : 'Save recipe'}
          </>
        )}
      </button>
    </CardShell>
  );
}
