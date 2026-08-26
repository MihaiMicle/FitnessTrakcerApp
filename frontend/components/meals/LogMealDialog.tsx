'use client';

import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/lib/constants';
import {
  createCustomFood,
  deleteCustomFood,
  updateCustomFood,
} from '@/lib/api';
import {
  buildCustomFoodPayload,
  buildFoodPayload,
} from '@/lib/nutrition/mealForm';
import { supabase } from '@/lib/supabase';
import { LogMealPayload } from '@/types/nutrition';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { useConfirm } from '@/components/shared/useConfirm';
import BarcodeScanner from './BarcodeScanner';
import BundleTabPanel from './BundleTabPanel';
import CreateNewCard from '@/components/shared/CreateNewCard';
import FoodForm from './FoodForm';
import FoodList from './FoodList';
import LogMealTabs, { LogMealTab, MealSearchBar } from './LogMealTabs';
import { useBundleBuilder } from './hooks/useBundleBuilder';
import { useFilteredLibrary, useFoodLibrary } from './hooks/useFoodLibrary';
import { useMealForm } from './hooks/useMealForm';

interface LogMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: (payload: LogMealPayload) => Promise<any>;
  initialMealType?: string;
  editingLog?: any;
  onUpdateLog?: (id: string, payload: any) => Promise<any>;
}

