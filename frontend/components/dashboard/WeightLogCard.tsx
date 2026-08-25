'use client';

import { useState } from 'react';
import {
  CameraIcon,
  CheckIcon,
  CloseIcon,
  PencilIcon,
  TrashIcon,
} from '@/components/shared/icons';

interface WeightLogCardProps {
  log: any;
  previewUrl?: string;
  onSaveWeight: (log: any, weight: number) => Promise<boolean>;
  onDelete: (logId: string) => void;
  onUploadPhoto: (date: string, weight_kg: number, file: File) => void;
  onOpenCamera: (log: { date: string; weight_kg: number }) => void;
}

/** One day's entry: editable weight, physique photo, and its actions. */
export default function WeightLogCard({
  log,
  previewUrl,
  onSaveWeight,
  onDelete,
  onUploadPhoto,
  onOpenCamera,
}: WeightLogCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftWeight, setDraftWeight] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  // Mobile has no hover, so tapping the photo reveals the actions.
  const [actionsVisible, setActionsVisible] = useState(false);

  const displayImage = previewUrl || log.photo_url;

  const startEditing = () => {
    setDraftWeight(log.weight_kg);
    setIsEditing(true);
  };

  const commit = async () => {
    if (!draftWeight || isNaN(Number(draftWeight))) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    const ok = await onSaveWeight(log, Number(draftWeight));
    setIsSaving(false);
    if (ok) setIsEditing(false);
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3 group relative overflow-hidden">
      <div className="flex justify-between items-center z-10 h-7">
        <span className="text-xs text-neutral-400 font-mono">{log.date}</span>

        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.1"
              value={draftWeight}
              onChange={(e) =>
                setDraftWeight(
                  e.target.value === '' ? '' : Number(e.target.value),
                )
              }
              onKeyDown={(e) => e.key === 'Enter' && commit()}
              autoFocus
              className="w-16 bg-neutral-900 border border-indigo-500/50 rounded px-1.5 py-0.5 text-xs font-mono text-white outline-none focus:border-indigo-400 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
            <button
              onClick={commit}
              disabled={isSaving}
              className="text-emerald-400 hover:text-emerald-300 p-0.5"
            >
              <CheckIcon />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-rose-400 hover:text-rose-300 p-0.5"
            >
              <CloseIcon />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <div
              onClick={startEditing}
              title="Edit weight"
              className="flex items-center gap-1.5 cursor-pointer group/edit hover:bg-neutral-900 px-2 py-1 rounded transition-colors"
            >
              <span className="text-sm font-bold text-indigo-400 font-mono">
                {log.weight_kg} kg
              </span>
              <PencilIcon className="w-3 h-3 text-neutral-500 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(log.id);
              }}
              title="Delete log"
              className="text-neutral-600 hover:text-rose-500 transition-colors p-1 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      <div
        onClick={() => setActionsVisible((visible) => !visible)}
        className="aspect-square bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-center overflow-hidden relative cursor-pointer md:cursor-default"
      >
        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt="Physique"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-neutral-600 text-[10px] font-mono">
            No Photo
          </span>
        )}

        <div
          className={`absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:z-20 ${
            actionsVisible ? 'opacity-100 z-20' : 'opacity-0 z-0'
          }`}
        >
          <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors w-24 text-center">
            Upload Photo
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp, image/heic, .heic, .heif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadPhoto(log.date, log.weight_kg, file);
                e.target.value = '';
              }}
            />
          </label>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCamera({ date: log.date, weight_kg: log.weight_kg });
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded cursor-pointer transition-colors w-24 text-center flex items-center justify-center gap-1"
          >
            <CameraIcon className="w-3 h-3" />
            Camera
          </button>

          {log.photo_url && (
            <a
              href={log.photo_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-mono text-neutral-300 hover:text-white underline bg-black/50 px-2 py-1 rounded mt-1"
            >
              Raw Link
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
