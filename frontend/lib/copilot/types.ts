/* lib/copilot/types.ts */

import type { MealType, ServingUnit } from '@/types/nutrition';

/* The reply shape backend/core/copilot/parsing.py guarantees. Every field is
   nullable there, so every field is optional here and the UI branches on
   presence rather than trusting the model to have filled anything in */

export interface CopilotFood {
  food_name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
  sugar_g?: number;
}

export interface CopilotMeal {
  title: string;
  meal_type: MealType;
  reason?: string | null;
  foods: CopilotFood[];
}

export interface CopilotSet {
  weight_kg?: number | null;
  reps?: number | null;
  rir?: number | null;
  duration_minutes?: number | null;
  distance_km?: number | null;
}

export interface CopilotExercise {
  name: string;
  type: 'strength' | 'cardio';
  primary_muscle?: string | null;
  secondary_muscles?: string[] | null;
  note?: string | null;
  reason?: string | null;
  sets: CopilotSet[];
}

export interface CopilotRoutine {
  name: string;
  notes?: string | null;
  exercises: CopilotExercise[];
}

export interface CopilotBodyFat {
  estimate_percent: number;
  range_low?: number | null;
  range_high?: number | null;
  confidence: 'low' | 'medium' | 'high';
  rationale?: string | null;
  photos_used?: number;
}

export interface CopilotAction {
  type: 'UPDATE_GOALS' | 'UPDATE_PROFILE' | 'SET_BODY_FAT';
  payload: Record<string, unknown>;
}

export interface CopilotReply {
  message: string;
  action?: CopilotAction | null;
  suggested_meals?: CopilotMeal[] | null;
  suggested_routine?: CopilotRoutine | null;
  suggested_exercises?: CopilotExercise[] | null;
  body_fat?: CopilotBodyFat | null;
}

/* A photo the user attached, held in memory only. previewUrl is an object URL
   the composer revokes once the message is sent */
export interface CopilotAttachment {
  id: string;
  mimeType: string;
  data: string;
  name: string;
  previewUrl: string;
}

export interface CopilotMessage extends CopilotReply {
  id: string;
  role: 'user' | 'assistant';
  /* Thumbnails shown on the user's own bubble after sending */
  images?: string[];
  failed?: boolean;
}

/* Which screen the question came from. The backend tunes reply length off this,
   so a mid-set question gets two lines instead of five */
export type CopilotSurface =
  | 'dashboard'
  | 'workouts'
  | 'live_workout'
  | 'settings';

export interface LogMealLine {
  meal_type: string;
  food_name: string;
  serving_size: number;
  serving_unit: ServingUnit;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
  sugar_g: number;
  date: string;
}
