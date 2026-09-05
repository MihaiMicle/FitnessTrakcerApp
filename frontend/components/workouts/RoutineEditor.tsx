'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Activity, Dumbbell } from 'lucide-react';
import ExerciseSelectorModal from './ExerciseSelectorModal';
import RoutineEditorHeader from './routine-editor/RoutineEditorHeader';
import RoutineExerciseCard from './routine-editor/RoutineExerciseCard';
import { useExerciseReorder } from './live/useExerciseReorder';
import type { SetType } from '@/lib/workouts/constants';
import { withExerciseRest, withSetRest } from '@/lib/workouts/rest';
import {
  addSetTo,
  createExerciseEntry,
  isInSuperset,
  removeExerciseFrom,
  removeSetFrom,
  toggleSupersetAt,
  updateExerciseNotesIn,
  updateSetField,
  updateSetTypeIn,
  type WorkoutExercise,
} from '@/lib/workouts/sets';
import type { Visibility } from '@/types/social';

interface OpenSetMenu {
  exId: string;
  sIdx: number;
}

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
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    template?.exercises || [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(
    template?.visibility || 'followers',
  );
  const [selectorType, setSelectorType] = useState<
    'strength' | 'cardio' | null
  >(null);
  const [openSetMenu, setOpenSetMenu] = useState<OpenSetMenu | null>(null);

  const reorder = useExerciseReorder(exercises, setExercises);

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

      const payload = { name, exercises, visibility };
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
    setExercises([...exercises, createExerciseEntry(selectedEx)]);
    setSelectorType(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col absolute inset-0 z-[100]">
      <RoutineEditorHeader
        name={name}
        onNameChange={setName}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        isReordering={reorder.isReordering}
        onToggleReordering={reorder.toggleReordering}
        onClose={onClose}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-32 content-start overflow-y-auto">
        {exercises.map((ex, index) => (
          <RoutineExerciseCard
            key={ex.id}
            exercise={ex}
            index={index}
            isSuperset={isInSuperset(exercises, index)}
            isPrevInSameSuperset={
              index > 0 && exercises[index - 1]?.superset_id === ex.superset_id
            }
            isReordering={reorder.isReordering}
            isDragged={reorder.draggedIndex === index}
            isDragOver={reorder.dragOverIndex === index}
            openSetMenu={openSetMenu}
            onDragStart={(e) => reorder.onDragStart(e, index)}
            onDragOver={(e) => reorder.onDragOver(e, index)}
            onDrop={(e) => reorder.onDrop(e, index)}
            onDragEnd={reorder.onDragEnd}
            onToggleSuperset={() =>
              setExercises((prev) => toggleSupersetAt(prev, index))
            }
            onRemoveExercise={() =>
              setExercises((prev) => removeExerciseFrom(prev, ex.id))
            }
            onChangeNotes={(notes) =>
              setExercises((prev) => updateExerciseNotesIn(prev, ex.id, notes))
            }
            onChangeExerciseRest={(setType: SetType, seconds) =>
              setExercises((prev) => withExerciseRest(prev, ex.id, setType, seconds))
            }
            onChangeSetRest={(setIndex, seconds) =>
              setExercises((prev) => withSetRest(prev, ex.id, setIndex, seconds))
            }
            onAddSet={() => setExercises((prev) => addSetTo(prev, ex.id))}
            onRemoveSet={(setIndex) =>
              setExercises((prev) => removeSetFrom(prev, ex.id, setIndex))
            }
            onUpdateSet={(setIndex, field, value) =>
              setExercises((prev) =>
                updateSetField(prev, ex.id, setIndex, field, value),
              )
            }
            onUpdateSetType={(setIndex, type) =>
              setExercises((prev) => updateSetTypeIn(prev, ex.id, setIndex, type))
            }
            onOpenSetMenu={(setIndex) =>
              setOpenSetMenu(
                setIndex === null ? null : { exId: ex.id, sIdx: setIndex },
              )
            }
          />
        ))}
      </div>

      {/* Floating action buttons */}
      {!reorder.isReordering && (
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
