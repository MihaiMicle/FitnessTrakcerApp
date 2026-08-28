'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { SetType } from '@/lib/workouts/constants';
import {
  clampRestSeconds,
  planRestAfterSet,
  withExerciseRest,
  withSetRest,
} from '@/lib/workouts/rest';
import {
  notifyRestComplete,
  requestRestNotificationPermission,
} from '@/lib/workouts/restNotify';
import {
  chooseActiveWorkout,
  isDraft,
  makeDraft,
  type WorkoutDraft,
} from '@/lib/offline/draft';
import {
  queueSessionDelete,
  queueSessionSave,
  startSyncManager,
} from '@/lib/offline/manager';
import {
  DRAFT_KEY,
  PREV_SETS_KEY,
  readJson,
  removeKey,
  writeJson,
} from '@/lib/offline/storage';

const FIELD_KEYS: Record<string, string> = {
  weight: 'weight_kg',
  reps: 'reps',
  rir: 'rir',
  time: 'duration_minutes',
  distance: 'distance_km',
  incline: 'incline',
  speed: 'speed',
  difficulty: 'difficulty',
};

interface WorkoutContextProps {
  activeSession: any | null;
  isMinimized: boolean;
  workoutName: string;
  setWorkoutName: React.Dispatch<React.SetStateAction<string>>;
  exercises: any[];
  setExercises: React.Dispatch<React.SetStateAction<any[]>>;
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
  toggleSuperset: (index: number) => void;
  getNextSet: () => any | null;
  saveSession: (status?: string) => Promise<boolean>;

  /* Rest timer */
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
}

interface RestState {
  endsAt: number;
  total: number;
  label: string;
}

