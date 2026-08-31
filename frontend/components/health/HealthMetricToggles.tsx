'use client';

import { CANONICAL_METRICS, METRIC_KEYS, type HealthMetric } from '@/lib/health/metrics';

interface HealthMetricTogglesProps {
  selected: HealthMetric[];
  disabled?: boolean;
  onChange: (metrics: HealthMetric[]) => void;
}

/*
 * The consent list
 *
 * Rendered from the shared metric table rather than a hand written list, so a
 * metric added to the app appears here without anyone remembering to
 */
export default function HealthMetricToggles({
  selected,
  disabled,
  onChange,
}: HealthMetricTogglesProps) {
  const chosen = new Set(selected);

  const toggle = (metric: HealthMetric) => {
    const next = new Set(chosen);
    if (next.has(metric)) next.delete(metric);
    else next.add(metric);
    onChange(METRIC_KEYS.filter((key) => next.has(key)));
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {METRIC_KEYS.map((metric) => {
        const active = chosen.has(metric);
        return (
          <button
            key={metric}
            type="button"
            disabled={disabled}
            onClick={() => toggle(metric)}
            aria-pressed={active}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-mono transition-colors disabled:opacity-50 ${
              active
                ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
            }`}
          >
            <span className="truncate">{CANONICAL_METRICS[metric].label}</span>
            <span className="shrink-0 text-[10px] tracking-wider">
              {active ? 'ON' : 'OFF'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
