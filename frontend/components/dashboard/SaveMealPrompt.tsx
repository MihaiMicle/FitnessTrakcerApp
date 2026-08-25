'use client';

interface SaveMealPromptProps {
  isOpen: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Asks for a name before saving a meal section as a reusable bundle. */
export default function SaveMealPrompt({
  isOpen,
  label,
  value,
  onChange,
  isSaving,
  onCancel,
  onConfirm,
}: SaveMealPromptProps) {
  if (!isOpen) return null;

  return (
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`e.g., My ${label}`}
          autoFocus
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving || !value.trim()}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isSaving ? 'Saving...' : 'Save Meal'}
          </button>
        </div>
      </div>
    </div>
  );
}
