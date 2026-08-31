'use client';

import { useRef, useState } from 'react';

interface HealthImportCardProps {
  busy: boolean;
  onImport: (file: File) => void;
}

const ACCEPTED = '.zip,.xml,application/zip,text/xml';

/*
 * Uploading an export, which is how a browser gets HealthKit data at all
 *
 * The instructions are spelled out because the share is buried three levels
 * into the Health app and nobody finds it by guessing
 */
export default function HealthImportCard({ busy, onImport }: HealthImportCardProps) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);

  const pick = (file: File | null | undefined) => {
    if (!file) return;
    setName(file.name);
    onImport(file);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <h4 className="font-mono text-xs tracking-wider text-neutral-300">
        IMPORT AN APPLE HEALTH EXPORT
      </h4>

      <ol className="mt-3 space-y-1 text-xs text-neutral-500">
        <li>1. Health app → your photo, top right → Export All Health Data</li>
        <li>2. Save the zip somewhere you can reach from this device</li>
        <li>3. Upload it below</li>
      </ol>

      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          /* Reset so re-picking the same file fires change again */
          event.target.value = '';
        }}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="mt-4 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 font-mono text-xs tracking-wider text-white transition-colors hover:border-neutral-600 disabled:opacity-50"
      >
        {busy ? 'IMPORTING…' : 'CHOOSE EXPORT FILE'}
      </button>

      {name && !busy && (
        <p className="mt-2 truncate font-mono text-[11px] text-neutral-500">{name}</p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">
        A large export can take a minute. Re-uploading the same file is safe,
        anything already stored is recognised rather than added twice
      </p>
    </div>
  );
}
