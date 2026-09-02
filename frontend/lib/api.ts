import { UserProfileData } from "@/types/profile";
import { supabase } from "./supabase";
import { DailySummary, MealEntry, LogMealPayload } from "@/types/nutrition";
import { apiErrorMessage } from "./apiError";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/* Helper to get authorization headers */
async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

/* Throw with the server's own reason when a response is not ok */
async function throwIfNotOk(res: Response, action: string): Promise<void> {
  if (res.ok) return;

  const body = await res.json().catch(() => ({}) as Record<string, unknown>);
  const message = apiErrorMessage(action, res.status, res.statusText, body?.detail);

  console.error("FastAPI rejection:", res.status, body);
  throw new Error(message);
}

/* Fetch daily summary and aggregated macros */
export async function getDailyLog(date: string): Promise<DailySummary> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/logs/${date}`, { headers });
  await throwIfNotOk(res, "Failed to fetch logs");
  return res.json();
}

/* Post a new meal entry (imperial units are converted on the backend) */
export async function logMeal(payload: LogMealPayload): Promise<MealEntry> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/meals`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(res, "Failed to log meal");
  return res.json();
}

/* Delete a logged meal entry by its UUID */
export async function deleteMeal(mealId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/meals/${mealId}`, {
    method: "DELETE",
    headers,
  });
  await throwIfNotOk(res, "Failed to delete meal");
  return res.json();
}

export async function getProfile(): Promise<UserProfileData> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/profile/me`, { headers });
  await throwIfNotOk(res, "Failed to fetch profile");
  return res.json();
}

export async function updateProfile(
  token: string,
  profileData: UserProfileData,
) {
  const res = await fetch(`${BASE_URL}/profile/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
  await throwIfNotOk(res, "Failed to update profile");
  return res.json();
}

export async function recalculateGoals(token: string) {
  const res = await fetch(`${BASE_URL}/profile/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    /* Ask the backend to run Mifflin-St Jeor and commit the new targets */
    body: JSON.stringify({ auto_calculate: true }),
  });
  await throwIfNotOk(res, "Failed to recalculate goals");
  return res.json();
}

export async function getCustomFoods(token: string) {
  const res = await fetch(`${BASE_URL}/foods/custom`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await throwIfNotOk(res, "Failed to fetch custom foods");
  return res.json();
}

export async function getRecentFoods(token: string) {
  const res = await fetch(`${BASE_URL}/foods/recent`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await throwIfNotOk(res, "Failed to fetch recent foods");
  return res.json();
}

export async function createCustomFood(token: string, payload: any) {
  const res = await fetch(`${BASE_URL}/foods/custom`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(res, "Failed to save custom food");
  return res.json();
}

export async function deleteCustomFood(token: string, foodId: string) {
  const res = await fetch(`${BASE_URL}/foods/custom/${foodId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  await throwIfNotOk(res, "Failed to delete custom food");
  return true;
}

export async function updateCustomFood(
  token: string,
  foodId: string,
  payload: any,
) {
  const res = await fetch(`${BASE_URL}/foods/custom/${foodId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(res, "Failed to update custom food");
  return res.json();
}

/* Toggle daily diary completion status */
export async function toggleDayCompletion(
  date: string,
  isCompleted: boolean,
): Promise<DailySummary> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/logs/${date}/toggle-complete`, {
    method: "POST",
    headers,
    body: JSON.stringify({ is_completed: isCompleted }),
  });
  await throwIfNotOk(res, "Failed to update day completion");
  return res.json();
}
