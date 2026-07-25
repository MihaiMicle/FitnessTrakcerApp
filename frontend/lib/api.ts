import { supabase } from "./supabase";
import { DailySummary, MealEntry, LogMealPayload } from "@/types/nutrition";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Helper to get authorization headers
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

// Fetch daily summary and aggregated macros
export async function getDailyLog(date: string): Promise<DailySummary> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/logs/${date}`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("FastAPI Rejection Reason:", errorData);
    throw new Error(`Failed to fetch logs: ${errorData.detail || res.statusText}`);
  }
  return res.json();
}

// Post a new meal entry (automatically converts imperial units on the backend)
export async function logMeal(payload: LogMealPayload): Promise<MealEntry> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/meals`, {
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

// Delete a logged meal entry by its ID (Updated parameter to string for UUIDs)
export async function deleteMeal(mealId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/meals/${mealId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete meal");
  return res.json();
}