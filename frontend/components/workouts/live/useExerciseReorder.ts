'use client';

import { useState } from 'react';
import { reorderExercises, type WorkoutExercise } from '@/lib/workouts/sets';

/* Drag state for the reorder mode. The move itself lives in lib/workouts/sets
   so the superset rules stay in one place */
export function useExerciseReorder(
  exercises: WorkoutExercise[],
  setExercises: (next: WorkoutExercise[]) => void,
) {
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const reset = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return {
    isReordering,
    toggleReordering: () => setIsReordering((prev) => !prev),
    draggedIndex,
    dragOverIndex,
    onDragStart: (e: React.DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    },
    onDragOver: (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex !== index) setDragOverIndex(index);
    },
    onDrop: (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== targetIndex) {
        setExercises(reorderExercises(exercises, draggedIndex, targetIndex));
      }
      reset();
    },
    onDragEnd: reset,
  };
}
