import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Padding = 'none' | 'sm' | 'md' | 'lg';

const paddings: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-7',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  /** Adds hover affordance for cards that act as a single clickable target. */
  interactive?: boolean;
  /** Emphasised state, e.g. a selected ride option. */
  selected?: boolean;
}

export function Card({ padding = 'md', interactive, selected, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-surface shadow-xs',
        selected ? 'border-ink ring-1 ring-ink' : 'border-line',
        interactive && 'cursor-pointer transition-colors duration-150 hover:border-line-strong hover:bg-grey-50',
        paddings[padding],
        className,
      )}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned content such as a badge or button. */
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-heading">{title}</h3>
        {description && <p className="mt-1 text-body-sm text-ink-secondary">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4', className)} {...props} />;
}
