import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Used for empty, no-result and error states alike; pass a suitable icon and action. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-muted">
        <Icon className="h-5 w-5 text-ink-secondary" aria-hidden />
      </span>
      <h3 className="mt-4 text-heading">{title}</h3>
      {description && <div className="mt-1.5 max-w-sm text-body-sm text-ink-secondary">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
