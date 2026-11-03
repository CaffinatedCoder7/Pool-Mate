import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/** Accessible on/off switch (role="switch") with visible label and on/off text. */
export function Switch({ checked, onCheckedChange, label, description, disabled, className }: SwitchProps) {
  const id = useId();
  const descId = description ? `${id}-desc` : undefined;

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="text-body font-medium text-ink">
          {label}
        </label>
        {description && (
          <p id={descId} className="mt-0.5 text-caption text-ink-secondary">
            {description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-caption font-medium text-ink-tertiary" aria-hidden>
          {checked ? 'On' : 'Off'}
        </span>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={descId}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-150',
            'disabled:cursor-not-allowed disabled:opacity-45',
            checked ? 'border-ink bg-ink' : 'border-line-strong bg-surface-sunken',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150',
              checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
            )}
          />
        </button>
      </div>
    </div>
  );
}
