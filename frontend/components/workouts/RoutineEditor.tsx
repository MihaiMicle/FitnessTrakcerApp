'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Dumbbell,
  Activity,
  Save,
  X,
  GripVertical,
  Link,
  Unlink,
} from 'lucide-react';
import ExerciseSelectorModal from './ExerciseSelectorModal';
import SetTypeMenu from './SetTypeMenu';
import RestSettingsButton from './RestSettingsButton';
import type { SetType } from '@/lib/workouts/constants';
import { withExerciseRest, withSetRest } from '@/lib/workouts/rest';

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

export default function RoutineEditor({
  template,
  onClose,
  onSaved,
}: {
  template?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name || 'New Routine');
  const [exercises, setExercises] = useState<any[]>(template?.exercises || []);
  const [isSaving, setIsSaving] = useState(false);
  const [selectorType, setSelectorType] = useState<
    'strength' | 'cardio' | null
  >(null);

  // Reorder Mode States
  const [isReordering, setIsReordering] = useState(false);
  const [draggedExIndex, setDraggedExIndex] = useState<number | null>(null);
  const [dragOverExIndex, setDragOverExIndex] = useState<number | null>(null);

  const [openSetMenu, setOpenSetMenu] = useState<{
    exId: string;
    sIdx: number;
  } | null>(null);

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

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Routine name is required');
    if (exercises.length === 0) return toast.error('Add at least one exercise');
    setIsSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const payload = { name, exercises };
      const url = template
        ? `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates/${template.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates`;

      const res = await fetch(url, {
        method: template ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Routine ${template ? 'updated' : 'created'}!`);
        onSaved();
      } else {
        toast.error('Failed to save routine');
      }
    } catch (err) {
      toast.error('Network error occurred');
    } finally {
      setIsSaving(false);
    }
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

  const addSet = (exId: string) => {
    setExercises(
      exercises.map((ex) => {
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

  const updateSetType = (exId: string, setIndex: number, type: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], set_type: type };
        return { ...ex, sets: newSets };
      }),
    );
  };

  /* Rest times saved with the routine, so a workout starts already configured */
  const setExerciseRest = (
    exId: string,
    setType: SetType,
    seconds: number | null,
  ) => setExercises((prev) => withExerciseRest(prev, exId, setType, seconds));

  const setSetRest = (exId: string, setIndex: number, seconds: number | null) =>
    setExercises((prev) => withSetRest(prev, exId, setIndex, seconds));

  const removeSet = (exId: string, setIndex: number) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const newSets = ex.sets.filter((_: any, i: number) => i !== setIndex);
        return {
          ...ex,
          sets: newSets.map((s: any, i: number) => ({ ...s, set: i + 1 })),
        };
      }),
    );
  };

  const removeExercise = (exId: string) =>
    setExercises(exercises.filter((ex) => ex.id !== exId));

  const toggleSuperset = (index: number) => {
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
        if (isPrevOrphaned)
          newEx[index - 1] = { ...previous, superset_id: null };
      } else {
        const setId = previous.superset_id || `ss-${Date.now()}`;
        newEx[index - 1] = { ...previous, superset_id: setId };
        newEx[index] = { ...current, superset_id: setId };
      }
      return newEx;
    });
  };

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
    movedItem.superset_id = null; // Clear superset if moved
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col absolute inset-0 z-[100]">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 p-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-white transition-colors shrink-0"
            >
              <ChevronLeft size={28} />
            </button>
            <div className="flex flex-col flex-1 min-w-0">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent text-lg sm:text-xl font-bold text-white outline-none focus:border-b focus:border-indigo-500 placeholder:text-neutral-600 w-full truncate"
                placeholder="Routine Name"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 font-mono text-[10px] sm:text-xs mt-0.5">
                  Template Builder
                </span>
                <button
                  onClick={() => setIsReordering(!isReordering)}
                  className={`ml-2 px-2 py-0.5 rounded text-[10px] sm:text-xs transition-colors font-mono ${isReordering ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-neutral-300 hover:text-white'}`}
                >
                  {isReordering ? 'Done' : 'Reorder'}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 sm:px-6 rounded-lg transition-colors font-mono text-xs active:scale-95 ml-3 flex items-center gap-2"
          >
            <Save size={16} /> <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-32 content-start overflow-y-auto">
        {exercises.map((ex, index) => {
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
                    {(ex.tracking_fields || []).map((f: string) => (
                      <span key={f} className="flex-1 text-center truncate">
                        {FIELD_LABELS[f] || f}
                      </span>
                    ))}
                    <span className="w-8 shrink-0"></span>
                  </div>

                  {ex.sets.map((set: any, sIdx: number) => {
                    const isMenuOpen =
                      openSetMenu?.exId === ex.id && openSetMenu?.sIdx === sIdx;

                    return (
                      <div
                        key={sIdx}
                        className={`flex gap-2 items-center p-1 rounded-lg transition-colors relative ${isMenuOpen ? 'z-50' : 'z-10'}`}
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

                        {(ex.tracking_fields || []).map((f: string) => {
                          const key = FIELD_KEYS[f];
                          return (
                            <div key={f} className="flex-1 min-w-0">
                              <input
                                type="number"
                                step="any"
                                placeholder="target"
                                value={set[key] || ''}
                                onChange={(e) =>
                                  updateSet(ex.id, sIdx, key, e.target.value)
                                }
                                className={inputClass}
                              />
                            </div>
                          );
                        })}

                        <button
                          onClick={() => removeSet(ex.id, sIdx)}
                          disabled={ex.sets.length === 1}
                          className="w-8 h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:text-rose-500 transition-colors disabled:opacity-0"
                        >
                          <X size={16} />
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

      {/* Floating action buttons */}
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

      <ExerciseSelectorModal
        isOpen={selectorType !== null}
        type={selectorType}
        onClose={() => setSelectorType(null)}
        onSelect={handleExerciseSelected}
      />
    </div>
  );
}
