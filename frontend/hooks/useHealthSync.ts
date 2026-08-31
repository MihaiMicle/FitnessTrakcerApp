'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  disconnect as disconnectProvider,
  getConnections,
  importAppleExport,
  saveConnection,
} from '@/lib/health/api';
import { getCapabilities, requestPermissions, runFullSync } from '@/lib/health/bridge';
import { METRIC_KEYS, WRITABLE_METRICS, type HealthMetric } from '@/lib/health/metrics';
import type {
  HealthCapabilities,
  HealthConnection,
  HealthProvider,
  SyncDirection,
} from '@/lib/health/types';

/* What a first connection asks for, chosen to be useful without being greedy */
export const DEFAULT_METRICS: HealthMetric[] = [
  'weight_kg',
  'body_fat_percent',
  'steps',
  'active_energy_kcal',
  'sleep_minutes',
  'workout_minutes',
];

interface HealthSyncState {
  loading: boolean;
  busy: boolean;
  capabilities: HealthCapabilities | null;
  connections: HealthConnection[];
  message: string | null;
  error: string | null;
}

export function useHealthSync() {
  const [state, setState] = useState<HealthSyncState>({
    loading: true,
    busy: false,
    capabilities: null,
    connections: [],
    message: null,
    error: null,
  });

  const patch = useCallback(
    (next: Partial<HealthSyncState>) => setState((prev) => ({ ...prev, ...next })),
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const [capabilities, connections] = await Promise.all([
        getCapabilities(),
        getConnections(),
      ]);
      patch({ capabilities, connections, loading: false });
    } catch (err) {
      patch({
        loading: false,
        error: err instanceof Error ? err.message : 'Could not load health settings',
      });
    }
  }, [patch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connectionFor = useCallback(
    (provider: HealthProvider) =>
      state.connections.find((item) => item.provider === provider) ?? null,
    [state.connections],
  );

  /*
   * Ask the system first, then record the consent
   *
   * The order matters. Storing a connection the user then refuses at the
   * system prompt would leave the account claiming a permission it does not
   * have, and every later sync would come back empty with no explanation
   */
  const connect = useCallback(
    async (provider: HealthProvider, direction: SyncDirection = 'both') => {
      patch({ busy: true, error: null, message: null });
      try {
        const write = direction === 'read' ? [] : WRITABLE_METRICS;
        const granted = await requestPermissions(DEFAULT_METRICS, write);
        if (!granted) {
          patch({
            busy: false,
            error: 'Permission was not granted in the system prompt',
          });
          return;
        }

        await saveConnection({
          provider,
          direction,
          enabled_metrics: DEFAULT_METRICS,
          is_active: true,
          device_platform: state.capabilities?.platform,
        });
        await refresh();
        patch({ busy: false, message: 'Connected' });
      } catch (err) {
        patch({
          busy: false,
          error: err instanceof Error ? err.message : 'Could not connect',
        });
      }
    },
    [patch, refresh, state.capabilities],
  );

  const updateMetrics = useCallback(
    async (provider: HealthProvider, metrics: HealthMetric[]) => {
      patch({ busy: true, error: null });
      try {
        await saveConnection({ provider, enabled_metrics: metrics });
        await refresh();
        patch({ busy: false });
      } catch (err) {
        patch({
          busy: false,
          error: err instanceof Error ? err.message : 'Could not save',
        });
      }
    },
    [patch, refresh],
  );

  const updateDirection = useCallback(
    async (provider: HealthProvider, direction: SyncDirection) => {
      patch({ busy: true, error: null });
      try {
        await saveConnection({ provider, direction });
        await refresh();
        patch({ busy: false });
      } catch (err) {
        patch({
          busy: false,
          error: err instanceof Error ? err.message : 'Could not save',
        });
      }
    },
    [patch, refresh],
  );

  const disconnect = useCallback(
    async (provider: HealthProvider) => {
      patch({ busy: true, error: null, message: null });
      try {
        await disconnectProvider(provider);
        await refresh();
        patch({ busy: false, message: 'Disconnected and removed its data' });
      } catch (err) {
        patch({
          busy: false,
          error: err instanceof Error ? err.message : 'Could not disconnect',
        });
      }
    },
    [patch, refresh],
  );

  const sync = useCallback(async () => {
    patch({ busy: true, error: null, message: null });
    try {
      const { pulled, pushed } = await runFullSync();
      const parts: string[] = [];
      if (pulled) parts.push(pulled.summary);
      if (pushed) parts.push(`${pushed} written back`);
      await refresh();
      patch({ busy: false, message: parts.join(' · ') || 'Already up to date' });
    } catch (err) {
      patch({
        busy: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  }, [patch, refresh]);

  const importFile = useCallback(
    async (file: File) => {
      patch({ busy: true, error: null, message: null });
      try {
        const result = await importAppleExport(file);
        await refresh();

        const applied = Object.values(result.applied ?? {}).reduce((a, b) => a + b, 0);
        const parts = [`${result.accepted} imported`];
        if (result.duplicates) parts.push(`${result.duplicates} already had`);
        if (applied) parts.push(`${applied} added to your log`);
        if (result.truncated) {
          parts.push('older history was left out, upload again to continue');
        }

        patch({ busy: false, message: parts.join(', ') });
      } catch (err) {
        patch({
          busy: false,
          error: err instanceof Error ? err.message : 'Import failed',
        });
      }
    },
    [patch, refresh],
  );

  return {
    ...state,
    allMetrics: METRIC_KEYS,
    connectionFor,
    connect,
    disconnect,
    importFile,
    refresh,
    sync,
    updateDirection,
    updateMetrics,
  };
}
