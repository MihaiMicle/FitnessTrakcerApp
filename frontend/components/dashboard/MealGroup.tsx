'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/shared/ConfirmModal';
import CopyMealModal from '@/components/shared/CopyMealModal';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [copyModalConfig, setCopyModalConfig] = useState<{
    isOpen: boolean;
    mode: 'from' | 'to';
  }>({ isOpen: false, mode: 'from' });

  const [selectedCopyDate, setSelectedCopyDate] = useState('');
  const [selectedCopyMeal, setSelectedCopyMeal] = useState(mealType);

  const [localMeals, setLocalMeals] = useState<any[]>([]);
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(
    null,
  );
  const [isDragOverContainer, setIsDragOverContainer] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    const currentIds = localMeals
      .map((m) => m.id)
      .sort()
      .join(',');
    const newIds = meals
      .map((m) => m.id)
      .sort()
      .join(',');
    if (currentIds !== newIds) {
      setLocalMeals(meals);
    }
  }, [meals, localMeals]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const extractCleanPayload = (m: any, overrideMealType?: string) => ({
    meal_type: overrideMealType || mealType,
    food_name: m.food_name || m.name,
    brand: m.brand || '',
    serving_size: m.serving_size,
    serving_unit: m.serving_unit,
    calories: m.calories,
    protein_g: m.protein_g,
    carbs_g: m.carbs_g,
    fats_g: m.fats_g,
    saturated_fats_g: m.saturated_fats_g || 0,
    fiber_g: m.fiber_g || 0,
    sugar_g: m.sugar_g || 0,
    potassium_mg: m.potassium_mg || 0,
    sodium_mg: m.sodium_mg || 0,
    iron_mg: m.iron_mg || 0,
    vitamin_d_mcg: m.vitamin_d_mcg || 0,
    zinc_mg: m.zinc_mg || 0,
    magnesium_mg: m.magnesium_mg || 0,
    calcium_mg: m.calcium_mg || 0,
    cholesterol_mg: m.cholesterol_mg || 0,
  });

  const handleSaveAsMealClick = () => {
    setIsMenuOpen(false);
    if (!meals || meals.length === 0) {
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

      const cleanFoods = localMeals.map((m) => extractCleanPayload(m));
      const { error } = await supabase.from('saved_meals').insert({
        user_id: session.user.id,
        name: bundleName.trim(),
        foods: cleanFoods,
      });

      if (error) throw error;
      toast.success('Bundle saved successfully!', { id: 'saveMeal' });
      setIsPromptOpen(false);
    } catch (err: any) {
      toast.error('Failed to save meal', { id: 'saveMeal' });
    } finally {
      setIsSaving(false);
    }
  };

  const openCopyModal = (mode: 'from' | 'to') => {
    setIsMenuOpen(false);
    if (mode === 'to' && (!meals || meals.length === 0)) {
      toast.error('No foods to copy!');
      return;
    }
    const baseDate = new Date(selectedDate);
    baseDate.setDate(baseDate.getDate() + (mode === 'from' ? -1 : 1));
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');
    setSelectedCopyDate(`${year}-${month}-${day}`);
    setSelectedCopyMeal(mealType);
    setCopyModalConfig({ isOpen: true, mode });
  };

  const handleExecuteCopy = async () => {
    setCopyModalConfig({ ...copyModalConfig, isOpen: false });
    const { mode } = copyModalConfig;
    toast.loading(mode === 'from' ? `Fetching meals...` : `Copying meals...`, {
      id: 'copyMeal',
    });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      if (mode === 'from') {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/logs/${selectedCopyDate}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );
        if (res.status === 404) {
          toast.error(`No logs found for ${selectedCopyDate}.`, {
            id: 'copyMeal',
          });
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        const foodsToCopy = (data.meals || []).filter(
          (m: any) =>
            m.meal_type?.toLowerCase() === selectedCopyMeal.toLowerCase(),
        );

        if (foodsToCopy.length === 0) {
          toast.error(`No foods logged on ${selectedCopyDate}.`, {
            id: 'copyMeal',
          });
          return;
        }

        toast.loading(`Copying ${foodsToCopy.length} items...`, {
          id: 'copyMeal',
        });
        for (const food of foodsToCopy)
          await onAddMeal(extractCleanPayload(food));
        toast.success(`Copied into ${label}!`, { id: 'copyMeal' });
      } else {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/logs/${selectedCopyDate}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );

        for (const food of localMeals) {
          const cleanFood = extractCleanPayload(food, selectedCopyMeal);
          let res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/logs/${selectedCopyDate}/meals`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(cleanFood),
            },
          );

          if (res.status === 404 || res.status === 405) {
            res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meals`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ ...cleanFood, date: selectedCopyDate }),
            });
          }
          if (!res.ok) throw new Error(await res.text());
        }
        toast.success(`Copied to ${selectedCopyDate}!`, { id: 'copyMeal' });
      }
    } catch (err: any) {
      toast.error(`Failed: ${err.message || 'Could not copy meal'}`, {
        id: 'copyMeal',
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === localMeals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(localMeals.map((m) => m.id));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: 'DELETE ITEMS',
      message: `Are you sure you want to delete ${selectedIds.length} items from your diary? This cannot be undone.`,
      confirmText: 'Delete Items',
      isDestructive: true,
      action: async () => {
        toast.loading(`Deleting ${selectedIds.length} items...`, {
          id: 'bulkDelete',
        });
        try {
          for (const id of selectedIds) {
            await onDeleteMeal(id);
          }
          toast.success('Items deleted successfully!', { id: 'bulkDelete' });
        } catch (error) {
          toast.error('Failed to delete some items.', { id: 'bulkDelete' });
        }
        setSelectedIds([]);
        setIsManageMode(false);
        setConfirmConfig(null);
      },
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number, meal: any) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(meal));
    e.dataTransfer.setData('sourceMealType', mealType);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === index) return;
    setDragOverIndex(index);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    setDropPosition(relativeY > rect.height / 2 ? 'below' : 'above');
  };

  const handleDrop = async (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceMealType = e.dataTransfer.getData('sourceMealType');
    const foodDataStr = e.dataTransfer.getData('application/json');

    const finalDragOverIndex = dragOverIndex;
    const finalDropPosition = dropPosition;

    setDragOverIndex(null);
    setDropPosition(null);
    setDraggedIndex(null);
    setIsDragOverContainer(false);

    if (!sourceMealType || !foodDataStr) return;

    if (sourceMealType !== mealType) {
      const foodItem = JSON.parse(foodDataStr);
      toast.loading(`Moving to ${label}...`, { id: 'moveMeal' });
      try {
        let insertIndex =
          finalDragOverIndex !== null
            ? finalDragOverIndex
            : (index ?? localMeals.length);
        if (finalDropPosition === 'below') insertIndex += 1;

        const newLocalMeals = [...localMeals];
        const cleanFood = extractCleanPayload(foodItem, mealType);

        newLocalMeals.splice(insertIndex, 0, {
          ...foodItem,
          ...cleanFood,
          id: 'temp-' + Date.now(),
        });
        setLocalMeals(newLocalMeals);

        await onDeleteMeal(foodItem.id);
        await onAddMeal(cleanFood);
        toast.success('Moved successfully!', { id: 'moveMeal' });
      } catch (err) {
        toast.error('Failed to move item', { id: 'moveMeal' });
      }
    } else {
      if (draggedIndex === null || index === undefined) return;
      let newIndex = finalDragOverIndex !== null ? finalDragOverIndex : index;
      if (finalDropPosition === 'below') newIndex += 1;
      if (draggedIndex < newIndex) newIndex -= 1;

      if (draggedIndex !== newIndex) {
        const itemsCopy = [...localMeals];
        const [draggedItem] = itemsCopy.splice(draggedIndex, 1);
        itemsCopy.splice(newIndex, 0, draggedItem);
        setLocalMeals(itemsCopy);
      }
    }
  };

  const totalCalories = Math.round(
    localMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0),
  );
  const totalProtein = Math.round(
    localMeals.reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0),
  );
  const totalCarbs = Math.round(
    localMeals.reduce((sum, m) => sum + (Number(m.carbs_g) || 0), 0),
  );
  const totalFats = Math.round(
    localMeals.reduce((sum, m) => sum + (Number(m.fats_g) || 0), 0),
  );

  return (
    <>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm h-full flex flex-col relative">
        <div className="flex justify-between items-start sm:items-center mb-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base tracking-tight">
              {label}
              <span className="text-[10px] bg-neutral-950 px-2 py-0.5 rounded-full text-neutral-500 font-mono border border-neutral-800">
                {localMeals.length} items
              </span>
            </h3>
            {localMeals.length > 0 && (
              <div className="text-[10px] font-mono flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-neutral-200">{totalCalories} kcal</span>
                <span className="text-neutral-600 hidden sm:inline">|</span>
                <span className="text-blue-400">P: {totalProtein}g</span>
                <span className="text-amber-400">C: {totalCarbs}g</span>
                <span className="text-rose-400">F: {totalFats}g</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            {isManageMode ? (
              <>
                <button
                  onClick={handleSelectAll}
                  className="text-[10px] sm:text-xs font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white px-3 py-1.5 rounded transition-colors"
                >
                  {selectedIds.length === localMeals.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
                <button
                  onClick={() => {
                    setIsManageMode(false);
                    setSelectedIds([]);
                  }}
                  className="text-[10px] sm:text-xs font-mono font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white px-3 py-1.5 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDeleteClick}
                  disabled={selectedIds.length === 0}
                  className="text-[10px] sm:text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                >
                  Delete ({selectedIds.length})
                </button>
              </>
            ) : (
              <>
                {localMeals.length > 0 && (
                  <button
                    onClick={() => setIsManageMode(true)}
                    className="text-[10px] sm:text-xs font-mono font-medium bg-neutral-950 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white px-2.5 py-1 rounded transition-colors"
                  >
                    Manage
                  </button>
                )}
                <button
                  onClick={onAddMealClick}
                  className="text-[10px] sm:text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white px-2.5 py-1 rounded transition-colors active:scale-95"
                >
                  + Add
                </button>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="text-neutral-500 hover:text-white px-2 py-1 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="w-1 h-1 bg-current rounded-full"></span>
                    <span className="w-1 h-1 bg-current rounded-full"></span>
                    <span className="w-1 h-1 bg-current rounded-full"></span>
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col">
                      <button
                        onClick={handleSaveAsMealClick}
                        className="w-full text-left px-4 py-3 text-xs font-mono text-emerald-400 hover:bg-neutral-900 transition-colors border-b border-neutral-800"
                      >
                        + Save as a Meal
                      </button>
                      <button
                        onClick={() => openCopyModal('from')}
                        className="w-full flex justify-between items-center px-4 py-3 text-xs font-mono text-blue-400 hover:bg-neutral-900 transition-colors border-b border-neutral-800"
                      >
                        <span>« Copy From...</span>
                      </button>
                      <button
                        onClick={() => openCopyModal('to')}
                        className="w-full flex justify-between items-center px-4 py-3 text-xs font-mono text-purple-400 hover:bg-neutral-900 transition-colors"
                      >
                        <span>» Copy To...</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className={`flex-1 space-y-2 min-h-[60px] pb-4 relative transition-colors rounded-lg -mx-1 px-1 ${
            isDragOverContainer && localMeals.length === 0
              ? 'bg-emerald-950/20 border border-dashed border-emerald-500/30'
              : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            setIsDragOverContainer(true);
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            setIsDragOverContainer(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOverContainer(false);
            handleDrop(e, localMeals.length);
          }}
        >
          {localMeals.length === 0 ? (
            <p className="text-[11px] sm:text-xs text-neutral-600 font-mono italic pointer-events-none mt-2">
              No foods logged for {(label || '').toLowerCase()} yet.
            </p>
          ) : (
            localMeals.map((meal, idx) => (
              <div
                key={meal.id}
                draggable={!isManageMode}
                onDragStart={(e) => handleDragStart(e, idx, meal)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDrop(e, idx);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                  setDropPosition(null);
                }}
                onClick={() => {
                  if (isManageMode) toggleSelection(meal.id);
                  else if (onEditMeal) onEditMeal(meal);
                }}
                className={`group relative flex justify-between items-center p-2.5 rounded-lg border transition-all ${
                  isManageMode || onEditMeal ? 'cursor-pointer' : ''
                } ${
                  draggedIndex === idx
                    ? 'opacity-40 bg-emerald-950/30 border-emerald-500/50 border-dashed'
                    : 'bg-transparent border-transparent hover:bg-neutral-950 hover:border-neutral-800/80'
                }`}
              >
                {dragOverIndex === idx &&
                  dropPosition === 'above' &&
                  draggedIndex !== idx && (
                    <div className="absolute -top-1.5 left-0 right-0 h-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  )}
                {dragOverIndex === idx &&
                  dropPosition === 'below' &&
                  draggedIndex !== idx && (
                    <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-emerald-500 rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  )}

                <div className="flex items-center gap-3">
                  {isManageMode ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(meal.id)}
                      readOnly
                      className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-neutral-900 cursor-pointer accent-emerald-500 pointer-events-none"
                    />
                  ) : (
                    <div
                      className="cursor-grab active:cursor-grabbing text-neutral-700 hover:text-neutral-400 transition-colors py-2"
                      title="Drag to reorder"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="3" y1="15" x2="21" y2="15"></line>
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-xs sm:text-sm font-medium ${selectedIds.includes(meal.id) ? 'text-emerald-400' : 'text-neutral-200'} transition-colors`}
                      >
                        {meal.food_name || meal.name}
                      </p>
                      {meal.brand && (
                        <span className="text-[10px] text-neutral-500 font-mono tracking-wider">
                          {meal.brand}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-neutral-500 font-mono mt-0.5">
                      {meal.serving_size} {meal.serving_unit} • {meal.calories}{' '}
                      kcal | P: {meal.protein_g}g | C: {meal.carbs_g}g | F:{' '}
                      {meal.fats_g}g
                    </p>
                  </div>
                </div>

                {!isManageMode && (
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMeal(meal.id);
                      }}
                      className="text-neutral-500 hover:text-rose-500 font-bold px-2 py-1 text-sm transition-colors"
                      title="Remove food"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <CopyMealModal
        isOpen={copyModalConfig.isOpen}
        mode={copyModalConfig.mode}
        onClose={() =>
          setCopyModalConfig({ ...copyModalConfig, isOpen: false })
        }
        selectedDate={selectedDate}
        selectedCopyDate={selectedCopyDate}
        setSelectedCopyDate={setSelectedCopyDate}
        selectedCopyMeal={selectedCopyMeal}
        setSelectedCopyMeal={setSelectedCopyMeal}
        onExecuteCopy={handleExecuteCopy}
      />

      {/* Custom save meal modal*/}
      {isPromptOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-emerald-400 tracking-wider font-mono uppercase">
              Save Meal
            </h3>
            <p className="text-neutral-400 text-sm font-mono leading-relaxed">
              Enter a name for this {label} combination so you can easily log it
              later.
            </p>
            <input
              type="text"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              placeholder={`e.g., My ${label}`}
              autoFocus
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsPromptOpen(false)}
                disabled={isSaving}
                className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveBundle}
                disabled={isSaving || !bundleName.trim()}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? 'Saving...' : 'Save Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig?.isOpen || false}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        confirmText={confirmConfig?.confirmText || ''}
        isDestructive={confirmConfig?.isDestructive || false}
        onClose={() => setConfirmConfig(null)}
        onConfirm={() => confirmConfig?.action()}
      />
    </>
  );
}
