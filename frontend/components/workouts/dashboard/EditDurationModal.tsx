'use client';

import { useState } from 'react';
import ModalShell from './ModalShell';

interface EditDurationModalProps {
  initialSeconds: number;
  onSave: (seconds: number) => void;
  onCancel: () => void;
}

export default function EditDurationModal({
  initialSeconds,
  onSave,
  onCancel,
}: EditDurationModalProps) {
  const [minutes, setMinutes] = useState(Math.floor(initialSeconds / 60));

  return (
    <ModalShell>
      <h3 className="text-xl font-bold text-white text-center tracking-tight">
        Edit Workout Time
      </h3>

      <div className="flex items-center justify-center gap-4">
        <input
          type="number"
          min="0"
          value={minutes}
          onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))}
          className="w-24 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-center text-xl font-mono focus:border-indigo-500 outline-none transition-colors"
        />
        <span className="text-neutral-400 font-mono">minutes</span>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(minutes * 60)}
          className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-xl transition-colors"
        >
          Save Time
        </button>
      </div>
    </ModalShell>
  );
}
