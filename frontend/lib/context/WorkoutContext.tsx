'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import type { SetType } from '@/lib/workouts/constants';
import {
  planRestAfterSet,
  withExerciseRest,
  withSetRest,
} from '@/lib/workouts/rest';
import { formatClock } from '@/lib/workouts/session';
import { checkSetAgainstRecords, recordToast } from '@/lib/workouts/records';
import {
  addSetTo,
  findNextSet,
  removeExerciseFrom,
  removeSetFrom,
  toggleSetCompleted,
  toggleSupersetAt,
  updateSetField,
  updateSetTypeIn,
  type WorkoutExercise,
} from '@/lib/workouts/sets';
import { queueSessionDelete, queueSessionSave } from '@/lib/offline/manager';
import { DRAFT_KEY, removeKey } from '@/lib/offline/storage';
import { useSessionTimer } from './workout/useSessionTimer';
import { useRestTimer } from './workout/useRestTimer';
import { useExerciseHistory } from './workout/useExerciseHistory';
import {
  useSessionPersist,
  useSessionRestore,
} from './workout/useSessionRestore';
import type { WorkoutContextProps } from './workout/types';

const WorkoutContext = createContext<WorkoutContextProps | undefined>(
  undefined,
);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [workoutName, setWorkoutName] = useState('Workout');

  const isRunning = Boolean(
    activeSession && activeSession.status !== 'completed',
  );
  const timer = useSessionTimer(isRunning);
  const rest = useRestTimer();
  const history = useExerciseHistory(exercises);

  const setElapsed = timer.setElapsed;
  const applySession = useCallback(
    (data: any, minimized: boolean) => {
      setActiveSession(data);
      setExercises(data.exercises || []);
      setWorkoutName(data.name || 'Workout');
      setElapsed(data.duration_seconds || 0);
      setIsMinimized(minimized);
    },
    [setElapsed],
  );

  const hydrated = useSessionRestore({
    onRestore: (data) => applySession(data, true),
  });

  useSessionPersist({
    hydrated,
    session: activeSession,
    name: workoutName,
    exercises,
  });

  const startWorkout = (sessionData: any) => {
    applySession(sessionData, false);
    timer.setIsPaused(false);
  };

  const clearWorkout = () => {
    removeKey(DRAFT_KEY);
    setActiveSession(null);
    setExercises([]);
    history.clear();
    timer.setElapsed(0);
    timer.setIsPaused(false);
    rest.reset();
    setIsMinimized(false);
  };

  const cancelWorkout = async () => {
    if (activeSession?.id) {
      queueSessionDelete(activeSession.id);
      toast.success('Workout canceled');
    }
    clearWorkout();
  };

  const addSet = useCallback((exId: string) => {
    setExercises((prev) => addSetTo(prev, exId));
  }, []);

  const updateSet = useCallback(
    (exId: string, setIndex: number, field: string, value: any) => {
      setExercises((prev) =>
        updateSetField(prev, exId, setIndex, field, value),
      );
    },
    [],
  );

  const updateSetType = useCallback(
    (exId: string, setIndex: number, type: string) => {
      setExercises((prev) => updateSetTypeIn(prev, exId, setIndex, type));
    },
    [],
  );

  const removeSet = useCallback((exId: string, setIndex: number) => {
    setExercises((prev) => removeSetFrom(prev, exId, setIndex));
  }, []);

  const removeExercise = useCallback((exId: string) => {
    setExercises((prev) => removeExerciseFrom(prev, exId));
  }, []);

  const toggleSuperset = useCallback((index: number) => {
    setExercises((prev) => toggleSupersetAt(prev, index));
  }, []);

  const setExerciseRest = useCallback(
    (exId: string, setType: SetType, seconds: number | null) => {
      setExercises((prev) => withExerciseRest(prev, exId, setType, seconds));
    },
    [],
  );

  const setSetRest = useCallback(
    (exId: string, setIndex: number, seconds: number | null) => {
      setExercises((prev) => withSetRest(prev, exId, setIndex, seconds));
    },
    [],
  );

  /* Ticking a set off flips the flag, checks for a personal record and starts
     the rest timer. The record check only runs on the way to completed, so
     unticking a set is a no op */
  const toggleSetComplete = useCallback(
    (exId: string, setIndex: number) => {
      const next = toggleSetCompleted(exercises, exId, setIndex);
      setExercises(next);

      const exercise = next.find((ex) => ex.id === exId);
      const set = exercise?.sets[setIndex];

      if (exercise && set?.completed && history.hasRecordsFor(exercise.name)) {
        const check = checkSetAgainstRecords(
          history.recordsFor(exercise.name),
          setIndex,
          Number(set.weight_kg) || 0,
          Number(set.reps) || 0,
        );

        const celebration = recordToast(check, exercise.name, setIndex);
        if (celebration) {
          toast.success(celebration.message, {
            icon: celebration.icon,
            duration: celebration.duration,
          });
        }
        if (check.changed) history.saveRecords(exercise.name, check.records);
      }

      const plan = planRestAfterSet(next, exId, setIndex);
      if (plan) rest.start(plan.seconds, plan.label);
    },
    [exercises, history, rest],
  );

  const getNextSet = useCallback(() => findNextSet(exercises), [exercises]);

  const saveSession = async (status = 'in_progress') => {
    if (!activeSession?.id) return false;

    const payload: any = {
      name: workoutName,
      status,
      start_time: activeSession.start_time,
      duration_seconds: timer.elapsed,
      exercises,
    };
    if (status === 'completed') {
      payload.end_time = activeSession.end_time || new Date().toISOString();
    }

    queueSessionSave(activeSession.id, payload);
    if (status === 'completed') removeKey(DRAFT_KEY);
    return true;
  };

  return (
    <WorkoutContext.Provider
      value={{
        activeSession,
        isMinimized,
        workoutName,
        setWorkoutName,
        exercises,
        setExercises,
        previousSets: history.previousSets,
        elapsed: timer.elapsed,
        formattedTime: formatClock(timer.elapsed),
        startWorkout,
        minimizeWorkout: () => setIsMinimized(true),
        maximizeWorkout: () => setIsMinimized(false),
        clearWorkout,
        cancelWorkout,
        addSet,
        updateSet,
        toggleSetComplete,
        updateSetType,
        removeSet,
        removeExercise,
        toggleSuperset,
        getNextSet,
        saveSession,
        restLabel: rest.label,
        restRemaining: rest.remaining,
        restTotal: rest.total,
        isResting: rest.isResting,
        startRest: rest.start,
        adjustRest: rest.adjust,
        skipRest: rest.skip,
        setExerciseRest,
        setSetRest,
        isTimerPaused: timer.isPaused,
        toggleTimer: timer.toggle,
        overrideTimer: timer.override,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within WorkoutProvider');
  }
  return context;
}

export type { WorkoutContextProps };
