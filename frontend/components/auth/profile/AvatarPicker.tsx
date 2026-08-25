'use client';

import { CameraIcon } from '@/components/shared/icons';

interface AvatarPickerProps {
  avatarUrl: string;
  onFileSelected: (file: File) => void;
  onOpenCamera: () => void;
}

/** Profile photo preview with upload-from-disk and take-a-photo actions. */
export default function AvatarPicker({
  avatarUrl,
  onFileSelected,
  onOpenCamera,
}: AvatarPickerProps) {
  const handleFilePicker = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="flex items-center gap-4 py-2">
      <div className="w-14 h-14 bg-neutral-950 border border-neutral-800 rounded-full flex items-center justify-center text-neutral-400 text-sm shrink-0 overflow-hidden relative group cursor-pointer">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Profile"
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-neutral-400 font-mono text-xs">IMG</span>
        )}
        <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center transition-all">
          <span className="text-white font-mono text-[10px] tracking-wider font-semibold">
            UPLOAD
          </span>
        </div>
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFilePicker}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>

      <div>
        <p className="text-sm font-mono text-neutral-300 mb-1.5">
          Profile Photo
        </p>
        <div className="flex items-center gap-2">
          <label className="text-[10px] sm:text-xs font-mono font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white px-2.5 py-1.5 rounded transition-colors cursor-pointer border border-transparent">
            Upload Photo
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFilePicker}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={onOpenCamera}
            className="text-[10px] sm:text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white px-2.5 py-1.5 rounded transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <CameraIcon />
            Take Photo
          </button>
        </div>
      </div>
    </div>
  );
}
