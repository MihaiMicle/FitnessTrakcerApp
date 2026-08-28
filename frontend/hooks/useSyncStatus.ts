'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getStatus,
  retryFailedOperations,
  subscribe,
  type SyncStatus,
} from '@/lib/offline/manager';

/* Live view of the write queue, for the badge in the workout header */
export function useSyncStatus(): SyncStatus & { retry: () => void } {
  const [status, setStatus] = useState<SyncStatus>(() => ({
    pending: 0,
    failed: 0,
    syncing: false,
    online: true,
  }));

  useEffect(() => {
    setStatus(getStatus());
    return subscribe(setStatus);
  }, []);

  const retry = useCallback(() => retryFailedOperations(), []);

  return { ...status, retry };
}
