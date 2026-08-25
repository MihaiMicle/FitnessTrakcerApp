'use client';

import { TrashIcon } from '@/components/shared/icons';

interface DeleteWeightLogModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteWeightLogModal({
  isOpen,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteWeightLogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 mx-auto flex items-center justify-center mb-4">
            <TrashIcon className="w-6 h-6 text-rose-500" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Delete Weight Log?
          </h3>
          <p className="text-neutral-400 text-sm font-mono leading-relaxed">
            Are you sure you want to permanently delete this weight log?
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
      </div>
    </div>
  );
}
