import type { ReactNode } from 'react';
import { FlaskConical, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'neutral' | 'outline' | 'solid';

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-ink-secondary border border-line',
  outline: 'bg-surface text-ink border border-line-strong',
  solid: 'bg-surface-inverse text-ink-inverse border border-surface-inverse',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function Badge({ variant = 'neutral', icon: Icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-caption font-medium',
        variants[variant],
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}

/** Marks simulated data (drivers, fares, verification) so it is never mistaken for real. */
export function DemoBadge({ label = 'Demo', className }: { label?: string; className?: string }) {
  return (
    <Badge variant="outline" icon={FlaskConical} className={cn('uppercase tracking-wide', className)}>
      <span className="text-micro">{label}</span>
    </Badge>
  );
}
