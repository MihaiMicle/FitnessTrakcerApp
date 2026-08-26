'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { scaleMacros, sumMacros } from '@/lib/nutrition/macros';
import { supabase } from '@/lib/supabase';

export type BuilderMode = 'meal' | 'recipe';

/**
 * State for the saved-meal / recipe builders. Both collect a name and a list of
 * foods; recipes additionally divide their totals across a serving count.
 */
export function useBundleBuilder(onSaved: () => void) {
  const [mode, setMode] = useState<BuilderMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [foods, setFoods] = useState<any[]>([]);
  /** Index of the staged food currently open in the manual form, if any. */
  const [editingFoodIndex, setEditingFoodIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [servings, setServings] = useState<number | string>('');
  const [isSaving, setIsSaving] = useState(false);

  const reset = useCallback(() => {
    setMode(null);
    setEditingId(null);
    setFoods([]);
    setEditingFoodIndex(null);
    setName('');
    setServings('');
  }, []);

  /** Opens an empty builder, optionally pre-named from the search box. */
  const startNew = useCallback((builderMode: BuilderMode, initialName = '') => {
    setMode(builderMode);
    setEditingId(null);
    setName(initialName);
    setFoods([]);
    setEditingFoodIndex(null);
    setServings('');
  }, []);

  /** Opens the builder on an existing saved meal or recipe. */
  const startEditing = useCallback((builderMode: BuilderMode, item: any) => {
    setMode(builderMode);
    setEditingId(item.id);
    setName(item.name);
    setEditingFoodIndex(null);
    if (builderMode === 'meal') {
      setFoods(item.foods || []);
    } else {
      setFoods(item.ingredients || []);
      setServings(item.servings);
    }
  }, []);

  const cancel = useCallback(() => {
    setMode(null);
    setFoods([]);
    setEditingId(null);
    setEditingFoodIndex(null);
  }, []);

  const addFood = useCallback((food: any) => {
    setFoods((prev) => [...prev, food]);
    setEditingFoodIndex(null);
  }, []);

  /** Sends a staged food back to the manual form for tweaking. */
  const startEditingFood = useCallback((index: number) => {
    setEditingFoodIndex(index);
  }, []);

  const cancelFoodEdit = useCallback(() => setEditingFoodIndex(null), []);

  /** Replaces a staged food in place rather than appending a duplicate. */
  const updateFood = useCallback((index: number, food: any) => {
    setFoods((prev) => prev.map((f, i) => (i === index ? food : f)));
    setEditingFoodIndex(null);
  }, []);

  const removeFood = useCallback((index: number) => {
    setFoods((prev) => prev.filter((_, i) => i !== index));
    // Everything after the removed row shifts down one slot.
    setEditingFoodIndex((current) => {
      if (current === null || current === index) return null;
      return current > index ? current - 1 : current;
    });
  }, []);

  const save = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Please enter a name.');
      return;
    }
    if (foods.length === 0) {
      toast.error('Add some foods first!');
      return;
    }
    if (mode === 'recipe' && (!servings || Number(servings) <= 0)) {
      toast.error('Please enter total servings.');
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      if (mode === 'meal') {
        if (editingId) {
          const { error } = await supabase
            .from('saved_meals')
            .update({ name, foods })
            .eq('id', editingId);
          if (error) throw error;
          toast.success('Meal updated!');
        } else {
          const { error } = await supabase
            .from('saved_meals')
            .insert({ user_id: session.user.id, name, foods });
          if (error) throw error;
          toast.success('Meal saved!');
        }
      } else if (mode === 'recipe') {
        const servingCount = Number(servings);
        const macros_per_serving = scaleMacros(
          sumMacros(foods),
          1 / servingCount,
        );
        const record = {
          name,
          servings: servingCount,
          ingredients: foods,
          macros_per_serving,
        };

        if (editingId) {
          const { error } = await supabase
            .from('recipes')
            .update(record)
            .eq('id', editingId);
          if (error) throw error;
          toast.success('Recipe updated!');
        } else {
          const { error } = await supabase
            .from('recipes')
            .insert({ user_id: session.user.id, ...record });
          if (error) throw error;
          toast.success('Recipe saved!');
        }
      }

      reset();
      onSaved();
    } catch {
      toast.error('Failed to save ' + mode);
    } finally {
      setIsSaving(false);
    }
  }, [mode, editingId, foods, name, servings, reset, onSaved]);

  return {
    mode,
    editingId,
    foods,
    editingFoodIndex,
    name,
    setName,
    servings,
    setServings,
    isSaving,
    reset,
    startNew,
    startEditing,
    cancel,
    addFood,
    startEditingFood,
    cancelFoodEdit,
    updateFood,
    removeFood,
    save,
  };
}

export type BundleBuilderState = ReturnType<typeof useBundleBuilder>;
