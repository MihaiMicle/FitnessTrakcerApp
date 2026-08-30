'use client';

import { Trash2 } from 'lucide-react';
import ModalShell from './ModalShell';

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/* One destructive confirmation for both past sessions and saved routines */
export default function ConfirmDeleteModal({
  title,
  message,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  return (
    <ModalShell>
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 mx-auto flex items-center justify-center mb-4">
          <Trash2 size={24} className="text-rose-500" />
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
        <p className="text-neutral-400 text-sm font-mono leading-relaxed">
          {message}
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </ModalShell>
  );
}
