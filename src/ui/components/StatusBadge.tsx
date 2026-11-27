import type { ReactNode } from 'react';

export type BadgeTone = 'pine' | 'cranberry' | 'peach' | 'neutral';

interface StatusBadgeProps {
  tone: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}

export function StatusBadge({ tone, icon, children }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
