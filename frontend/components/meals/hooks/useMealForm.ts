'use client';

import { useCallback, useMemo, useState } from 'react';
import { SERVING_UNITS } from '@/lib/constants';
import { scaleMacros } from '@/lib/nutrition/macros';
import {
  MealFormData,
  buildMealForm,
  createEmptyMealForm,
} from '@/lib/nutrition/mealForm';
import {
  getGramsMultiplier,
  parseCustomServings,
  resolveCustomServings,
} from '@/lib/nutrition/servings';

/**
 * Owns the manual-entry form. `baseFood` is the food the current values were
 * derived from, so changing the serving size can rescale every nutrient.
 */
export function useMealForm(customFoods: any[]) {
  const [formData, setFormData] = useState<MealFormData>(createEmptyMealForm());
  const [baseFood, setBaseFood] = useState<any | null>(null);

  const gramsPerUnit = useCallback(
    (unit: string, food: any) => getGramsMultiplier(unit, food, customFoods),
    [customFoods],
  );

  /**
   * Recalculates every nutrient for a new serving size/unit. Leaves the
   * nutrients untouched when the unit has no known gram equivalent, or when
   * there is no base food to scale from.
   */
  const updateServing = useCallback(
    (size: string, unit: string, contextOverride: any = null) => {
      const setSizeOnly = () =>
        setFormData((prev) => ({
          ...prev,
          serving_size: size,
          serving_unit: unit,
        }));

      if (size === '') {
        setFormData((prev) => ({ ...prev, serving_size: '', serving_unit: unit }));
        return;
      }

      const context = contextOverride || baseFood;
      const multiplier = gramsPerUnit(unit, context);

      // Unrecognised unit: keep what the user typed, don't guess at macros.
      if (multiplier === null && unit.trim() !== '') {
        setSizeOnly();
        return;
      }

      if (!context || !(context.baseServing > 0)) {
        setSizeOnly();
        return;
      }

      const baseMultiplier = gramsPerUnit(context.defaultUnit, context) || 1;
      const requestedGrams = Number(size) * (multiplier as number);
      const baseGrams = context.baseServing * baseMultiplier;
      const ratio = requestedGrams / baseGrams;

      setFormData((prev) => ({
        ...prev,
        serving_size: size,
        serving_unit: unit,
        ...scaleMacros(context, ratio),
      }));
    },
    [baseFood, gramsPerUnit],
  );

  /** Loads a food picked from any of the browse tabs into the form. */
  const selectFood = useCallback(
    (food: any, isEditMode = false) => {
      const custom_servings = isEditMode
        ? parseCustomServings(food?.custom_servings)
        : resolveCustomServings(food, customFoods);

      const enriched = { ...food, custom_servings };
      const baseServing =
        enriched.serving_size || enriched.quantity_g || 100;
      const defaultUnit = enriched.serving_unit || 'g';

      setBaseFood({ ...enriched, baseServing, defaultUnit });
      setFormData((prev) =>
        buildMealForm(enriched, {
          mealType: prev.meal_type,
          foodName: enriched.name || enriched.food_name,
          servingSize: baseServing,
          servingUnit: defaultUnit,
        }),
      );
    },
    [customFoods],
  );

  /** Loads an existing diary entry for editing. */
  const loadDiaryEntry = useCallback((log: any, fallbackMealType?: string) => {
    setFormData(
      buildMealForm(log, {
        mealType: log.meal_type || fallbackMealType || 'lunch',
        foodName: log.food_name || log.name,
        servingSize: log.serving_size,
        servingUnit: log.serving_unit,
      }),
    );
    setBaseFood({
      ...log,
      baseServing: log.serving_size || log.quantity_g || 100,
      defaultUnit: log.serving_unit || 'g',
    });
  }, []);

  /** Seeds the form from the search box when no matching food exists yet. */
  const prefillNewFood = useCallback((name: string) => {
    setFormData((prev) => ({
      ...prev,
      food_name: name,
      calories: '',
      protein_g: '',
      carbs_g: '',
      fats_g: '',
      serving_size: 100,
      serving_unit: 'g',
    }));
  }, []);

  const setMealType = useCallback((mealType: string) => {
    setFormData((prev) => ({ ...prev, meal_type: mealType }));
  }, []);

  const clearBaseFood = useCallback(() => setBaseFood(null), []);

  /** Standard units plus any custom servings the base food defines. */
  const availableUnits = useMemo(
    () =>
      Array.from(
        new Set([
          ...SERVING_UNITS,
          ...resolveCustomServings(baseFood, customFoods).map(
            (s) => s.description,
          ),
        ]),
      ),
    [baseFood, customFoods],
  );

  return {
    formData,
    setFormData,
    baseFood,
    availableUnits,
    updateServing,
    selectFood,
    loadDiaryEntry,
    prefillNewFood,
    setMealType,
    clearBaseFood,
  };
}
