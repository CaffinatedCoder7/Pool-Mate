import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, IconButton } from './Button';

type DialogSize = 'sm' | 'md' | 'lg';

const sizes: Record<DialogSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
};

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Action buttons, rendered right-aligned (stacked on mobile). */
  footer?: ReactNode;
  size?: DialogSize;
  /** Prevent closing via Escape/backdrop, e.g. while a request is pending. */
  dismissible?: boolean;
}

/**
 * Modal dialog built on native <dialog>.showModal(): the browser provides the
 * focus trap, inert background, Escape handling and top-layer stacking.
 * Renders as a bottom sheet on mobile and a centred modal from `sm` upward.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Keep the dialog controlled: Escape asks the parent to close instead of closing directly.
    const onCancel = (event: Event) => {
      event.preventDefault();
      if (dismissible) onClose();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [onClose, dismissible]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className={cn('pm-dialog', sizes[size])}
      onClick={(event) => {
        // Clicks on the <dialog> element itself land on the backdrop.
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-heading">
                {title}
              </h2>
              {description && (
                <div id={descId} className="mt-1.5 text-body-sm text-ink-secondary">
                  {description}
                </div>
              )}
            </div>
            {dismissible && <IconButton icon={X} label="Close dialog" size="sm" onClick={onClose} className="-mr-2 -mt-1" />}
          </header>

          {children && <div className="min-h-0 overflow-y-auto px-6 py-3">{children}</div>}

          {footer && (
            <footer className="flex flex-col-reverse gap-2 px-6 pb-6 pt-4 sm:flex-row sm:justify-end">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Shows a spinner on the confirm button and blocks dismissal. */
  pending?: boolean;
}

/**
 * Explicit confirmation step for consequential actions (cancelling a ride,
 * turning off Women-Only, rejecting a pool change).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Go back',
  onConfirm,
  onCancel,
  pending = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      dismissible={!pending}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} loading={pending} className="w-full sm:w-auto">
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
