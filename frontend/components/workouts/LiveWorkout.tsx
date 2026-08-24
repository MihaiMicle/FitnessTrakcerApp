'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Clock,
  Check,
  Dumbbell,
  Activity,
  BookmarkPlus,
} from 'lucide-react';
import ExerciseSelectorModal from './ExerciseSelectorModal';

// Maps database 'tracking_fields' to their display labels
const FIELD_LABELS: Record<string, string> = {
  weight: 'kg',
  reps: 'Reps',
  rir: 'RIR',
  time: 'Time (m)',
  distance: 'Dist (km)',
  incline: 'Inc',
  speed: 'Spd',
  difficulty: 'Lvl',
};

// Maps database 'tracking_fields' to the state keys we use
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

function useWorkoutTimer(
  startTime: string,
  initialDuration: number,
  isCompleted: boolean,
) {
  const [elapsed, setElapsed] = useState(isCompleted ? initialDuration : 0);

  useEffect(() => {
    if (isCompleted || !startTime) return;
    const start = new Date(startTime).getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      setElapsed(Math.floor((now - start) / 1000));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, isCompleted]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0)
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return { elapsed, formatted: formatTime(elapsed) };
}

export default function LiveWorkout({
  sessionData,
  onClose,
}: {
  sessionData: any;
  onClose: () => void;
}) {
  const isCompleted = sessionData.status === 'completed';
  const [exercises, setExercises] = useState<any[]>(
    sessionData.exercises || [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [workoutName, setWorkoutName] = useState(sessionData.name || 'Workout');
  const [selectorType, setSelectorType] = useState<
    'strength' | 'cardio' | null
  >(null);

  const { elapsed, formatted } = useWorkoutTimer(
    sessionData.start_time,
    sessionData.duration_seconds || 0,
    isCompleted,
  );

  const saveAsRoutine = async () => {
    if (exercises.length === 0) {
      toast.error('Add exercises before saving a routine');
      return;
    }
    toast.loading('Saving routine...', { id: 'routine' });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const cleanExercises = exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s: any) => ({ ...s, completed: false })),
      }));

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: workoutName,
            exercises: cleanExercises,
          }),
        },
      );

      if (res.ok) {
        toast.success(`Routine '${workoutName}' saved!`, { id: 'routine' });
      } else {
        toast.error('Failed to save routine', { id: 'routine' });
      }
    } catch (err) {
      toast.error('Network error', { id: 'routine' });
    }
  };

  const saveSession = async (status = 'in_progress') => {
    setIsSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const payload: any = {
        name: workoutName,
        status,
        duration_seconds: elapsed,
        exercises,
      };

      if (status === 'completed' && !isCompleted) {
        payload.end_time = new Date().toISOString();
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/${sessionData.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error('Failed to save');

      if (status === 'completed') {
        toast.success(isCompleted ? 'Changes saved!' : 'Workout completed!');
        onClose();
      } else {
        toast.success('Progress saved', { id: 'save' });
      }
    } catch (err) {
      toast.error('Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (!isCompleted) saveSession('in_progress');
    onClose();
  };

  // Process selected exercise from modal
  const handleExerciseSelected = (selectedEx: any) => {
    const trackingFields =
      selectedEx.tracking_fields ||
      (selectedEx.type === 'strength' ? ['weight', 'reps', 'rir'] : ['time']);

    const newEx = {
      id: 'ex-' + Date.now(),
      name: selectedEx.name,
      type: selectedEx.type,
      tracking_fields: trackingFields,
      sets: [{ set: 1, completed: false }],
    };

    setExercises([...exercises, newEx]);
    setSelectorType(null);
  };

  const addSet = (exId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: any = { set: ex.sets.length + 1, completed: false };

        // Auto-copy previous set's values (except completion status)
        ex.tracking_fields.forEach((f: string) => {
          const key = FIELD_KEYS[f];
          newSet[key] = lastSet ? lastSet[key] : '';
        });

        return { ...ex, sets: [...ex.sets, newSet] };
      }),
    );
  };

  const updateSet = (
    exId: string,
    setIndex: number,
    field: string,
    value: any,
  ) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        return { ...ex, sets: newSets };
      }),
    );
  };

  const toggleSetComplete = (exId: string, setIndex: number) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const newSets = [...ex.sets];
        newSets[setIndex].completed = !newSets[setIndex].completed;
        return { ...ex, sets: newSets };
      }),
    );
  };

  const removeExercise = (exId: string) =>
    setExercises(exercises.filter((ex) => ex.id !== exId));

  const inputClass =
    'bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono min-w-0 text-center w-full';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 p-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <button
              onClick={handleBack}
              className="text-neutral-500 hover:text-white transition-colors shrink-0"
            >
              <ChevronLeft size={28} />
            </button>
            <div className="flex flex-col flex-1 min-w-0">
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="bg-transparent text-lg sm:text-xl font-bold text-white outline-none focus:border-b focus:border-indigo-500 placeholder:text-neutral-600 w-full truncate"
                placeholder="Workout Name"
              />
              <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-[10px] sm:text-xs mt-0.5">
                <Clock size={12} />
                {formatted}{' '}
                {isCompleted && (
                  <span className="text-emerald-500 font-bold ml-1">
                    (Saved)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3 shrink-0">
            <button
              onClick={saveAsRoutine}
              title="Save as Routine"
              className="bg-neutral-800 hover:bg-neutral-700 text-indigo-400 p-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center border border-neutral-700 active:scale-95"
            >
              <BookmarkPlus size={18} />
              <span className="hidden sm:inline text-xs font-mono ml-2 font-bold">
                Save Routine
              </span>
            </button>
            <button
              onClick={() => saveSession('completed')}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 sm:px-6 rounded-lg transition-colors font-mono text-xs active:scale-95"
            >
              {isCompleted ? 'Save Edits' : 'Finish'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:px-6 space-y-6 pb-32">
        {exercises.map((ex, index) => (
          <div
            key={ex.id}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {index + 1}
                </div>
                <h3 className="text-lg font-bold text-indigo-100 truncate">
                  {ex.name}
                </h3>
              </div>
              <button
                onClick={() => removeExercise(ex.id)}
                className="text-neutral-600 hover:text-rose-500 p-2 transition-colors shrink-0"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Dynamic Tracking Table */}
            <div className="space-y-2">
              {/* Dynamic Headers */}
              <div className="flex gap-2 px-1 text-[10px] text-neutral-500 font-mono uppercase tracking-wider items-center">
                <span className="w-6 text-center shrink-0">Set</span>
                {(ex.tracking_fields || []).map((f: string) => (
                  <span key={f} className="flex-1 text-center truncate">
                    {FIELD_LABELS[f] || f}
                  </span>
                ))}
                <span className="w-10 text-center shrink-0">
                  <Check size={14} className="mx-auto" />
                </span>
              </div>

              {/* Dynamic Rows */}
              {ex.sets.map((set: any, sIdx: number) => (
                <div
                  key={sIdx}
                  className={`flex gap-2 items-center p-1 rounded-lg transition-colors ${set.completed ? 'bg-emerald-950/20' : ''}`}
                >
                  <div className="w-6 text-center text-xs font-bold text-neutral-500 font-mono shrink-0">
                    {set.set}
                  </div>

                  {(ex.tracking_fields || []).map((f: string) => {
                    const key = FIELD_KEYS[f];
                    return (
                      <div key={f} className="flex-1 min-w-0">
                        <input
                          type="number"
                          step="any"
                          placeholder="-"
                          value={set[key] || ''}
                          onChange={(e) =>
                            updateSet(ex.id, sIdx, key, e.target.value)
                          }
                          className={`${inputClass} ${set.completed ? 'opacity-50' : ''} ${key === 'rir' ? 'text-indigo-300 placeholder:text-neutral-700' : ''}`}
                        />
                      </div>
                    );
                  })}

                  <button
                    onClick={() => toggleSetComplete(ex.id, sIdx)}
                    className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg transition-colors ${set.completed ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}`}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => addSet(ex.id)}
                className="w-full py-2 mt-2 border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-lg text-indigo-400 font-mono text-xs transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Set
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent flex justify-center gap-3 pointer-events-none z-40">
        <button
          onClick={() => setSelectorType('strength')}
          className="pointer-events-auto bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-indigo-400 font-mono text-xs font-bold py-3 px-6 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-2"
        >
          <Dumbbell size={16} /> Add Lifting
        </button>
        <button
          onClick={() => setSelectorType('cardio')}
          className="pointer-events-auto bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 hover:text-white text-rose-400 font-mono text-xs font-bold py-3 px-6 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-2"
        >
          <Activity size={16} /> Add Cardio
        </button>
      </div>

      <ExerciseSelectorModal
        isOpen={selectorType !== null}
        type={selectorType}
        onClose={() => setSelectorType(null)}
        onSelect={handleExerciseSelected}
      />
    </div>
  );
}
