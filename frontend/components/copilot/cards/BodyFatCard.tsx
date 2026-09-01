'use client';

import { useState } from 'react';
import type { CopilotBodyFat } from '@/lib/copilot/types';
import CardShell from './CardShell';

const CONFIDENCE_STYLES: Record<string, string> = {
  low: 'text-amber-500',
  medium: 'text-emerald-500',
  high: 'text-emerald-400',
};

/*
 * A photo estimate, presented as an estimate.
 *
 * The range is shown larger than the point value on purpose. A single number
 * invites the user to track it week to week as if it were a measurement, and
 * two photos in different lighting can move it several points on their own
 */
export default function BodyFatCard({
  estimate,
  onSave,
}: {
  estimate: CopilotBodyFat;
  onSave: (percent: number) => Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasRange =
    estimate.range_low != null && estimate.range_high != null;

  const handleSave = async () => {
    setBusy(true);
    await onSave(estimate.estimate_percent);
    setBusy(false);
    setSaved(true);
  };

  return (
    <CardShell
      label="Body fat estimate"
      title={
        hasRange
          ? `${estimate.range_low}–${estimate.range_high}%`
          : `~${estimate.estimate_percent}%`
      }
      meta={
        estimate.photos_used
          ? `${estimate.photos_used} photo${estimate.photos_used === 1 ? '' : 's'}`
          : undefined
      }
    >
      {hasRange && (
        <p className="text-[11px] font-mono text-neutral-500 mb-2">
          midpoint {estimate.estimate_percent}%
        </p>
      )}

      <p className="text-[11px] font-mono mb-3">
        <span className={CONFIDENCE_STYLES[estimate.confidence] ?? 'text-amber-500'}>
          {estimate.confidence} confidence
        </span>
      </p>

      {estimate.rationale && (
        <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
          {estimate.rationale}
        </p>
      )}

      <p className="text-[11px] text-neutral-600 mb-3 leading-relaxed">
        Estimated from photos, not measured. Lighting, pump and posture all move
        this number. Use the trend, not the digit.
      </p>

      <button
        onClick={handleSave}
        disabled={busy || saved}
        className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 disabled:text-neutral-600 border border-neutral-700 rounded-lg text-xs font-bold text-neutral-200 transition-all active:scale-95"
      >
        {saved
          ? 'Saved to profile'
          : busy
            ? 'Saving...'
            : `Save ${estimate.estimate_percent}% to profile`}
      </button>
    </CardShell>
  );
}
