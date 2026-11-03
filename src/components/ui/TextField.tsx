import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
  hint?: string;
  /** Inline validation message. Shown with an icon so it never relies on colour. */
  error?: string;
  leadingIcon?: LucideIcon;
  /** Slot for a trailing control, e.g. a clear IconButton. */
  trailing?: ReactNode;
  containerClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hideLabel, hint, error, leadingIcon: LeadingIcon, trailing, id, className, containerClassName, disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      <label htmlFor={inputId} className={cn('text-body-sm font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
      </label>

      <div
        className={cn(
          'flex h-12 items-center gap-2.5 rounded-md border bg-surface px-3.5 transition-colors',
          'focus-within:border-ink focus-within:ring-1 focus-within:ring-ink',
          error ? 'border-ink' : 'border-line-strong hover:border-grey-400',
          disabled && 'bg-surface-muted opacity-60',
        )}
      >
        {LeadingIcon && <LeadingIcon className="h-[18px] w-[18px] shrink-0 text-ink-tertiary" aria-hidden />}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-tertiary',
            'focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {trailing}
      </div>

      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-caption font-medium text-ink">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-caption text-ink-tertiary">
            {hint}
          </p>
        )
      )}
    </div>
  );
});
