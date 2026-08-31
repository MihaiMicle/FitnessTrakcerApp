'use client';

import { useHealthSync } from '@/hooks/useHealthSync';
import HealthImportCard from '@/components/health/HealthImportCard';
import HealthMetricToggles from '@/components/health/HealthMetricToggles';
import type { HealthProvider, SyncDirection } from '@/lib/health/types';

const PROVIDER_LABELS: Record<HealthProvider, string> = {
  apple_health: 'Apple Health',
  health_connect: 'Health Connect',
  file_import: 'Imported export',
  manual: 'Manual entry',
};

const DIRECTIONS: { key: SyncDirection; label: string; hint: string }[] = [
  { key: 'read', label: 'READ', hint: 'Bring health data in' },
  { key: 'write', label: 'WRITE', hint: 'Send workouts and meals out' },
  { key: 'both', label: 'BOTH', hint: 'Keep the two in step' },
];

function formatWhen(value?: string | null): string {
  if (!value) return 'never';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'never' : parsed.toLocaleString();
}

/*
 * Health integration settings
 *
 * The panel renders from the bridge's capabilities rather than from a platform
 * check of its own, so the browser and the packaged app run the same component
 * and a new provider is a change to the bridge alone
 */
export default function HealthSyncPanel() {
  const health = useHealthSync();
  const capabilities = health.capabilities;
  const provider = capabilities?.provider ?? null;
  const connection = provider ? health.connectionFor(provider) : null;
  const importConnection = health.connectionFor('file_import');

  if (health.loading) {
    return (
      <p className="font-mono text-xs text-neutral-500">Loading health settings…</p>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <h3 className="font-mono text-sm font-bold tracking-wider text-white">
          HEALTH SYNC
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Read weight, steps and sleep from your phone's health store, and send
          your workouts and meals back to it
        </p>
      </header>

      {health.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 font-mono text-xs text-red-300">
          {health.error}
        </p>
      )}
      {health.message && (
        <p className="rounded-lg border border-emerald-900 bg-emerald-950/30 px-3 py-2 font-mono text-xs text-emerald-300">
          {health.message}
        </p>
      )}

      {capabilities?.canSync && provider ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-mono text-xs tracking-wider text-neutral-300">
                {PROVIDER_LABELS[provider].toUpperCase()}
              </h4>
              <p className="mt-1 font-mono text-[11px] text-neutral-500">
                {connection
                  ? `Last read ${formatWhen(connection.last_import_at)}`
                  : 'Not connected yet'}
              </p>
            </div>

            {connection ? (
              <button
                type="button"
                disabled={health.busy}
                onClick={() => health.sync()}
                className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 font-mono text-xs tracking-wider text-emerald-300 transition-colors hover:border-emerald-500 disabled:opacity-50"
              >
                {health.busy ? 'SYNCING…' : 'SYNC NOW'}
              </button>
            ) : (
              <button
                type="button"
                disabled={health.busy}
                onClick={() => health.connect(provider)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs tracking-wider text-white transition-colors hover:border-neutral-600 disabled:opacity-50"
              >
                CONNECT
              </button>
            )}
          </div>

          {connection && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 font-mono text-[11px] tracking-wider text-neutral-500">
                  DIRECTION
                </p>
                <div className="flex gap-2">
                  {DIRECTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      disabled={health.busy}
                      title={option.hint}
                      onClick={() => health.updateDirection(provider, option.key)}
                      className={`flex-1 rounded-lg border px-2 py-2 font-mono text-[11px] tracking-wider transition-colors disabled:opacity-50 ${
                        connection.direction === option.key
                          ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-[11px] tracking-wider text-neutral-500">
                  WHAT TO SHARE
                </p>
                <HealthMetricToggles
                  selected={connection.enabled_metrics}
                  disabled={health.busy}
                  onChange={(metrics) => health.updateMetrics(provider, metrics)}
                />
              </div>

              <button
                type="button"
                disabled={health.busy}
                onClick={() => health.disconnect(provider)}
                className="font-mono text-[11px] tracking-wider text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
              >
                DISCONNECT AND DELETE ITS DATA
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <h4 className="font-mono text-xs tracking-wider text-neutral-300">
            DIRECT SYNC UNAVAILABLE
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500">
            {capabilities?.reason}
          </p>
        </div>
      )}

      {capabilities?.canImportFile && (
        <HealthImportCard busy={health.busy} onImport={health.importFile} />
      )}

      {importConnection && (
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
          <p className="font-mono text-[11px] text-neutral-500">
            Imported data · last {formatWhen(importConnection.last_import_at)}
          </p>
          <button
            type="button"
            disabled={health.busy}
            onClick={() => health.disconnect('file_import')}
            className="font-mono text-[11px] tracking-wider text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            REMOVE
          </button>
        </div>
      )}
    </section>
  );
}
