'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/shared/ConfirmModal';
import CopyMealModal from '@/components/shared/CopyMealModal';
import { useConfirm } from '@/components/shared/useConfirm';
import { buildDiaryEntryPayload } from '@/lib/nutrition/mealForm';
import { supabase } from '@/lib/supabase';
import MealGroupHeader from './MealGroupHeader';
import MealGroupItem from './MealGroupItem';
import SaveMealPrompt from './SaveMealPrompt';
import { useMealCopy } from './hooks/useMealCopy';
import { useMealDragDrop } from './hooks/useMealDragDrop';

interface MealGroupProps {
  label: string;
  mealType: string;
  selectedDate: string;
  isToday: boolean;
  meals: any[];
  onDeleteMeal: (id: string) => Promise<void> | void;
  onAddMeal: (payload: any) => Promise<any>;
  onAddMealClick: () => void;
  onEditMeal?: (meal: any) => void;
}

export default function MealGroup({
  label,
  mealType,
  selectedDate,
  meals = [],
  onDeleteMeal,
  onAddMeal,
  onAddMealClick,
  onEditMeal,
}: MealGroupProps) {
  // Local copy so drag-reordering can be reflected before the server catches up.
  const [localMeals, setLocalMeals] = useState<any[]>([]);
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const confirm = useConfirm();
  const copy = useMealCopy({
    mealType,
    label,
    selectedDate,
    meals: localMeals,
    onAddMeal,
  });
  const drag = useMealDragDrop({
    mealType,
    label,
    meals: localMeals,
    setMeals: setLocalMeals,
    onAddMeal,
    onDeleteMeal,
  });

  // Resync only when the set of ids changes, so local reordering survives.
  useEffect(() => {
    const idsOf = (list: any[]) =>
      list
        .map((m) => m.id)
        .sort()
        .join(',');
    if (idsOf(localMeals) !== idsOf(meals)) setLocalMeals(meals);
  }, [meals, localMeals]);

  const totals = useMemo(() => {
    const sum = (field: string) =>
      Math.round(
        localMeals.reduce((acc, m) => acc + (Number(m[field]) || 0), 0),
      );
    return {
      calories: sum('calories'),
      protein: sum('protein_g'),
      carbs: sum('carbs_g'),
      fats: sum('fats_g'),
    };
  }, [localMeals]);

  const exitManageMode = () => {
    setIsManageMode(false);
    setSelectedIds([]);
  };

  const toggleSelection = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );

  const handleSelectAll = () =>
    setSelectedIds((prev) =>
      prev.length === localMeals.length ? [] : localMeals.map((m) => m.id),
    );

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    confirm.ask({
      title: 'DELETE ITEMS',
      message: `Are you sure you want to delete ${selectedIds.length} items from your diary? This cannot be undone.`,
      confirmText: 'Delete Items',
      isDestructive: true,
      action: async () => {
        toast.loading(`Deleting ${selectedIds.length} items...`, {
          id: 'bulkDelete',
        });
        try {
          for (const id of selectedIds) await onDeleteMeal(id);
          toast.success('Items deleted successfully!', { id: 'bulkDelete' });
        } catch {
          toast.error('Failed to delete some items.', { id: 'bulkDelete' });
        }
        exitManageMode();
      },
    });
  };

  const handleSaveAsMeal = () => {
    if (localMeals.length === 0) {
      toast.error('No foods logged here yet!');
      return;
    }
    setBundleName(`My ${label}`);
    setIsPromptOpen(true);
  };

  const confirmSaveBundle = async () => {
    if (!bundleName.trim()) {
      toast.error('Please enter a name for the bundle.');
      return;
    }
    setIsSaving(true);
    toast.loading('Saving bundle...', { id: 'saveMeal' });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.from('saved_meals').insert({
        user_id: session.user.id,
        name: bundleName.trim(),
        foods: localMeals.map((m) => buildDiaryEntryPayload(m, mealType)),
      });
      if (error) throw error;

      toast.success('Bundle saved successfully!', { id: 'saveMeal' });
      setIsPromptOpen(false);
    } catch {
      toast.error('Failed to save meal', { id: 'saveMeal' });
    } finally {
      setIsSaving(false);
    }
  };

  const dropIndicatorFor = (index: number) =>
    drag.dragOverIndex === index && drag.draggedIndex !== index
      ? drag.dropPosition
      : null;

  return (
    <>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm h-full flex flex-col relative">
        <MealGroupHeader
          label={label}
          itemCount={localMeals.length}
          totals={totals}
          isManageMode={isManageMode}
          selectedCount={selectedIds.length}
          allSelected={selectedIds.length === localMeals.length}
          onEnterManageMode={() => setIsManageMode(true)}
          onExitManageMode={exitManageMode}
          onSelectAll={handleSelectAll}
          onBulkDelete={handleBulkDelete}
          onAddMealClick={onAddMealClick}
          onSaveAsMeal={handleSaveAsMeal}
          onOpenCopy={copy.open}
        />

        <div
          className={`flex-1 space-y-2 min-h-[60px] pb-4 relative transition-colors rounded-lg -mx-1 px-1 ${
            drag.isOverContainer && localMeals.length === 0
              ? 'bg-emerald-950/20 border border-dashed border-emerald-500/30'
              : ''
          }`}
          {...drag.containerProps}
        >
          {localMeals.length === 0 ? (
            <p className="text-[11px] sm:text-xs text-neutral-600 font-mono italic pointer-events-none mt-2">
              No foods logged for {(label || '').toLowerCase()} yet.
            </p>
          ) : (
            localMeals.map((meal, idx) => (
              <MealGroupItem
                key={meal.id}
                meal={meal}
                index={idx}
                isManageMode={isManageMode}
                isSelected={selectedIds.includes(meal.id)}
                isDragging={drag.draggedIndex === idx}
                dropIndicator={dropIndicatorFor(idx)}
                isEditable={!!onEditMeal}
                onClick={() => {
                  if (isManageMode) toggleSelection(meal.id);
                  else onEditMeal?.(meal);
                }}
                onDelete={() => onDeleteMeal(meal.id)}
                onDragStart={(e) => drag.onDragStart(e, idx, meal)}
                onDragOver={(e) => drag.onDragOver(e, idx)}
                onDrop={(e) => drag.onDrop(e, idx)}
                onDragEnd={drag.clearDragState}
              />
            ))
          )}
        </div>
      </div>

      <CopyMealModal
        isOpen={copy.isOpen}
        mode={copy.mode}
        onClose={copy.close}
        selectedDate={selectedDate}
        selectedCopyDate={copy.copyDate}
        setSelectedCopyDate={copy.setCopyDate}
        selectedCopyMeal={copy.copyMeal}
        setSelectedCopyMeal={copy.setCopyMeal}
        onExecuteCopy={copy.execute}
      />

      <SaveMealPrompt
        isOpen={isPromptOpen}
        label={label}
        value={bundleName}
        onChange={setBundleName}
        isSaving={isSaving}
        onCancel={() => setIsPromptOpen(false)}
        onConfirm={confirmSaveBundle}
      />

      <ConfirmModal {...confirm.modalProps} />
    </>
  );
}
