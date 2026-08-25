'use client';

export type LogMealTab =
  | 'recent'
  | 'global'
  | 'custom'
  | 'meals'
  | 'recipes'
  | 'manual'
  | 'scan';

const TABS: { id: LogMealTab; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'global', label: 'Database' },
  { id: 'custom', label: 'My Foods' },
  { id: 'meals', label: 'Meals' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'scan', label: 'Scan' },
  { id: 'manual', label: 'Form' },
];

const ACTIVE_TAB =
  'bg-emerald-900/40 text-emerald-400 font-bold border border-emerald-800/50';
const INACTIVE_TAB =
  'text-neutral-400 hover:text-white border border-transparent';

const SEARCH_PLACEHOLDERS: Partial<Record<LogMealTab, string>> = {
  global: 'Search database...',
  custom: 'Search my foods...',
  meals: 'Search meals...',
  recipes: 'Search recipes...',
};

interface LogMealTabsProps {
  activeTab: LogMealTab;
  onChange: (tab: LogMealTab) => void;
}

export default function LogMealTabs({ activeTab, onChange }: LogMealTabsProps) {
  return (
    <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px] sm:text-[10px] md:text-xs font-mono overflow-x-auto custom-scrollbar shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2 sm:py-1.5 px-2 whitespace-nowrap rounded-md transition-colors ${
            activeTab === tab.id ? ACTIVE_TAB : INACTIVE_TAB
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface MealSearchBarProps {
  activeTab: LogMealTab;
  value: string;
  onChange: (value: string) => void;
}

export function MealSearchBar({
  activeTab,
  value,
  onChange,
}: MealSearchBarProps) {
  return (
    <div className="relative shrink-0">
      <input
        type="text"
        placeholder={SEARCH_PLACEHOLDERS[activeTab] ?? 'Search recent...'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[16px] sm:text-sm text-white focus:border-emerald-500 outline-none transition-colors font-mono"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white font-mono text-xs p-2"
        >
          ✕
        </button>
      )}
    </div>
  );
}
