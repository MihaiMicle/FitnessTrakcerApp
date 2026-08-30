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

// Key for caching Personal Records locally
const PR_KEY = 'fittracker.workout.prs.v1';

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

// ... (Keep existing WorkoutContextProps interfaces the same) ...
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

  // NEW: State to hold all-time Personal Records
  const [personalRecords, setPersonalRecords] = useState<
    Record<
      string,
      {
        max1RM: number;
        maxVolume: number;
        bestSets: Record<number, { weight_kg: number; reps: number }>;
      }
    >
  >({});

  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<RestState | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => startSyncManager(), []);

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

  // Load cached Previous Sets and Personal Records
  useEffect(() => {
    const cached = readJson<Record<string, any[]>>(PREV_SETS_KEY, {});
    if (Object.keys(cached).length > 0) setPreviousSets(cached);

    const cachedPRs = readJson<Record<string, any>>(PR_KEY, {});
    if (Object.keys(cachedPRs).length > 0) setPersonalRecords(cachedPRs);
  }, []);

  useEffect(() => {
    const fetchPreviousSets = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const newPreviousSets = { ...previousSets };
      const newPersonalRecords = { ...personalRecords };
      let hasChanges = false;

      for (const ex of exercises) {
        if (!newPreviousSets[ex.name]) {
          try {
            // 1. Fetch the last session's sets for the UI preview
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises/${encodeURIComponent(ex.name)}/last-sets`,
              { headers: { Authorization: `Bearer ${session.access_token}` } },
            );
            if (res.ok) {
              newPreviousSets[ex.name] = await res.json();
              hasChanges = true;
            }

            // 2. NEW: Fetch ALL history to calculate true all-time PRs
            const histRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises/${encodeURIComponent(ex.name)}/history?limit=100`,
              { headers: { Authorization: `Bearer ${session.access_token}` } },
            );

            if (histRes.ok) {
              const history = await histRes.json();
              let max1RM = 0;
              let maxVolume = 0;
              const bestSets: Record<
                number,
                { weight_kg: number; reps: number }
              > = {};

              history.forEach((s: any) => {
                const weight = Number(s.weight_kg) || 0;
                const reps = Number(s.reps) || 0;

                if (weight > 0 && reps > 0) {
                  const e1RM = weight * (1 + 0.0333 * reps);
                  const vol = weight * reps;

                  if (e1RM > max1RM) max1RM = e1RM;
                  if (vol > maxVolume) maxVolume = vol;

                  // Parse set index (0-based) for strict set progression
                  const setIdx = (s.set_number || 1) - 1;
                  if (!bestSets[setIdx]) {
                    bestSets[setIdx] = { weight_kg: weight, reps: reps };
                  } else {
                    const prevBest = bestSets[setIdx];
                    // Strict rule: Must beat weight, OR tie weight and beat reps
                    if (
                      weight > prevBest.weight_kg ||
                      (weight === prevBest.weight_kg && reps > prevBest.reps)
                    ) {
                      bestSets[setIdx] = { weight_kg: weight, reps: reps };
                    }
                  }
                }
              });

              newPersonalRecords[ex.name] = { max1RM, maxVolume, bestSets };
              hasChanges = true;
            }
          } catch (err) {}
        }
      }

      if (hasChanges) {
        setPreviousSets(newPreviousSets);
        writeJson(PREV_SETS_KEY, newPreviousSets);

        setPersonalRecords(newPersonalRecords);
        writeJson(PR_KEY, newPersonalRecords);
      }
    };

    if (exercises.length > 0) fetchPreviousSets();
  }, [exercises, previousSets, personalRecords]);

  // Rest countdown
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
        toast.success(`Rest over • ${rest.label}`, { id: 'rest-timer' });
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

  const toggleSetComplete = useCallback(
    (exId: string, setIndex: number) => {
      let newlyCompleted = false;
      let currentSetData: any = null;
      let exName = '';

      const next = exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const newSets = [...ex.sets];
        const isCompleting = !newSets[setIndex].completed;

        newSets[setIndex] = {
          ...newSets[setIndex],
          completed: isCompleting,
        };

        if (isCompleting) {
          newlyCompleted = true;
          currentSetData = newSets[setIndex];
          exName = ex.name;
        }

        return { ...ex, sets: newSets };
      });

      setExercises(next);

      // PR Celebration Logic
      if (newlyCompleted && currentSetData && exName) {
        const cWeight = Number(currentSetData.weight_kg) || 0;
        const cReps = Number(currentSetData.reps) || 0;

        if (cWeight > 0 && cReps > 0) {
          const c1RM = cWeight * (1 + 0.0333 * cReps);
          const cVol = cWeight * cReps;

          // Pull the current PRs directly from state
          const prs = personalRecords[exName];

          if (prs) {
            let isNew1RM = false;
            let isNewVol = false;
            let isSetProgression = false;

            // Clone to mutate
            const updatedPRs = { ...prs, bestSets: { ...prs.bestSets } };

            // 1RM Check
            if (c1RM > updatedPRs.max1RM && updatedPRs.max1RM > 0) {
              isNew1RM = true;
              updatedPRs.max1RM = c1RM;
            }

            // Volume Check
            if (cVol > updatedPRs.maxVolume && updatedPRs.maxVolume > 0) {
              isNewVol = true;
              updatedPRs.maxVolume = cVol;
            }

            // Set Progression Check
            const bestForSet = updatedPRs.bestSets[setIndex];
            if (bestForSet) {
              if (
                cWeight > bestForSet.weight_kg ||
                (cWeight === bestForSet.weight_kg && cReps > bestForSet.reps)
              ) {
                isSetProgression = true;
                updatedPRs.bestSets[setIndex] = {
                  weight_kg: cWeight,
                  reps: cReps,
                };
              }
            } else {
              // First time logging this set index
              updatedPRs.bestSets[setIndex] = {
                weight_kg: cWeight,
                reps: cReps,
              };
            }

            // Fire the toasts OUTSIDE the state updater
            if (isNew1RM) {
              toast.success(`New 1RM for ${exName}: ${Math.round(c1RM)}kg!`, {
                icon: '🏆',
                duration: 4000,
              });
            } else if (isNewVol) {
              toast.success(
                `New Volume PR for ${exName}: ${Math.round(cVol)}kg!`,
                { icon: '📈', duration: 4000 },
              );
            } else if (isSetProgression) {
              toast.success(
                `Set Progression: You beat your best Set ${setIndex + 1}!`,
                { icon: '✨', duration: 3000 },
              );
            }

            // Only trigger a state update and storage write if a record was actually broken or established
            if (isNew1RM || isNewVol || isSetProgression || !bestForSet) {
              const nextRecords = { ...personalRecords, [exName]: updatedPRs };
              setPersonalRecords(nextRecords);
              writeJson(PR_KEY, nextRecords);
            }
          }
        }
      }

      const plan = planRestAfterSet(next, exId, setIndex);
      if (plan) startRest(plan.seconds, plan.label);
    },
    // Make sure to add personalRecords to the dependency array
    [exercises, personalRecords, startRest],
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
        newEx[index] = { ...current, superset_id: null };
        const isPrevOrphaned = !newEx.some(
          (e, i) => i !== index - 1 && e.superset_id === previous.superset_id,
        );
        if (isPrevOrphaned) {
          newEx[index - 1] = { ...previous, superset_id: null };
        }
      } else {
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
