'use client';

// Small inline icons pulled out of the modals that used to repeat this markup.
// Each takes a className so callers control sizing.

interface IconProps {
  className?: string;
}

const stroke = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2,
};

function Icon({
  className = 'w-4 h-4',
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {children}
    </svg>
  );
}

export function SignOutIcon({ className = 'w-3.5 h-3.5' }: IconProps) {
  return (
    <Icon className={className}>
      <path
        {...stroke}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </Icon>
  );
}

export function CameraIcon({ className = 'w-3 h-3 sm:w-3.5 sm:h-3.5' }: IconProps) {
  return (
    <Icon className={className}>
      <path
        {...stroke}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path {...stroke} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </Icon>
  );
}

export function InfoIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <Icon className={className}>
      <path
        {...stroke}
        d="M13 16h-1v-4h-1m1-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </Icon>
  );
}

export function CheckIcon({ className = 'w-3.5 h-3.5' }: IconProps) {
  return (
    <Icon className={className}>
      <path {...stroke} strokeWidth={3} d="M5 13l4 4L19 7" />
    </Icon>
  );
}

export function CloseIcon({ className = 'w-3.5 h-3.5' }: IconProps) {
  return (
    <Icon className={className}>
      <path {...stroke} strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
    </Icon>
  );
}

export function PencilIcon({ className = 'w-3 h-3' }: IconProps) {
  return (
    <Icon className={className}>
      <path
        {...stroke}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </Icon>
  );
}

export function TrashIcon({ className = 'w-3.5 h-3.5' }: IconProps) {
  return (
    <Icon className={className}>
      <path
        {...stroke}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </Icon>
  );
}

export function DragHandleIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
}

export function LockIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <Icon className={className}>
      <path
        {...stroke}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </Icon>
  );
}
