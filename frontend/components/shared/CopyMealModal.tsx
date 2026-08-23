"use client";

import { useMemo, useRef, useEffect } from "react";

interface CopyMealModalProps {
  isOpen: boolean;
  mode: "from" | "to";
  onClose: () => void;
  selectedDate: string;
  selectedCopyDate: string;
  setSelectedCopyDate: (val: string) => void;
  selectedCopyMeal: string;
  setSelectedCopyMeal: (val: string) => void;
  onExecuteCopy: () => void;
}

const mealOptions = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

export default function CopyMealModal({
  isOpen,
  mode,
  onClose,
  selectedDate,
  selectedCopyDate,
  setSelectedCopyDate,
  selectedCopyMeal,
  setSelectedCopyMeal,
  onExecuteCopy,
}: CopyMealModalProps) {
  const activeDateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeDateRef.current) {
      activeDateRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [isOpen]);

  const dateOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -14; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      let displayLabel = dateStr;
      if (i === -1) displayLabel = "Yesterday";
      else if (i === 0) displayLabel = "Today";
      else if (i === 1) displayLabel = "Tomorrow";
      else {
        displayLabel = d.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
      }

      options.push({ value: dateStr, label: displayLabel });
    }
    return options;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-xl w-full max-w-md flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95">
        <div className="flex justify-between items-center p-5 border-b border-neutral-800">
          <h3 className="text-base font-bold text-white tracking-wider">
            {mode === "from" ? "Copy from" : "Copy to"}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex h-56 py-3 bg-neutral-950 relative">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
            {mealOptions.map((m) => (
              <div
                key={m.value}
                onClick={() => setSelectedCopyMeal(m.value)}
                className={`px-3 py-2.5 text-center rounded-lg cursor-pointer transition-colors text-sm font-medium ${selectedCopyMeal === m.value ? "bg-neutral-800 text-white shadow-sm border border-neutral-700" : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50 border border-transparent"}`}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div className="w-px bg-neutral-800 my-2"></div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
            {dateOptions.map((d) => (
              <div
                key={d.value}
                ref={selectedCopyDate === d.value ? activeDateRef : null}
                onClick={() => setSelectedCopyDate(d.value)}
                className={`px-3 py-2.5 text-center rounded-lg cursor-pointer transition-colors text-sm font-medium ${selectedCopyDate === d.value ? "bg-neutral-800 text-white shadow-sm border border-neutral-700" : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50 border border-transparent"}`}
              >
                {d.label}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-neutral-800 bg-neutral-900 rounded-b-xl">
          <button
            onClick={onExecuteCopy}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wide shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
          >
            Log
          </button>
        </div>
      </div>
    </div>
  );
}
