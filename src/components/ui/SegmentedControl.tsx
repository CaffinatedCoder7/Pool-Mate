import { useRef, type KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. */
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

/** Single-choice control (radiogroup semantics, arrow-key navigation). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex rounded-md border border-line bg-surface-muted p-1',
        fullWidth && 'flex w-full',
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors duration-150',
              size === 'sm' ? 'h-8 px-3 text-caption' : 'h-10 px-4 text-body-sm',
              fullWidth && 'flex-1',
              selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink',
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
