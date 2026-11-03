import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { toneIcons, toneLabels, type Tone } from './tone';

export interface NoticeProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  /** Optional inline action, e.g. a small button. */
  action?: ReactNode;
  className?: string;
}

/**
 * Inline, persistent notification. Use for important state that belongs in
 * the page/panel (trip changes, no-match states). Use toasts only for short,
 * non-critical confirmations.
 */
export function Notice({ tone = 'info', title, children, action, className }: NoticeProps) {
  const Icon = toneIcons[tone];
  const emphasised = tone === 'warning' || tone === 'error';

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-md border p-4',
        emphasised ? 'border-ink bg-surface' : 'border-line bg-surface-muted',
        className,
      )}
    >
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="sr-only">{toneLabels[tone]}: </span>
        {title && <p className="text-body-sm font-semibold text-ink">{title}</p>}
        {children && <div className={cn('text-body-sm text-ink-secondary', title && 'mt-0.5')}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
