'use client';

import { useState, useEffect } from 'react';
import WaterTracker from '@/components/dashboard/WaterTracker';
import WeightChart from '@/components/dashboard/WeightChart';
import MealGroup from '@/components/dashboard/MealGroup';
import { NUTRITION_METRICS, FEATURE_METRICS } from '@/hooks/useDashboardLayout';
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@/lib/constants';

interface WidgetGridProps {
  layout: any[];
  updateLayout: (newLayout: any[]) => void;
  isEditingLayout: boolean;
  dailyLog: any;
  selectedDate: string;
  addMeal: (payload: any) => Promise<any>;
  removeMeal: (id: string) => void;
  refreshLog: () => void;
  setIsDetailedModalOpen: (val: boolean) => void;
  setIsWeightModalOpen: (val: boolean) => void;
  setSelectedMealTypeForModal: (val: string) => void;
  setIsModalOpen: (val: boolean) => void;
  onEditMeal: (meal: any) => void;
}

export default function WidgetGrid({
  layout,
  updateLayout,
  isEditingLayout,
  dailyLog,
  selectedDate,
  addMeal,
  removeMeal,
  refreshLog,
  setIsDetailedModalOpen,
  setIsWeightModalOpen,
  setSelectedMealTypeForModal,
  setIsModalOpen,
  onEditMeal,
}: WidgetGridProps) {
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const [startMouseY, setStartMouseY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  const [openWidgetMenu, setOpenWidgetMenu] = useState<number | null>(null);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isEditingLayout) {
      setOpenWidgetMenu(null);
      setResizingIndex(null);
    }
  }, [isEditingLayout]);

  const handleResizeStart = (
    e: React.MouseEvent | React.TouchEvent,
    index: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const clientY =
      'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const element = document.getElementById(`widget-${index}`);
    if (!element) return;
    setResizingIndex(index);
    setStartMouseY(clientY);
    const h = element.getBoundingClientRect().height;
    setStartHeight(h);
    setLiveHeight(h);
  };

  useEffect(() => {
    if (resizingIndex === null) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY =
        'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const delta = clientY - startMouseY;
      setLiveHeight(Math.max(80, startHeight + delta));
    };

    const handleEnd = () => {
      if (resizingIndex !== null && liveHeight !== null) {
        const newLayout = [...layout];
        newLayout[resizingIndex].height = liveHeight;
        updateLayout(newLayout);
      }
      setResizingIndex(null);
      setLiveHeight(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [
    resizingIndex,
    startMouseY,
    startHeight,
    liveHeight,
    layout,
    updateLayout,
  ]);

  const handleDragStart = (
    e: React.DragEvent,
    source: 'grid' | 'palette',
    type: 'goal' | 'meal' | 'feature',
    id: string,
    index?: number,
  ) => {
    e.dataTransfer.setData('source', source);
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('id', id);
    if (index !== undefined) e.dataTransfer.setData('index', index.toString());
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const source = e.dataTransfer.getData('source');
    const type = e.dataTransfer.getData('type') as 'goal' | 'meal' | 'feature';
    const id = e.dataTransfer.getData('id');
    const newLayout = [...layout];

    if (source === 'palette') {
      newLayout.splice(targetIndex, 0, {
        id,
        type,
        size: type === 'goal' ? 'half' : 'full',
      });
      updateLayout(newLayout);
    } else if (source === 'grid') {
      const sourceIndex = parseInt(e.dataTransfer.getData('index'));
      if (sourceIndex === targetIndex) return;
      const [moved] = newLayout.splice(sourceIndex, 1);
      let adjustedTarget = targetIndex;
      if (sourceIndex < targetIndex) adjustedTarget -= 1;
      newLayout.splice(adjustedTarget, 0, moved);
      updateLayout(newLayout);
    }
  };

  const toggleSize = (index: number) => {
    const newLayout = [...layout];
    newLayout[index].size = newLayout[index].size === 'full' ? 'half' : 'full';
    updateLayout(newLayout);
  };

  const removeWidget = (index: number) => {
    const newLayout = [...layout];
    newLayout.splice(index, 1);
    updateLayout(newLayout);
  };

  const unusedMetrics = Object.keys(NUTRITION_METRICS).filter(
    (k) => !layout.some((w) => w.type === 'goal' && w.id === k),
  );
  const unusedMeals = MEAL_TYPES.filter(
    (t) => !layout.some((w) => w.type === 'meal' && w.id === t),
  );
  const unusedFeatures = Object.keys(FEATURE_METRICS).filter(
    (k) => !layout.some((w) => w.type === 'feature' && w.id === k),
  );

  return (
    <section className="mb-6 sm:mb-8">
      {isEditingLayout && (
        <div className="bg-neutral-900 border border-emerald-500/30 rounded-xl p-5 shadow-lg mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <span className="animate-pulse">🟢</span> Widget Palette (Drag into
            the grid)
          </h3>
          <div className="flex flex-wrap gap-2">
            {unusedMetrics.map((key) => (
              <div
                key={`pal-goal-${key}`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'palette', 'goal', key)}
                className="bg-neutral-950 border border-neutral-700 px-3 py-1.5 rounded-full text-xs font-mono cursor-grab active:cursor-grabbing hover:border-emerald-500 transition-colors shadow-sm"
              >
                + {NUTRITION_METRICS[key].label}
              </div>
            ))}
            {unusedMeals.map((key) => (
              <div
                key={`pal-meal-${key}`}
                draggable
                onDragStart={(e) => handleDragStart(e, 'palette', 'meal', key)}
                className="bg-neutral-950 border border-neutral-700 px-3 py-1.5 rounded-full text-xs font-mono cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors shadow-sm"
              >
                +{' '}
                {MEAL_TYPE_LABELS[key as keyof typeof MEAL_TYPE_LABELS] || key}{' '}
                Meal
              </div>
            ))}
            {unusedFeatures.map((key) => (
              <div
                key={`pal-feat-${key}`}
                draggable
                onDragStart={(e) =>
                  handleDragStart(e, 'palette', 'feature', key)
                }
                className="bg-neutral-950 border border-neutral-700 px-3 py-1.5 rounded-full text-xs font-mono cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-colors shadow-sm"
              >
                + {FEATURE_METRICS[key].label}
              </div>
            ))}
            {unusedMetrics.length === 0 &&
              unusedMeals.length === 0 &&
              unusedFeatures.length === 0 && (
                <span className="text-xs text-neutral-500 font-mono">
                  All available widgets are on your dashboard!
                </span>
              )}
          </div>
        </div>
      )}

      <div
        className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${isEditingLayout ? 'pb-8 bg-neutral-950/40 p-2 sm:p-4 rounded-xl border border-dashed border-neutral-800' : ''}`}
      >
        {layout.map((widget, index) => {
          const isFull = widget.size === 'full';
          const colSpanClass = isFull
            ? 'col-span-2 lg:col-span-4'
            : 'col-span-1 lg:col-span-2';
          const currentHeight =
            resizingIndex === index ? liveHeight : widget.height;

          return (
            <div
              id={`widget-${index}`}
              key={`${widget.type}-${widget.id}-${index}`}
              draggable={isEditingLayout && resizingIndex === null}
              onDragStart={(e) =>
                handleDragStart(e, 'grid', widget.type, widget.id, index)
              }
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                minHeight: currentHeight ? `${currentHeight}px` : undefined,
              }}
              className={`${colSpanClass} flex flex-col relative group transition-all duration-200 ${isEditingLayout ? 'ring-1 ring-emerald-500/30 hover:ring-emerald-500 rounded-xl bg-neutral-900/50' : ''} ${isEditingLayout && resizingIndex === null ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              {isEditingLayout && (
                <div
                  onMouseDown={(e) => handleResizeStart(e, index)}
                  onTouchStart={(e) => handleResizeStart(e, index)}
                  style={{ touchAction: 'none' }}
                  className="absolute -bottom-4 left-0 right-0 h-12 md:bottom-0 md:h-6 bg-transparent md:hover:bg-emerald-500/10 cursor-ns-resize flex items-center md:items-end justify-center rounded-b-xl z-50 transition-all touch-none"
                >
                  <div className="w-16 h-1.5 md:w-12 md:h-1 bg-emerald-500 rounded-full mb-0 md:mb-1.5 opacity-60 md:opacity-0 group-hover:opacity-80 transition-all shadow-md pointer-events-none" />
                </div>
              )}

              {isEditingLayout && (
                <div className="absolute -top-3 -right-3 z-50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenWidgetMenu(
                        openWidgetMenu === index ? null : index,
                      );
                    }}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border border-neutral-600 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </button>

                  {openWidgetMenu === index && (
                    <div className="absolute top-10 right-0 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl flex flex-col overflow-hidden w-32 animate-in zoom-in-95">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSize(index);
                          setOpenWidgetMenu(null);
                        }}
                        className="px-4 py-3 text-xs font-mono text-white hover:bg-neutral-800 text-left border-b border-neutral-800 flex items-center justify-between"
                      >
                        {isFull ? 'Make Half' : 'Make Full'}{' '}
                        <span className="text-neutral-500">
                          {isFull ? '><' : '<>'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWidget(index);
                          setOpenWidgetMenu(null);
                        }}
                        className="px-4 py-3 text-xs font-mono font-bold text-rose-500 hover:bg-rose-950/30 text-left flex items-center justify-between"
                      >
                        Remove{' '}
                        <span className="text-rose-500 text-lg leading-none">
                          ×
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div
                className={`flex-1 w-full [&>div]:h-full ${isEditingLayout && widget.type === 'meal' ? 'pointer-events-none opacity-60 pl-8 sm:pl-12 transition-all' : ''} ${isEditingLayout && widget.type === 'goal' ? 'pointer-events-none opacity-60 transition-all' : ''} ${isEditingLayout && widget.type === 'feature' ? 'pointer-events-none opacity-60 transition-all' : ''} ${isEditingLayout && resizingIndex !== null ? 'select-none' : ''}`}
              >
                {widget.type === 'feature' && widget.id === 'weight_chart' && (
                  <WeightChart
                    selectedDate={selectedDate}
                    onClick={() =>
                      !isEditingLayout && setIsWeightModalOpen(true)
                    }
                  />
                )}

                {widget.type === 'goal' &&
                  (widget.id === 'water' ? (
                    <WaterTracker
                      summary={dailyLog}
                      onWaterUpdated={() => refreshLog && refreshLog()}
                    />
                  ) : (
                    (() => {
                      const config = NUTRITION_METRICS[widget.id];
                      if (!config) return null;
                      const currentVal = (dailyLog as any)?.[config.key] || 0;
                      const targetVal =
                        (dailyLog as any)?.[config.targetKey] ||
                        config.defaultTarget;
                      const progress =
                        Math.min((currentVal / targetVal) * 100, 100) || 0;

                      return (
                        <div
                          onClick={() =>
                            !isEditingLayout && setIsDetailedModalOpen(true)
                          }
                          className={`bg-neutral-900 p-4 sm:p-6 rounded-xl border border-neutral-800 space-y-2 sm:space-y-3 flex flex-col justify-center shadow-sm ${!isEditingLayout ? 'cursor-pointer hover:border-emerald-700' : ''}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm gap-1">
                            <span className="text-neutral-400">
                              {config.label}
                            </span>
                            <span className="font-mono font-bold">
                              {currentVal} / {targetVal} {config.unit}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-800 h-2.5 sm:h-3 rounded-full overflow-hidden">
                            <div
                              className={`${config.color} h-full transition-all duration-500 shadow-sm`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()
                  ))}

                {widget.type === 'meal' && (
                  <MealGroup
                    label={
                      MEAL_TYPE_LABELS[
                        widget.id as keyof typeof MEAL_TYPE_LABELS
                      ] || widget.id
                    }
                    mealType={widget.id}
                    selectedDate={selectedDate}
                    isToday={selectedDate === getTodayString()}
                    meals={(dailyLog?.meals || []).filter(
                      (m: any) => m.meal_type?.toLowerCase() === widget.id,
                    )}
                    onDeleteMeal={removeMeal}
                    onAddMeal={addMeal}
                    onAddMealClick={() => {
                      setSelectedMealTypeForModal(widget.id);
                      setIsModalOpen(true);
                    }}
                    onEditMeal={onEditMeal}
                  />
                )}
              </div>
            </div>
          );
        })}

        {isEditingLayout && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => handleDrop(e, layout.length)}
            className="col-span-2 lg:col-span-4 h-16 border-2 border-dashed border-neutral-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-xl flex items-center justify-center text-neutral-500 font-mono text-xs transition-colors mt-2"
          >
            + Drop here to add to bottom
          </div>
        )}
      </div>
    </section>
  );
}
