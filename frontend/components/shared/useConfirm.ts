'use client';

import { useCallback, useState } from 'react';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmText: string;
  isDestructive?: boolean;
  action: () => void | Promise<void>;
}

/**
 * Drives a single <ConfirmModal>. Spread `modalProps` onto the modal and call
 * `ask(...)` wherever a confirmation is needed.
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const ask = useCallback((next: ConfirmRequest) => setRequest(next), []);
  const close = useCallback(() => setRequest(null), []);

  const modalProps = {
    isOpen: !!request,
    title: request?.title || '',
    message: request?.message || '',
    confirmText: request?.confirmText || '',
    isDestructive: request?.isDestructive || false,
    onClose: close,
    onConfirm: () => {
      // The modal closes first so the action can show its own toasts/spinners.
      const action = request?.action;
      setRequest(null);
      action?.();
    },
  };

  return { ask, close, modalProps };
}
