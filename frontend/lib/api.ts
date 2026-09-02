import { UserProfileData } from "@/types/profile";
import { supabase } from "./supabase";
import { DailySummary, MealEntry, LogMealPayload } from "@/types/nutrition";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Helper to get authorization headers
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

// Fetch daily summary and aggregated macros
export async function getDailyLog(date: string): Promise<DailySummary> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/logs/${date}`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("FastAPI Rejection Reason:", errorData);
    throw new Error(
      `Failed to fetch logs: ${errorData.detail || res.statusText}`,
    );
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

export async function getProfile(): Promise<UserProfileData> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/profile/me`, { headers });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updateProfile(
  token: string,
  profileData: UserProfileData,
) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  if (!res.ok) {
    const errorDetails = await res.json().catch(() => ({}));
    console.error("FastAPI Rejection Details:", errorDetails);
    throw new Error(
      `Failed to update profile: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}

export async function recalculateGoals(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    // Tell the backend to run your Mifflin-St Jeor formula and commit the new targets
    body: JSON.stringify({ auto_calculate: true }),
  });

  if (!res.ok) throw new Error("Failed to recalculate goals");
  return res.json();
}

export async function getCustomFoods(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/foods/custom`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch custom foods");
  return res.json();
}

export async function getRecentFoods(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/foods/recent`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch recent foods");
  return res.json();
}

export async function createCustomFood(token: string, payload: any) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/foods/custom`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save custom food");
  return res.json();
}

export async function deleteCustomFood(token: string, foodId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/foods/custom/${foodId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error("Failed to delete custom food");
  return true;
}

export async function updateCustomFood(
  token: string,
  foodId: string,
  payload: any,
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/foods/custom/${foodId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw new Error("Failed to update custom food");
  return res.json();
}

// Toggle daily diary completion status
export async function toggleDayCompletion(
  date: string,
  isCompleted: boolean,
): Promise<DailySummary> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/logs/${date}/toggle-complete`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ is_completed: isCompleted }),
    },
  );
  
  if (!res.ok) throw new Error('Failed to update day completion status');
  return res.json();
}