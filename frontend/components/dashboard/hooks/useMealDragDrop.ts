'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { buildDiaryEntryPayload } from '@/lib/nutrition/mealForm';

type DropPosition = 'above' | 'below' | null;

interface UseMealDragDropOptions {
  mealType: string;
  label: string;
  meals: any[];
  setMeals: (meals: any[]) => void;
  onAddMeal: (payload: any) => Promise<any>;
  onDeleteMeal: (id: string) => Promise<void> | void;
}

/**
  Drag-and-drop for meal rows: reordering within a section, and moving an item
  in from another section (which is a delete + re-add on the server)
 */
export function useMealDragDrop({
  mealType,
  label,
  meals,
  setMeals,
  onAddMeal,
  onDeleteMeal,
}: UseMealDragDropOptions) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [isOverContainer, setIsOverContainer] = useState(false);

  const clearDragState = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  }, []);

  const onDragStart = useCallback(
    (e: React.DragEvent, index: number, meal: any) => {
      e.stopPropagation();
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify(meal));
      e.dataTransfer.setData('sourceMealType', mealType);
    },
    [mealType],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex === index) return;

      setDragOverIndex(index);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDropPosition(
        e.clientY - rect.top > rect.height / 2 ? 'below' : 'above',
      );
    },
    [draggedIndex],
  );

  /* Moves an item dragged in from a different meal section */
  const moveFromOtherSection = useCallback(
    async (foodItem: any, insertIndex: number) => {
      toast.loading(`Moving to ${label}...`, { id: 'moveMeal' });
      try {
        const payload = buildDiaryEntryPayload(foodItem, mealType);
        const optimistic = [...meals];
        optimistic.splice(insertIndex, 0, {
          ...foodItem,
          ...payload,
          id: 'temp-' + Date.now(),
        });
        setMeals(optimistic);

        await onDeleteMeal(foodItem.id);
        await onAddMeal(payload);
        toast.success('Moved successfully!', { id: 'moveMeal' });
      } catch {
        toast.error('Failed to move item', { id: 'moveMeal' });
      }
    },
    [label, mealType, meals, setMeals, onAddMeal, onDeleteMeal],
  );

  /* Reorders within this section */
  const reorder = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const next = [...meals];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setMeals(next);
    },
    [meals, setMeals],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent, index?: number) => {
      e.preventDefault();
      e.stopPropagation();

      const sourceMealType = e.dataTransfer.getData('sourceMealType');
      const foodDataStr = e.dataTransfer.getData('application/json');

      // Snapshot before clearing, since the handlers below still need it
      const overIndex = dragOverIndex;
      const position = dropPosition;
      const fromIndex = draggedIndex;

      clearDragState();
      setIsOverContainer(false);

      if (!sourceMealType || !foodDataStr) return;

      if (sourceMealType !== mealType) {
        let insertIndex = overIndex !== null ? overIndex : (index ?? meals.length);
        if (position === 'below') insertIndex += 1;
        await moveFromOtherSection(JSON.parse(foodDataStr), insertIndex);
        return;
      }

      if (fromIndex === null || index === undefined) return;

      let target = overIndex !== null ? overIndex : index;
      if (position === 'below') target += 1;
      if (fromIndex < target) target -= 1;
      reorder(fromIndex, target);
    },
    [
      dragOverIndex,
      dropPosition,
      draggedIndex,
      clearDragState,
      mealType,
      meals.length,
      moveFromOtherSection,
      reorder,
    ],
  );

  /* Props for the container that accepts drops onto empty space */
  const containerProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      setIsOverContainer(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.stopPropagation();
      setIsOverContainer(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOverContainer(false);
      onDrop(e, meals.length);
    },
  };

  return {
    draggedIndex,
    dragOverIndex,
    dropPosition,
    isOverContainer,
    onDragStart,
    onDragOver,
    onDrop,
    clearDragState,
    containerProps,
  };
}
