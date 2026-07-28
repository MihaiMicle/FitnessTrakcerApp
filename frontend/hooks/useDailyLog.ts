"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  getDailyLog,
  logMeal as apiLogMeal,
  deleteMeal as apiDeleteMeal,
} from "@/lib/api";
import { DailySummary, LogMealPayload, MealEntry } from "@/types/nutrition";

export function useDailyLog(date: string) {
  const [dailyLog, setDailyLog] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    if (!date) return;

    // Check if we actually have a logged-in user before calling FastAPI!
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return; // Silently abort so Uvicorn never throws a 401 Unauthorized
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getDailyLog(date);
      setDailyLog(data);
    } catch (err: any) {
      console.error("Error fetching daily log:", err);
      setError(err.message || "Failed to load daily log.");
      setDailyLog(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const addMeal = async (payload: LogMealPayload): Promise<MealEntry> => {
    try {
      const mealPayload = { ...payload, date: payload.date || date };
      const newMeal = await apiLogMeal(mealPayload);
      await fetchLog();
      return newMeal;
    } catch (err: any) {
      console.error("Error adding meal:", err);
      throw err;
    }
  };

  const removeMeal = async (mealId: string): Promise<void> => {
    try {
      await apiDeleteMeal(mealId);
      await fetchLog();
    } catch (err: any) {
      console.error("Error deleting meal:", err);
      throw err;
    }
  };

  return {
    dailyLog,
    loading,
    error,
    refetch: fetchLog,
    addMeal,
    removeMeal,
    refreshLog: fetchLog, 
  };
}
