'use client';

import type { ReactNode } from 'react';

interface ModalShellProps {
  children: ReactNode;
  /* Wider spacing for list style modals, tighter for confirmations */
  spacing?: 'tight' | 'loose';
}

/* The backdrop and panel every dashboard modal sits in */
export default function ModalShell({
  children,
  spacing = 'loose',
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${spacing === 'loose' ? 'space-y-6' : 'space-y-4'}`}
      >
        {children}
      </div>
    </div>
  );
}
