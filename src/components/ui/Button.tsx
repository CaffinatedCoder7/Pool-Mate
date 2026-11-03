import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-black',
  secondary: 'border border-line-strong bg-surface text-ink shadow-xs hover:bg-surface-muted active:bg-surface-sunken',
  subtle: 'bg-surface-muted text-ink hover:bg-surface-sunken',
  ghost: 'text-ink hover:bg-surface-muted active:bg-surface-sunken',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 rounded px-3 text-body-sm',
  md: 'h-11 rounded-md px-4 text-body',
  lg: 'h-[52px] rounded-lg px-5 text-body-lg',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-[18px] w-[18px]',
  lg: 'h-5 w-5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const iconClass = cn('shrink-0', iconSizes[size]);
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? <Spinner className={iconClass} /> : LeftIcon && <LeftIcon className={iconClass} aria-hidden />}
      {children}
      {RightIcon && !loading && <RightIcon className={iconClass} aria-hidden />}
    </button>
  );
});

const iconButtonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 w-9 rounded',
  md: 'h-11 w-11 rounded-md',
  lg: 'h-[52px] w-[52px] rounded-lg',
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Required accessible name — icon-only controls must be labelled. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(base, variants[variant], iconButtonSizes[size], className)}
      {...props}
    >
      <Icon className={iconSizes[size]} aria-hidden />
    </button>
  );
});
