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
  GripVertical,
  X,
  Link,
  Unlink,
} from 'lucide-react';
import ExerciseSelectorModal from './ExerciseSelectorModal';
import SetTypeMenu from './SetTypeMenu';
import RestSettingsButton from './RestSettingsButton';
import RestTimerOverlay from './RestTimerOverlay';
import SyncStatusBadge from './SyncStatusBadge';
import { useWorkout } from '@/lib/context/WorkoutContext';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { useConfirm } from '@/components/shared/useConfirm';

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

const formatPrevious = (prevSet: any, trackingFields: string[]) => {
  if (!prevSet) return '-';
  const parts = [];
  if (trackingFields.includes('weight') && prevSet.weight_kg != null)
    parts.push(`${prevSet.weight_kg}kg`);
  if (trackingFields.includes('reps') && prevSet.reps != null)
    parts.push(parts.length > 0 ? `x ${prevSet.reps}` : `${prevSet.reps} reps`);
  if (trackingFields.includes('distance') && prevSet.distance_km != null)
    parts.push(`${prevSet.distance_km}km`);
  if (trackingFields.includes('time') && prevSet.duration_minutes != null)
    parts.push(`in ${prevSet.duration_minutes}m`);
  return parts.join(' ') || '-';
};

export default function LiveWorkout() {
  const {
    activeSession,
    isMinimized,
    workoutName,
    setWorkoutName,
    exercises,
    setExercises,
    previousSets,
    formattedTime,
    elapsed,
    isTimerPaused,
    toggleTimer,
    overrideTimer,
    minimizeWorkout,
    clearWorkout,
    cancelWorkout,
    addSet,
    updateSet,
    toggleSetComplete,
    updateSetType,
    removeSet,
    removeExercise,
    toggleSuperset,
    saveSession,
    setExerciseRest,
    setSetRest,
  } = useWorkout();

  const [isSaving, setIsSaving] = useState(false);
  const [selectorType, setSelectorType] = useState<
    'strength' | 'cardio' | null
  >(null);

  const [isReordering, setIsReordering] = useState(false);
  const [draggedExIndex, setDraggedExIndex] = useState<number | null>(null);
  const [dragOverExIndex, setDragOverExIndex] = useState<number | null>(null);

  const [templates, setTemplates] = useState<any[]>([]);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [openSetMenu, setOpenSetMenu] = useState<{
    exId: string;
    sIdx: number;
  } | null>(null);

  const confirm = useConfirm();

  const [showTimerModal, setShowTimerModal] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest && target.closest('.set-menu-container')) return;
      setOpenSetMenu(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (res.ok) setTemplates(await res.json());
    };
    fetchTemplates();
  }, []);

  if (!activeSession || isMinimized) return null;

  const matchedTemplate = templates.find((t) => t.name === workoutName);

  const saveAsRoutine = async (
    templateIdToUpdate?: string,
  ): Promise<boolean> => {
    if (exercises.length === 0) {
      toast.error('Add exercises before saving a routine');
      return false;
    }
    toast.loading('Saving routine...', { id: 'routine' });
    setIsSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return false;

      const cleanExercises = exercises.map((ex: any) => ({
        ...ex,
        sets: ex.sets.map((s: any) => ({ ...s, completed: false })),
      }));

      const url = templateIdToUpdate
        ? `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates/${templateIdToUpdate}`
        : `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates`;

      const res = await fetch(url, {
        method: templateIdToUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: workoutName, exercises: cleanExercises }),
      });

      if (res.ok) {
        toast.success(`Routine '${workoutName}' saved!`, { id: 'routine' });
        return true;
      } else {
        toast.error('Failed to save routine', { id: 'routine' });
        return false;
      }
    } catch (err) {
      toast.error('Network error', { id: 'routine' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishWorkout = async (
    action: 'update' | 'save_new' | 'skip',
  ) => {
    /*
     * The routine is a convenience and still needs the network, the session is
     * the record of the work done. A failed routine save must never block the
     * workout from being finished, or an offline user is stuck on this modal
     */
    if (action === 'update' && matchedTemplate) {
      await saveAsRoutine(matchedTemplate.id);
    } else if (action === 'save_new') {
      await saveAsRoutine();
    }
    await saveSession('completed');
    toast.success('Workout completed!');
    setShowFinishModal(false);
    clearWorkout();
  };

  const handleFinishClick = async () => {
    if (activeSession.status === 'completed') {
      setIsSaving(true);
      await saveSession('completed');
      toast.success('Changes saved!');
      setIsSaving(false);
      clearWorkout();
    } else {
      setShowFinishModal(true);
    }
  };

  const handleBack = () => {
    saveSession('in_progress');
    minimizeWorkout();
  };

  const handleExerciseSelected = (selectedEx: any) => {
    const trackingFields =
      selectedEx.tracking_fields ||
      (selectedEx.type === 'strength' ? ['weight', 'reps', 'rir'] : ['time']);
    const newEx = {
      id: 'ex-' + Date.now(),
      name: selectedEx.name,
      type: selectedEx.type,
      tracking_fields: trackingFields,
      sets: [{ set: 1, set_type: 'working', completed: false }],
    };
    setExercises([...exercises, newEx]);
    setSelectorType(null);
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedExIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedExIndex === index) return;
    setDragOverExIndex(index);
  };
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedExIndex === null || draggedExIndex === targetIndex) {
      setDraggedExIndex(null);
      setDragOverExIndex(null);
      return;
    }
    const newExercises = [...exercises];
    const [movedItem] = newExercises.splice(draggedExIndex, 1);

    // Break superset link if moving to prevent weird visual bugs
    movedItem.superset_id = null;

    newExercises.splice(targetIndex, 0, movedItem);
    setExercises(newExercises);
    setDraggedExIndex(null);
    setDragOverExIndex(null);
  };
  const handleDragEnd = () => {
    setDraggedExIndex(null);
    setDragOverExIndex(null);
  };

  const inputClass =
    'bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono min-w-0 text-center w-full';

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-neutral-950 text-neutral-100 flex flex-col overflow-y-auto">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 p-4 sm:px-6">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
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
                <div
                  onClick={() => setShowTimerModal(true)}
                  className="flex items-center gap-1.5 text-indigo-400 font-mono text-[10px] sm:text-xs mt-0.5 cursor-pointer hover:text-indigo-300 transition-colors"
                >
                  <Clock size={12} /> {formattedTime}
                  {isTimerPaused && (
                    <span className="text-rose-500 ml-1">(Paused)</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsReordering(!isReordering);
                    }}
                    className={`ml-2 px-2 py-0.5 rounded transition-colors ${isReordering ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-neutral-300 hover:text-white'}`}
                  >
                    {isReordering ? 'Done' : 'Reorder'}
                  </button>
                  <SyncStatusBadge compact />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-3 shrink-0">
              <button
                onClick={() => {
                  confirm.ask({
                    title: 'CANCEL WORKOUT',
                    message:
                      'Are you sure you want to cancel this workout? All progress will be lost.',
                    confirmText: 'Yes, Cancel',
                    isDestructive: true,
                    action: async () => {
                      await cancelWorkout();
                    },
                  });
                }}
                title="Cancel Workout"
                className="bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-500 p-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center border border-neutral-700 hover:border-rose-500/30 active:scale-95"
              >
                <X size={18} />
                <span className="hidden sm:inline text-xs font-mono ml-2 font-bold">
                  Cancel
                </span>
              </button>

              <button
                onClick={() =>
                  matchedTemplate
                    ? saveAsRoutine(matchedTemplate.id)
                    : saveAsRoutine()
                }
                title="Save as Routine"
                className="bg-neutral-800 hover:bg-neutral-700 text-indigo-400 p-2 sm:px-3 rounded-lg transition-colors flex items-center justify-center border border-neutral-700 active:scale-95"
              >
                <BookmarkPlus size={18} />
                <span className="hidden sm:inline text-xs font-mono ml-2 font-bold">
                  Save Routine
                </span>
              </button>
              <button
                onClick={handleFinishClick}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 sm:px-6 rounded-lg transition-colors font-mono text-xs active:scale-95"
              >
                {activeSession.status === 'completed'
                  ? 'Save Changes'
                  : 'Finish'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-32 content-start">
          {exercises.map((ex: any, index: number) => {
            const isSuperset =
              ex.superset_id &&
              ((index > 0 &&
                exercises[index - 1].superset_id === ex.superset_id) ||
                (index < exercises.length - 1 &&
                  exercises[index + 1].superset_id === ex.superset_id));

            return (
              <div
                key={ex.id}
                draggable={isReordering}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-neutral-900 border rounded-xl p-4 shadow-sm transition-colors ${
                  isReordering
                    ? 'col-span-1 md:col-span-2 cursor-grab active:cursor-grabbing'
                    : isSuperset
                      ? 'col-span-1'
                      : 'col-span-1 md:col-span-2'
                } ${draggedExIndex === index ? 'opacity-50 border-indigo-500' : 'border-neutral-800'} ${dragOverExIndex === index ? 'border-indigo-500 bg-indigo-950/20' : ''}`}
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {isReordering ? (
                      <div className="text-neutral-500">
                        <GripVertical size={20} />
                      </div>
                    ) : (
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSuperset ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}
                      >
                        {isSuperset ? 'S' : index + 1}
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-indigo-100 truncate">
                      {ex.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isReordering && (
                      <RestSettingsButton
                        exercise={ex}
                        onChange={(setType, seconds) =>
                          setExerciseRest(ex.id, setType, seconds)
                        }
                      />
                    )}
                    {index > 0 && !isReordering && (
                      <button
                        onClick={() => toggleSuperset(index)}
                        className={`p-2 transition-colors shrink-0 ${isSuperset && exercises[index - 1]?.superset_id === ex.superset_id ? 'text-indigo-400' : 'text-neutral-600 hover:text-indigo-400'}`}
                        title="Superset with previous"
                      >
                        {isSuperset &&
                        exercises[index - 1]?.superset_id === ex.superset_id ? (
                          <Unlink size={16} />
                        ) : (
                          <Link size={16} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => removeExercise(ex.id)}
                      className="text-neutral-600 hover:text-rose-500 p-2 transition-colors shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {!isReordering && (
                  <div className="space-y-2">
                    <div className="flex gap-2 px-1 text-[10px] text-neutral-500 font-mono uppercase tracking-wider items-center">
                      <span className="w-6 text-center shrink-0">Set</span>
                      <span className="w-24 text-center shrink-0">
                        Previous
                      </span>
                      {(ex.tracking_fields || []).map((f: string) => (
                        <span key={f} className="flex-1 text-center truncate">
                          {FIELD_LABELS[f] || f}
                        </span>
                      ))}
                      <span className="w-8 shrink-0"></span>
                      <span className="w-10 text-center shrink-0">
                        <Check size={14} className="mx-auto" />
                      </span>
                    </div>

                    {ex.sets.map((set: any, sIdx: number) => {
                      const isMenuOpen =
                        openSetMenu?.exId === ex.id &&
                        openSetMenu?.sIdx === sIdx;

                      return (
                        <div
                          key={sIdx}
                          className={`flex gap-2 items-center p-1 rounded-lg transition-colors relative ${set.completed ? 'bg-emerald-950/20' : ''} ${isMenuOpen ? 'z-50' : 'z-10'}`}
                        >
                          <SetTypeMenu
                            exercise={ex}
                            set={set}
                            setIndex={sIdx}
                            isOpen={isMenuOpen}
                            onToggle={() =>
                              setOpenSetMenu(
                                isMenuOpen ? null : { exId: ex.id, sIdx },
                              )
                            }
                            onSelectType={(type) =>
                              updateSetType(ex.id, sIdx, type)
                            }
                            onChangeRest={(seconds) =>
                              setSetRest(ex.id, sIdx, seconds)
                            }
                            onClose={() => setOpenSetMenu(null)}
                          />

                          <div className="w-24 text-center text-xs text-neutral-500 font-mono shrink-0 truncate">
                            {formatPrevious(
                              previousSets[ex.name]?.[sIdx],
                              ex.tracking_fields,
                            )}
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
                            onClick={() => removeSet(ex.id, sIdx)}
                            disabled={ex.sets.length === 1}
                            className="w-8 h-10 shrink-0 flex items-center justify-center text-neutral-600 hover:text-rose-500 transition-colors disabled:opacity-0"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => toggleSetComplete(ex.id, sIdx)}
                            className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg transition-colors ${set.completed ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}`}
                          >
                            <Check size={16} strokeWidth={3} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => addSet(ex.id)}
                      className="w-full py-2 mt-2 border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-lg text-indigo-400 font-mono text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={14} /> Add Set
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Action Buttons */}
        {!isReordering && (
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
        )}

        {/* Rest countdown, shown while the live page is open */}
        <RestTimerOverlay />

        <ExerciseSelectorModal
          isOpen={selectorType !== null}
          type={selectorType}
          onClose={() => setSelectorType(null)}
          onSelect={handleExerciseSelected}
        />

        {/* Routine Save / Finish Modal */}
        {showFinishModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 mx-auto flex items-center justify-center mb-4">
                  <Check size={24} className="text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Workout Complete!
                </h3>
                <p className="text-neutral-400 text-sm font-mono leading-relaxed">
                  {matchedTemplate
                    ? `You started this from your "${matchedTemplate.name}" routine. Would you like to update the routine with today's changes?`
                    : `Would you like to save this session as a reusable routine?`}
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                {matchedTemplate ? (
                  <>
                    <button
                      onClick={() => handleFinishWorkout('update')}
                      disabled={isSaving}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      Update "{matchedTemplate.name}"
                    </button>
                    <button
                      onClick={() => handleFinishWorkout('save_new')}
                      disabled={isSaving}
                      className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      Save as New Routine
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleFinishWorkout('save_new')}
                    disabled={isSaving}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Save as Routine
                  </button>
                )}
                <button
                  onClick={() => handleFinishWorkout('skip')}
                  disabled={isSaving}
                  className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50 border border-neutral-700"
                >
                  No, Just Finish
                </button>
                <button
                  onClick={() => setShowFinishModal(false)}
                  disabled={isSaving}
                  className="w-full py-3 px-4 bg-transparent text-neutral-500 hover:text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timer Adjustment Modal */}
        {showTimerModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Adjust Timer
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 font-mono mb-2 flex justify-between">
                    <span>Hours</span>
                    <span className="text-white">
                      {Math.floor(elapsed / 3600)}h
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={Math.floor(elapsed / 3600)}
                    onChange={(e) =>
                      overrideTimer(
                        Number(e.target.value) * 3600 + (elapsed % 3600),
                      )
                    }
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 font-mono mb-2 flex justify-between">
                    <span>Minutes</span>
                    <span className="text-white">
                      {Math.floor((elapsed % 3600) / 60)}m
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="59"
                    value={Math.floor((elapsed % 3600) / 60)}
                    onChange={(e) =>
                      overrideTimer(
                        elapsed -
                          (elapsed % 3600) +
                          Number(e.target.value) * 60 +
                          (elapsed % 60),
                      )
                    }
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    toggleTimer();
                    setShowTimerModal(false);
                  }}
                  className={`flex-1 py-3 font-bold rounded-xl font-mono text-xs transition-colors ${isTimerPaused ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
                >
                  {isTimerPaused ? 'Resume Timer' : 'Pause Timer'}
                </button>
                <button
                  onClick={() => setShowTimerModal(false)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl font-mono text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inject the actual modal component at the root of the fragment */}
      <ConfirmModal {...confirm.modalProps} />
    </>
  );
}