const WorkoutContext = createContext<WorkoutContextProps | undefined>(
  undefined,
);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [exercises, setExercises] = useState<any[]>([]);
  const [workoutName, setWorkoutName] = useState('Workout');
  const [previousSets, setPreviousSets] = useState<Record<string, any[]>>({});
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<RestState | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);

  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [accumulatedTime, setAccumulatedTime] = useState(0);

  /* Blocks the draft writer until the restore below has finished */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => startSyncManager(), []);

  /*
   * Recover the workout in progress
   *
   * The local draft is applied first because it needs no network and holds any
   * sets that have not been uploaded yet. The server is then asked what it
   * thinks is active, and the two are reconciled
   */
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const stored = readJson<unknown>(DRAFT_KEY, null);
      const draft: WorkoutDraft | null = isDraft(stored) ? stored : null;

      const apply = (data: any) => {
        if (cancelled || !data) return;
        setActiveSession(data);
        setExercises(data.exercises || []);
        setWorkoutName(data.name || 'Workout');
        setElapsed(data.duration_seconds || 0);
        setIsMinimized(true);
      };

      const local = chooseActiveWorkout(draft, null, Date.now());
      apply(local);

      let server: any = null;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/workouts/active`,
            {
              headers: { Authorization: `Bearer ${session.access_token}` },
            },
          );
          if (res.ok) server = await res.json();
        }
      } catch (e) {}

      /* Re-applying the same session would discard anything typed meanwhile */
      const resolved = chooseActiveWorkout(draft, server, Date.now());
      if (resolved && resolved.id !== (local as any)?.id) apply(resolved);
      if (!cancelled) setHydrated(true);
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const startWorkout = (sessionData: any) => {
    setActiveSession(sessionData);
    setExercises(sessionData.exercises || []);
    setWorkoutName(sessionData.name || 'Workout');
    setElapsed(sessionData.duration_seconds || 0);
    setIsMinimized(false);
    setIsTimerPaused(false);
  };

  const clearWorkout = () => {
    removeKey(DRAFT_KEY);
    setActiveSession(null);
    setExercises([]);
    setPreviousSets({});
    setElapsed(0);
    setRest(null);
    setRestRemaining(0);
    setIsMinimized(false);
    setIsTimerPaused(false);
  };

  /*
   * Cancelling drops any queued save for this session before queueing the
   * delete, so an unsent workout never reaches the server just to be removed
   */
  const cancelWorkout = async () => {
    if (activeSession?.id) {
      queueSessionDelete(activeSession.id);
      toast.success('Workout canceled');
    }
    clearWorkout();
  };

  const minimizeWorkout = () => setIsMinimized(true);
  const maximizeWorkout = () => setIsMinimized(false);

  // Timer
  useEffect(() => {
    if (!activeSession || activeSession.status === 'completed' || isTimerPaused)
      return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, isTimerPaused]);

  const toggleTimer = () => setIsTimerPaused((prev) => !prev);
  const overrideTimer = (seconds: number) => setElapsed(seconds);

  /*
   * Mirror the workout to local storage
   *
   * Elapsed time is deliberately not a dependency: it changes every second and
   * is recomputed from start_time on restore anyway
   */
  useEffect(() => {
    if (!hydrated || !activeSession?.id) return;
    if (activeSession.status === 'completed') return;
    writeJson(
      DRAFT_KEY,
      makeDraft(
        {
          sessionId: activeSession.id,
          name: workoutName,
          startTime: activeSession.start_time,
          exercises,
        },
        Date.now(),
      ),
    );
  }, [hydrated, activeSession, workoutName, exercises]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0)
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /*
   * Last time's numbers are the reference a user lifts against, so they are
   * cached rather than fetched fresh. Without this the column reads "-" for
   * every exercise the moment the signal drops
   */
  useEffect(() => {
    const cached = readJson<Record<string, any[]>>(PREV_SETS_KEY, {});
    if (Object.keys(cached).length > 0) setPreviousSets(cached);
  }, []);

  useEffect(() => {
    const fetchPreviousSets = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const newPreviousSets = { ...previousSets };
      let hasChanges = false;
      for (const ex of exercises) {
        if (!newPreviousSets[ex.name]) {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises/${encodeURIComponent(ex.name)}/last-sets`,
              {
                headers: { Authorization: `Bearer ${session.access_token}` },
              },
            );
            if (res.ok) {
              newPreviousSets[ex.name] = await res.json();
              hasChanges = true;
            }
          } catch (err) {}
        }
      }
      if (hasChanges) {
        setPreviousSets(newPreviousSets);
        writeJson(PREV_SETS_KEY, newPreviousSets);
      }
    };
    if (exercises.length > 0) fetchPreviousSets();
  }, [exercises, previousSets]);

  /*
   * Rest countdown
   *
   * Stored as a deadline rather than a decrementing number so a backgrounded
   * tab, which throttles intervals, still reads the right time when it wakes
   */
  useEffect(() => {
    if (!rest) {
      setRestRemaining(0);
      return;
    }

    let finished = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000));
      setRestRemaining(left);
      if (left === 0 && !finished) {
        finished = true;
        notifyRestComplete(rest.label);
        toast.success(`Rest over · ${rest.label}`, { id: 'rest-timer' });
        setRest(null);
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [rest]);

  const startRest = useCallback((seconds: number, label: string) => {
    const total = clampRestSeconds(seconds);
    if (total <= 0) return;
    requestRestNotificationPermission();
    setRest({ endsAt: Date.now() + total * 1000, total, label });
    setRestRemaining(total);
  }, []);

  const skipRest = useCallback(() => {
    setRest(null);
    setRestRemaining(0);
  }, []);

  /* Plus and minus on the running timer, floored so it cannot go negative */
  const adjustRest = useCallback((deltaSeconds: number) => {
    setRest((prev) => {
      if (!prev) return prev;
      const left = Math.max(0, Math.ceil((prev.endsAt - Date.now()) / 1000));
      const nextLeft = Math.max(0, left + deltaSeconds);
      if (nextLeft === 0) return null;
      return {
        ...prev,
        endsAt: Date.now() + nextLeft * 1000,
        total: Math.max(prev.total, nextLeft),
      };
    });
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

  // Set & Exercise Management
  const addSet = useCallback((exId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: any = {
          set: ex.sets.length + 1,
          set_type: 'working',
          completed: false,
        };
        ex.tracking_fields.forEach((f: string) => {
          const key = FIELD_KEYS[f];
          newSet[key] = lastSet ? lastSet[key] : '';
        });
        return { ...ex, sets: [...ex.sets, newSet] };
      }),
    );
  }, []);

  const updateSet = useCallback(
    (exId: string, setIndex: number, field: string, value: any) => {
      setExercises((prev) =>
        prev.map((ex) => {
          if (ex.id !== exId) return ex;
          const newSets = [...ex.sets];
          newSets[setIndex] = { ...newSets[setIndex], [field]: value };
          return { ...ex, sets: newSets };
        }),
      );
    },
    [],
  );

  /*
   * Checking a set off is what starts rest, so this works off the current
   * array rather than a functional update: `planRestAfterSet` needs to see the
   * whole list after the toggle to know whether a superset round just closed
   */
  const toggleSetComplete = useCallback(
    (exId: string, setIndex: number) => {
      const next = exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const newSets = [...ex.sets];
        newSets[setIndex] = {
          ...newSets[setIndex],
          completed: !newSets[setIndex].completed,
        };
        return { ...ex, sets: newSets };
      });
      setExercises(next);

      const plan = planRestAfterSet(next, exId, setIndex);
      if (plan) startRest(plan.seconds, plan.label);
    },
    [exercises, startRest],
  );

  const updateSetType = useCallback(
    (exId: string, setIndex: number, type: string) => {
      setExercises((prev) =>
        prev.map((ex) => {
          if (ex.id !== exId) return ex;
          const newSets = [...ex.sets];
          newSets[setIndex] = { ...newSets[setIndex], set_type: type };
          return { ...ex, sets: newSets };
        }),
      );
    },
    [],
  );

  const removeSet = useCallback((exId: string, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const newSets = ex.sets.filter((_: any, i: number) => i !== setIndex);
        return {
          ...ex,
          sets: newSets.map((s: any, i: number) => ({ ...s, set: i + 1 })),
        };
      }),
    );
  }, []);

  const removeExercise = useCallback((exId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exId));
  }, []);

  const toggleSuperset = useCallback((index: number) => {
    if (index <= 0) return;
    setExercises((prev) => {
      const newEx = [...prev];
      const current = newEx[index];
      const previous = newEx[index - 1];

      if (current.superset_id && current.superset_id === previous.superset_id) {
        // Unlink
        newEx[index] = { ...current, superset_id: null };
        // Clean up previous if it's now orphaned
        const isPrevOrphaned = !newEx.some(
          (e, i) => i !== index - 1 && e.superset_id === previous.superset_id,
        );
        if (isPrevOrphaned) {
          newEx[index - 1] = { ...previous, superset_id: null };
        }
      } else {
        // Link
        const setId = previous.superset_id || `ss-${Date.now()}`;
        newEx[index - 1] = { ...previous, superset_id: setId };
        newEx[index] = { ...current, superset_id: setId };
      }
      return newEx;
    });
  }, []);

  const getNextSet = useCallback(() => {
    for (const ex of exercises) {
      const setIdx = ex.sets.findIndex((s: any) => !s.completed);
      if (setIdx !== -1)
        return { exercise: ex, setIndex: setIdx, set: ex.sets[setIdx] };
    }
    return null;
  }, [exercises]);

  /*
   * Record the workout locally and upload it when possible
   *
   * The write goes to the queue instead of the network, so this succeeds with
   * no signal and callers never have to handle a failed save. start_time is
   * always sent because the queued PUT may be the first the server hears of
   * this session
   */
  const saveSession = async (status = 'in_progress') => {
    if (!activeSession?.id) return false;

    const payload: any = {
      name: workoutName,
      status,
      start_time: activeSession.start_time,
      duration_seconds: elapsed,
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
        previousSets,
        elapsed,
        formattedTime: formatTime(elapsed),
        startWorkout,
        minimizeWorkout,
        maximizeWorkout,
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
        restLabel: rest?.label || '',
        restRemaining,
        restTotal: rest?.total || 0,
        isResting: rest !== null,
        startRest,
        adjustRest,
        skipRest,
        setExerciseRest,
        setSetRest,
        isTimerPaused,
        toggleTimer,
        overrideTimer,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context)
    throw new Error('useWorkout must be used within WorkoutProvider');
  return context;
}