export default function LogMealModal({
  isOpen,
  onClose,
  onAddMeal,
  initialMealType,
  editingLog,
  onUpdateLog,
}: LogMealModalProps) {
  const [activeTab, setActiveTab] = useState<LogMealTab>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAsCustom, setSaveAsCustom] = useState(false);
  const [logMealToDiary, setLogMealToDiary] = useState(true);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);

  const library = useFoodLibrary(isOpen);
  const filtered = useFilteredLibrary(library, searchQuery);
  const form = useMealForm(library.customFoods);
  const builder = useBundleBuilder(library.refreshBundles);
  const confirm = useConfirm();

  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  useEffect(() => {
    if (isOpen) {
      if (editingLog) {
        form.loadDiaryEntry(editingLog, initialMealType);
        setActiveTab('manual');
        setLogMealToDiary(true);
        setSaveAsCustom(false);
      } else {
        form.setMealType(initialMealType || 'lunch');
      }
    } else {
      setEditingFoodId(null);
      setSaveAsCustom(false);
      setLogMealToDiary(true);
      setActiveTab('recent');
      setSearchQuery('');
      form.clearBaseFood();
      builder.reset();
      confirm.close();
    }
  }, [isOpen, initialMealType, editingLog]);

  if (!isOpen) return null;

  const query = searchQuery.trim();

  const handleSelectFood = (food: any, isEditMode = false) => {
    builder.cancelFoodEdit();
    if (isEditMode) {
      setEditingFoodId(food.id);
      setSaveAsCustom(true);
      setLogMealToDiary(false);
    } else {
      setEditingFoodId(null);
      setSaveAsCustom(false);
      setLogMealToDiary(true);
    }
    form.selectFood(food, isEditMode);
    setActiveTab('manual');
  };

  const handleCreateFromSearch = () => {
    form.prefillNewFood(query);
    setEditingFoodId(null);
    setSaveAsCustom(true);
    setLogMealToDiary(true);
    setActiveTab('manual');
  };

  const handleLogRecipe = (recipe: any) => {
    handleSelectFood({
      name: `[Recipe] ${recipe.name}`,
      brand: '',
      serving_size: 1,
      serving_unit: 'serving',
      ...recipe.macros_per_serving,
      custom_servings: [{ description: 'serving', equivalent_g: 1 }],
    });
  };

  // Reopen a staged food in the manual form so it can be tweaked in place
  const handleEditStagedFood = (index: number) => {
    const staged = builder.foods[index];
    if (!staged) return;

    builder.startEditingFood(index);
    setEditingFoodId(null);
    setSaveAsCustom(false);
    setLogMealToDiary(true);
    form.selectFood(staged);
    setActiveTab('manual');
  };

  const handleRemoveStagedFood = (index: number) => {
    const staged = builder.foods[index];
    builder.removeFood(index);
    toast.success(`Removed ${staged?.food_name || 'item'}`);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const payload = buildFoodPayload(form.formData);
      const mealType = form.formData.meal_type;

      if (editingLog && onUpdateLog && logMealToDiary) {
        await onUpdateLog(editingLog.id, { ...payload, meal_type: mealType });
        onClose();
        return;
      }

      // Inside a builder, "submit" stages the food instead of logging it
      if (builder.mode && logMealToDiary) {
        const stagedIndex = builder.editingFoodIndex;
        if (stagedIndex !== null) {
          builder.updateFood(stagedIndex, payload);
          toast.success(`Updated ${payload.food_name}`);
        } else {
          builder.addFood(payload);
          toast.success(`Added ${payload.food_name} to ${builder.mode}`);
        }
        setActiveTab(builder.mode === 'meal' ? 'meals' : 'recipes');
        setIsSubmitting(false);
        return;
      }

      if (saveAsCustom) {
        const dbPayload = buildCustomFoodPayload(payload, form.baseFood);
        if (editingFoodId) {
          await updateCustomFood(
            session.access_token,
            editingFoodId,
            dbPayload,
          );
          toast.success('Food updated successfully!');
        } else {
          await createCustomFood(session.access_token, dbPayload);
          toast.success('Food saved successfully!');
        }
      }

      if (logMealToDiary && !editingLog)
        await onAddMeal({ ...payload, meal_type: mealType } as any);

      if (builder.mode) {
        setActiveTab(builder.mode === 'meal' ? 'meals' : 'recipes');
        return;
      }

      onClose();
    } catch {
      alert('Failed to process request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomFood = (e: React.MouseEvent, foodId: string) => {
    e.stopPropagation();
    confirm.ask({
      title: 'DELETE CUSTOM FOOD',
      message: 'Are you sure you want to permanently delete this custom food?',
      confirmText: 'Delete',
      isDestructive: true,
      action: async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) return;
          toast.loading('Deleting...', { id: 'deleteFood' });
          await deleteCustomFood(session.access_token, foodId);
          library.removeCustomFood(foodId);
          toast.success('Custom food deleted', { id: 'deleteFood' });
        } catch {
          toast.error('Failed to delete food', { id: 'deleteFood' });
        }
      },
    });
  };

  const handleLogSavedMeal = (meal: any) => {
    const mealType = form.formData.meal_type as keyof typeof MEAL_TYPE_LABELS;
    confirm.ask({
      title: 'LOG MEAL',
      message: `Log all items from '${meal.name}' into ${MEAL_TYPE_LABELS[mealType]}?`,
      confirmText: 'Log Items',
      action: async () => {
        setIsSubmitting(true);
        toast.loading(`Unpacking ${meal.name}...`, { id: 'logBundle' });
        try {
          for (const food of meal.foods)
            await onAddMeal({ ...food, meal_type: mealType });
          toast.success('Meal completely logged!', { id: 'logBundle' });
          onClose();
        } catch {
          toast.error('Failed to log some items', { id: 'logBundle' });
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleDeleteBundle = (
    e: React.MouseEvent,
    id: string,
    table: 'saved_meals' | 'recipes',
  ) => {
    e.stopPropagation();
    const isRecipe = table === 'recipes';
    confirm.ask({
      title: isRecipe ? 'DELETE RECIPE' : 'DELETE MEAL',
      message: `Are you sure you want to permanently delete this ${
        isRecipe ? 'recipe' : 'saved meal'
      }?`,
      confirmText: 'Delete',
      isDestructive: true,
      action: async () => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
          toast.error('Failed to delete.');
          return;
        }
        library.removeBundle(id, table);
        toast.success('Deleted successfully!');
      },
    });
  };

  const heading = builder.mode ? (
    <span className="text-amber-400 animate-pulse">
      {builder.mode === 'meal' ? 'Meal Builder' : 'Recipe Builder'}
    </span>
  ) : editingFoodId ? (
    'Edit Custom Food'
  ) : editingLog ? (
    'Update Diary Entry'
  ) : (
    'Log Food'
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
        <div className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3 shrink-0">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {heading}
            </h3>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white font-mono text-xl sm:text-sm px-2 py-1"
            >
              ✕
            </button>
          </div>

          {(!builder.mode || activeTab === 'manual') && (
            <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-lg border border-neutral-800 shrink-0">
              <span className="text-xs text-neutral-400 font-mono ml-2">
                Target Section:
              </span>
              <select
                value={form.formData.meal_type}
                onChange={(e) => form.setMealType(e.target.value)}
                className="bg-transparent border-none text-emerald-400 text-sm font-bold focus:ring-0 cursor-pointer outline-none text-right"
              >
                {MEAL_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                    className="bg-neutral-900 text-white"
                  >
                    {MEAL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <LogMealTabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab !== 'manual' && activeTab !== 'scan' && (
            <MealSearchBar
              activeTab={activeTab}
              value={searchQuery}
              onChange={setSearchQuery}
            />
          )}

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-2">
            {activeTab === 'recent' && (
              <FoodList
                foods={filtered.recent}
                emptyMessage="No recent foods."
                onSelect={handleSelectFood}
              />
            )}

            {activeTab === 'global' && (
              <div className="space-y-2">
                <FoodList
                  foods={filtered.global}
                  emptyMessage="No database foods match."
                  onSelect={handleSelectFood}
                  showAppBadge
                />
                {query && !filtered.hasExactGlobal && (
                  <CreateNewCard
                    title={`Create "${query}"`}
                    hint="Add to your custom database"
                    onClick={handleCreateFromSearch}
                  />
                )}
              </div>
            )}

            {activeTab === 'custom' && (
              <div className="space-y-2">
                <FoodList
                  foods={filtered.custom}
                  emptyMessage="No custom foods match."
                  onSelect={handleSelectFood}
                  onDelete={handleDeleteCustomFood}
                  showActions
                />
                {query && !filtered.hasExactCustom && (
                  <CreateNewCard
                    title={`Create "${query}"`}
                    hint="Add to your custom database"
                    onClick={handleCreateFromSearch}
                  />
                )}
              </div>
            )}

            {activeTab === 'meals' && (
              <BundleTabPanel
                type="meal"
                items={filtered.meals}
                searchQuery={searchQuery}
                hasExactMatch={filtered.hasExactMeal}
                builder={builder}
                onAddFood={() => setActiveTab('recent')}
                onEditFood={handleEditStagedFood}
                onRemoveFood={handleRemoveStagedFood}
                onLog={handleLogSavedMeal}
                onDelete={handleDeleteBundle}
              />
            )}

            {activeTab === 'recipes' && (
              <BundleTabPanel
                type="recipe"
                items={filtered.recipes}
                searchQuery={searchQuery}
                hasExactMatch={filtered.hasExactRecipe}
                builder={builder}
                onAddFood={() => setActiveTab('recent')}
                onEditFood={handleEditStagedFood}
                onRemoveFood={handleRemoveStagedFood}
                onLog={handleLogRecipe}
                onDelete={handleDeleteBundle}
              />
            )}

            {activeTab === 'scan' && (
              <BarcodeScanner
                onProductFound={(foodData) => handleSelectFood(foodData, false)}
              />
            )}

            {activeTab === 'manual' && (
              <FoodForm
                formData={form.formData}
                setFormData={form.setFormData}
                availableUnits={form.availableUnits}
                updateMacros={form.updateServing}
                saveAsCustom={saveAsCustom}
                setSaveAsCustom={setSaveAsCustom}
                logMealToDiary={logMealToDiary}
                setLogMealToDiary={setLogMealToDiary}
                builderMode={builder.mode}
                isEditingStagedFood={builder.editingFoodIndex !== null}
                editingFoodId={editingFoodId}
                isEditingLog={!!editingLog}
                isSubmitting={isSubmitting}
                onClose={onClose}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      </div>

      <ConfirmModal {...confirm.modalProps} />
    </>
  );
}
