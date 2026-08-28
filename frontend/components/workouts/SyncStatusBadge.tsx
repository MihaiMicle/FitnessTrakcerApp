'use client';

import { CloudOff, RefreshCw, TriangleAlert, Check } from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';

interface Props {
  /* Hides the badge entirely once everything is saved */
  hideWhenIdle?: boolean;
  compact?: boolean;
}

/*
 * Tells the user where their sets are
 *
 * Offline logging is only trustworthy if it is visible, otherwise a user with
 * no signal cannot tell a saved workout from a lost one
 */
export default function SyncStatusBadge({
  hideWhenIdle = true,
  compact = false,
}: Props) {
  const { pending, failed, syncing, online, retry } = useSyncStatus();

  const idle = pending === 0 && failed === 0 && online;
  if (idle && hideWhenIdle) return null;

  const base =
    'inline-flex items-center gap-1.5 rounded-md border font-mono transition-colors ' +
    (compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]');

  if (failed > 0) {
    return (
      <button
        onClick={retry}
        title="Retry failed uploads"
        className={`${base} bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20`}
      >
        <TriangleAlert size={12} />
        {failed} failed
      </button>
    );
  }

  if (!online) {
    return (
      <span
        title="Saved on this device, will upload when you are back online"
        className={`${base} bg-amber-500/10 border-amber-500/30 text-amber-400`}
      >
        <CloudOff size={12} />
        Offline{pending > 0 ? ` · ${pending}` : ''}
      </span>
    );
  }

  if (pending > 0) {
    return (
      <span
        title="Uploading your sets"
        className={`${base} bg-sky-500/10 border-sky-500/30 text-sky-400`}
      >
        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'Syncing' : `${pending} queued`}
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-emerald-500/10 border-emerald-500/30 text-emerald-400`}
    >
      <Check size={12} />
      Saved
    </span>
  );
}
