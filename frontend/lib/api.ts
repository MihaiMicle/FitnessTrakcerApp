import { supabase } from "./supabase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface MealEntry {
  id: number;
  daily_log_id: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "post_workout";
  food_name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  created_at: string;
}

export interface DailySummary {
  id: number;
  user_id: number;
  log_date: string;
  meals: MealEntry[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
}

export interface LogMealPayload {
  meal_type: string;
  food_name: string;
  serving_size: number;
  serving_unit: "g" | "oz" | "lb" | "ml" | "fl_oz";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

// Helper to get authorization headers
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

// Fetch daily summary and aggregated macros
export async function getDailyLog(date: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logs/${date}`, { headers });
 if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("FastAPI Rejection Reason:", errorData);
    throw new Error(`Failed to fetch logs: ${errorData.detail || res.statusText}`);
  }
  return res.json();
}

// Post a new meal entry (automatically converts imperial units on the backend)
export async function logMeal(payload: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meals`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw { detail: errorData.detail || "Error logging meal" };
  }
  return res.json();
}

// Delete a logged meal entry by its ID
export async function deleteMeal(mealId: number) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meals/${mealId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete meal");
  return res.json();
}
