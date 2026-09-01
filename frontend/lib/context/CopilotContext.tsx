'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

import { useWorkout } from '@/lib/context/WorkoutContext';
import {
  applyProfileAction,
  createRoutine,
  fetchExerciseLibrary,
  logMealLine,
  sendCopilotMessage,
} from '@/lib/copilot/api';
import { emitCopilotChange } from '@/lib/copilot/events';
import { toLogMealLines } from '@/lib/copilot/meals';
import {
  toTemplatePayload,
  toWorkoutExercises,
  type LibraryExercise,
} from '@/lib/copilot/routine';
import type {
  CopilotAction,
  CopilotAttachment,
  CopilotExercise,
  CopilotMeal,
  CopilotMessage,
  CopilotRoutine,
  CopilotSurface,
} from '@/lib/copilot/types';

/*
 * The copilot lives above every page, so its state lives here rather than in
 * any one of them. Mounted inside WorkoutProvider in the root layout, which is
 * what lets it read the session in progress and write exercises back into it
 */

interface CopilotContextProps {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;

  messages: CopilotMessage[];
  loading: boolean;
  send: (text: string, attachments: CopilotAttachment[]) => Promise<void>;
  clearThread: () => void;

  surface: CopilotSurface;
  logDate: string;
  setLogDate: (date: string) => void;

  logMeal: (meal: CopilotMeal) => Promise<void>;
  saveRoutine: (routine: CopilotRoutine) => Promise<void>;
  addToLiveWorkout: (exercises: CopilotExercise[]) => void;
  applyAction: (action: CopilotAction) => Promise<void>;
  saveBodyFat: (percent: number) => Promise<void>;

  hasLiveWorkout: boolean;
}

const CopilotContext = createContext<CopilotContextProps | null>(null);

const today = () => new Date().toISOString().split('T')[0];

function messageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeSession, workoutName, exercises, elapsed, addExercises } =
    useWorkout();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [logDate, setLogDate] = useState(today());
  const [library, setLibrary] = useState<LibraryExercise[]>([]);

  const hasLiveWorkout = Boolean(
    activeSession && activeSession.status !== 'completed',
  );

  /* The library is only needed once the user opens the panel, and only to map
     a suggested name onto the exercise the app already knows */
  useEffect(() => {
    if (!isOpen || library.length > 0) return;
    let cancelled = false;
    fetchExerciseLibrary()
      .then((data) => {
        if (!cancelled) setLibrary(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isOpen, library.length]);

  const surface: CopilotSurface = useMemo(() => {
    if (hasLiveWorkout) return 'live_workout';
    if (pathname?.startsWith('/workouts')) return 'workouts';
    if (pathname?.startsWith('/settings')) return 'settings';
    return 'dashboard';
  }, [hasLiveWorkout, pathname]);

  const send = useCallback(
    async (text: string, attachments: CopilotAttachment[]) => {
      const trimmed = text.trim();
      if (!trimmed && attachments.length === 0) return;

      const userMessage: CopilotMessage = {
        id: messageId(),
        role: 'user',
        message: trimmed || 'What do you make of these?',
        images: attachments.map((a) => a.previewUrl),
      };

      /* Captured before the state update so the request carries the thread as
         it was, without waiting for a re-render */
      const history = messages;
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const reply = await sendCopilotMessage({
          message: userMessage.message,
          logDate,
          surface,
          history,
          attachments,
          liveWorkout: hasLiveWorkout
            ? {
                name: workoutName,
                elapsed_seconds: elapsed,
                exercises,
              }
            : null,
        });

        setMessages((prev) => [
          ...prev,
          { id: messageId(), role: 'assistant', ...reply },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: messageId(),
            role: 'assistant',
            failed: true,
            message:
              error instanceof Error
                ? error.message
                : 'The copilot could not be reached. Check your connection and try again.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [
      elapsed,
      exercises,
      hasLiveWorkout,
      logDate,
      messages,
      surface,
      workoutName,
    ],
  );

  /*
   * One POST per food, because that is how the diary stores them. Sequential
   * rather than parallel: each write reads and updates the same daily_logs row,
   * and firing them at once races the totals
   */
  const logMeal = useCallback(
    async (meal: CopilotMeal) => {
      const lines = toLogMealLines(meal, logDate);
      toast.loading(`Logging ${meal.title}...`, { id: 'copilot-meal' });
      try {
        for (const line of lines) {
          await logMealLine(line as unknown as Record<string, unknown>);
        }
        toast.success(`${meal.title} logged`, { id: 'copilot-meal' });
        emitCopilotChange('nutrition');
      } catch {
        toast.error('Could not log the meal. Try again in a moment.', {
          id: 'copilot-meal',
        });
      }
    },
    [logDate],
  );

  const saveRoutine = useCallback(
    async (routine: CopilotRoutine) => {
      toast.loading('Saving routine...', { id: 'copilot-routine' });
      try {
        await createRoutine(toTemplatePayload(routine, library));
        toast.success(`Routine "${routine.name}" saved`, {
          id: 'copilot-routine',
        });
        emitCopilotChange('routines');
      } catch {
        toast.error('Could not save the routine. Try again in a moment.', {
          id: 'copilot-routine',
        });
      }
    },
    [library],
  );

  const addToLiveWorkout = useCallback(
    (suggestions: CopilotExercise[]) => {
      if (!hasLiveWorkout) {
        toast.error('Start a workout first, then I can add exercises to it');
        return;
      }
      addExercises(toWorkoutExercises(suggestions, library));
      toast.success(
        suggestions.length === 1
          ? `${suggestions[0].name} added`
          : `${suggestions.length} exercises added`,
      );
    },
    [addExercises, hasLiveWorkout, library],
  );

  const applyAction = useCallback(async (action: CopilotAction) => {
    toast.loading('Applying...', { id: 'copilot-action' });
    try {
      await applyProfileAction(action.payload);
      toast.success('Applied', { id: 'copilot-action' });
      emitCopilotChange('profile');
      emitCopilotChange('nutrition');
    } catch {
      toast.error('Could not apply that change.', { id: 'copilot-action' });
    }
  }, []);

  const saveBodyFat = useCallback(async (percent: number) => {
    toast.loading('Saving...', { id: 'copilot-bf' });
    try {
      await applyProfileAction({ body_fat_percentage: percent });
      toast.success(`Body fat set to ${percent}%`, { id: 'copilot-bf' });
      emitCopilotChange('profile');
    } catch {
      toast.error('Could not save the estimate.', { id: 'copilot-bf' });
    }
  }, []);

  const value = useMemo<CopilotContextProps>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((prev) => !prev),
      messages,
      loading,
      send,
      clearThread: () => setMessages([]),
      surface,
      logDate,
      setLogDate,
      logMeal,
      saveRoutine,
      addToLiveWorkout,
      applyAction,
      saveBodyFat,
      hasLiveWorkout,
    }),
    [
      addToLiveWorkout,
      applyAction,
      hasLiveWorkout,
      isOpen,
      logDate,
      logMeal,
      loading,
      messages,
      saveBodyFat,
      saveRoutine,
      send,
      surface,
    ],
  );

  return (
    <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilot must be used within CopilotProvider');
  }
  return context;
}
