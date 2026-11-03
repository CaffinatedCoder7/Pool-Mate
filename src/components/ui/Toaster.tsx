import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { toneIcons, toneLabels, type Tone } from './tone';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: Tone;
  durationMs: number;
}

interface ToasterProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

/**
 * Presentational toast stack. Sits above the mobile bottom nav and in the
 * bottom-right corner on desktop. Driven by NotificationContext.
 */
export function Toaster({ toasts, onDismiss }: ToasterProps) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end lg:px-0"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const Icon = toneIcons[toast.tone];

  useEffect(() => {
    if (toast.durationMs <= 0) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface p-4 shadow-lg',
        toast.tone === 'error' || toast.tone === 'warning' ? 'border-ink' : 'border-line',
      )}
    >
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="sr-only">{toneLabels[toast.tone]}: </span>
        <p className="text-body-sm font-semibold text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-caption text-ink-secondary">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-m-1 rounded p-1 text-ink-tertiary transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
