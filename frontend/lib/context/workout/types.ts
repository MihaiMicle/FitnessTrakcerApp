/* lib/context/workout/types.ts */

import type React from 'react';
import type { SetType } from '@/lib/workouts/constants';
import type { WorkoutExercise } from '@/lib/workouts/sets';

/* A rest timer stores when it ends, not how much is left, so a backgrounded
   tab resumes at the right number instead of where it was frozen */
export interface RestState {
  endsAt: number;
  total: number;
  label: string;
}

export interface WorkoutContextProps {
  activeSession: any | null;
  isMinimized: boolean;
  workoutName: string;
  setWorkoutName: React.Dispatch<React.SetStateAction<string>>;
  exercises: WorkoutExercise[];
  setExercises: React.Dispatch<React.SetStateAction<WorkoutExercise[]>>;
  previousSets: Record<string, any[]>;
  elapsed: number;
  formattedTime: string;
  startWorkout: (session: any) => void;
  minimizeWorkout: () => void;
  maximizeWorkout: () => void;
  clearWorkout: () => void;
  cancelWorkout: () => Promise<void>;
  addSet: (exId: string) => void;
  updateSet: (
    exId: string,
    setIndex: number,
    field: string,
    value: any,
  ) => void;
  toggleSetComplete: (exId: string, setIndex: number) => void;
  updateSetType: (exId: string, setIndex: number, type: string) => void;
  removeSet: (exId: string, setIndex: number) => void;
  removeExercise: (exId: string) => void;
  /* Append whole exercises, used by the copilot to drop a suggestion straight
     into the open session */
  addExercises: (additions: WorkoutExercise[]) => void;
  toggleSuperset: (index: number) => void;
  getNextSet: () => any | null;
  saveSession: (status?: string) => Promise<boolean>;
  restLabel: string;
  restRemaining: number;
  restTotal: number;
  isResting: boolean;
  startRest: (seconds: number, label: string) => void;
  adjustRest: (deltaSeconds: number) => void;
  skipRest: () => void;
  setExerciseRest: (
    exId: string,
    setType: SetType,
    seconds: number | null,
  ) => void;
  setSetRest: (exId: string, setIndex: number, seconds: number | null) => void;
  isTimerPaused: boolean;
  toggleTimer: () => void;
  overrideTimer: (seconds: number) => void;
  updateExerciseNotes: (exId: string, notes: string) => void;
}
