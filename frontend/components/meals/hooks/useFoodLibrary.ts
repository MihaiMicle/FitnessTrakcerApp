'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCustomFoods, getRecentFoods } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { CustomFood } from '@/types/nutrition';

const nameOf = (item: any) => item?.name || item?.food_name || '';

/** Keeps one row per food name, preferring the user's own copy over the global one. */
function dedupeByName(foods: CustomFood[]): CustomFood[] {
  const unique = new Map<string, CustomFood>();
  foods.forEach((item) => {
    const key = nameOf(item).toLowerCase().trim();
    if (!unique.has(key) || item.user_id !== null) unique.set(key, item);
  });
  return Array.from(unique.values());
}

/**
 * Loads everything the log-meal dialog can pick from, and refetches whenever
 * the dialog is reopened.
 */
export function useFoodLibrary(isOpen: boolean) {
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);

  const refreshBundles = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    supabase
      .from('saved_meals')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => data && setSavedMeals(data));

    supabase
      .from('recipes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => data && setRecipes(data));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;

      getRecentFoods(session.access_token)
        .then(setRecentFoods)
        .catch(console.error);

      refreshBundles();

      getCustomFoods(session.access_token)
        .then((data: CustomFood[]) => setCustomFoods(dedupeByName(data)))
        .catch(console.error);
    });
  }, [isOpen, refreshBundles]);

  const removeCustomFood = useCallback((foodId: string) => {
    setCustomFoods((prev) => prev.filter((food) => food.id !== foodId));
  }, []);

  const removeBundle = useCallback(
    (id: string, table: 'saved_meals' | 'recipes') => {
      const setter = table === 'saved_meals' ? setSavedMeals : setRecipes;
      setter((prev: any[]) => prev.filter((item) => item.id !== id));
    },
    [],
  );

  return {
    recentFoods,
    customFoods,
    savedMeals,
    recipes,
    refreshBundles,
    removeCustomFood,
    removeBundle,
  };
}

export type FoodLibrary = ReturnType<typeof useFoodLibrary>;

/** Applies the search box to every list, and flags exact name matches. */
export function useFilteredLibrary(library: FoodLibrary, searchQuery: string) {
  const { recentFoods, customFoods, savedMeals, recipes } = library;

  return useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const matches = (item: any) =>
      nameOf(item).toLowerCase().includes(query) ||
      (item?.brand || '').toLowerCase().includes(query);

    const matchesName = (item: any) =>
      (item?.name || '').toLowerCase().includes(query);

    const isExact = (items: any[]) =>
      items.some((item) => nameOf(item).toLowerCase() === query);

    const recent = recentFoods.filter(matches);
    const global = customFoods.filter((f) => f.user_id === null && matches(f));
    const custom = customFoods.filter((f) => f.user_id !== null && matches(f));
    const meals = savedMeals.filter(matchesName);
    const recipeList = recipes.filter(matchesName);

    return {
      recent,
      global,
      custom,
      meals,
      recipes: recipeList,
      hasExactGlobal: isExact(global),
      hasExactCustom: isExact(custom),
      hasExactMeal: isExact(meals),
      hasExactRecipe: isExact(recipeList),
    };
  }, [recentFoods, customFoods, savedMeals, recipes, searchQuery]);
}
