'use client';

import { useState } from 'react';
import type { CopilotAction } from '@/lib/copilot/types';
import CardShell from './CardShell';

const LABELS: Record<string, string> = {
  UPDATE_GOALS: 'Update goals',
  UPDATE_PROFILE: 'Update profile',
  SET_BODY_FAT: 'Set body fat',
};

/* Nothing the copilot proposes is written until it is confirmed here, which is
   why the exact payload is shown rather than a summary of it */
export default function ActionCard({
  action,
  onApply,
}: {
  action: CopilotAction;
  onApply: (action: CopilotAction) => Promise<void>;
}) {
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleApply = async () => {
    setBusy(true);
    await onApply(action);
    setBusy(false);
    setApplied(true);
  };

  return (
    <CardShell label="Proposed change" title={LABELS[action.type] ?? action.type}>
      <dl className="text-[11px] font-mono text-neutral-300 mb-3 space-y-1">
        {Object.entries(action.payload).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3">
            <dt className="text-neutral-500">{key.replace(/_/g, ' ')}</dt>
            <dd className="text-neutral-200">{String(value)}</dd>
          </div>
        ))}
      </dl>

      <button
        onClick={handleApply}
        disabled={busy || applied}
        className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/50 disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 rounded-lg text-xs font-bold text-emerald-400 hover:text-white transition-all active:scale-95"
      >
        {applied ? 'Applied' : busy ? 'Applying...' : 'Apply change'}
      </button>
    </CardShell>
  );
}
