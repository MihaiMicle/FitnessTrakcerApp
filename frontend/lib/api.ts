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

// Fetch daily summary and aggregated macros
export async function getDailyLog(userId: number, dateStr: string): Promise<DailySummary> {
  const res = await fetch(`${BASE_URL}/api/logs/${userId}/${dateStr}/`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch daily log");
  return res.json();
}

// Post a new meal entry (automatically converts imperial units on the backend)
export async function logMeal(userId: number, payload: LogMealPayload): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/logs/${userId}/meals/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // Parse FastAPI's error payload and throw it directly
    const errorJson = await res.json().catch(() => ({ detail: res.statusText }));
    throw errorJson;
  }
  return res.json();
}

// Delete a logged meal entry by its ID
export async function deleteMeal(mealId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/meals/${mealId}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete meal");
}