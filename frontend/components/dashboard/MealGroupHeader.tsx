'use client';

import { useEffect, useRef, useState } from 'react';
import { CopyMode } from './hooks/useMealCopy';

interface MealGroupHeaderProps {
  label: string;
  itemCount: number;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  isManageMode: boolean;
  selectedCount: number;
  allSelected: boolean;
  onEnterManageMode: () => void;
  onExitManageMode: () => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onAddMealClick: () => void;
  onSaveAsMeal: () => void;
  onOpenCopy: (mode: CopyMode) => void;
}

const MANAGE_BUTTON =
  'text-[10px] sm:text-xs font-mono font-medium px-3 py-1.5 rounded transition-colors';

export default function MealGroupHeader({
  label,
  itemCount,
  totals,
  isManageMode,
  selectedCount,
  allSelected,
  onEnterManageMode,
  onExitManageMode,
  onSelectAll,
  onBulkDelete,
  onAddMealClick,
  onSaveAsMeal,
  onOpenCopy,
}: MealGroupHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runFromMenu = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <div className="flex justify-between items-start sm:items-center mb-4">
      <div className="flex flex-col gap-1.5">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base tracking-tight">
          {label}
          <span className="text-[10px] bg-neutral-950 px-2 py-0.5 rounded-full text-neutral-500 font-mono border border-neutral-800">
            {itemCount} items
          </span>
        </h3>
        {itemCount > 0 && (
          <div className="text-[10px] font-mono flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-neutral-200">{totals.calories} kcal</span>
            <span className="text-neutral-600 hidden sm:inline">|</span>
            <span className="text-blue-400">P: {totals.protein}g</span>
            <span className="text-amber-400">C: {totals.carbs}g</span>
            <span className="text-rose-400">F: {totals.fats}g</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-1 sm:mt-0">
        {isManageMode ? (
          <>
            <button
              onClick={onSelectAll}
              className={`${MANAGE_BUTTON} bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white`}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={onExitManageMode}
              className={`${MANAGE_BUTTON} bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white`}
            >
              Cancel
            </button>
            <button
              onClick={onBulkDelete}
              disabled={selectedCount === 0}
              className={`${MANAGE_BUTTON} font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white disabled:opacity-50`}
            >
              Delete ({selectedCount})
            </button>
          </>
        ) : (
          <>
            {itemCount > 0 && (
              <button
                onClick={onEnterManageMode}
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
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col">
                  <button
                    onClick={() => runFromMenu(onSaveAsMeal)}
                    className="w-full text-left px-4 py-3 text-xs font-mono text-emerald-400 hover:bg-neutral-900 transition-colors border-b border-neutral-800"
                  >
                    + Save as a Meal
                  </button>
                  <button
                    onClick={() => runFromMenu(() => onOpenCopy('from'))}
                    className="w-full flex justify-between items-center px-4 py-3 text-xs font-mono text-blue-400 hover:bg-neutral-900 transition-colors border-b border-neutral-800"
                  >
                    <span>« Copy From...</span>
                  </button>
                  <button
                    onClick={() => runFromMenu(() => onOpenCopy('to'))}
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
  );
}
