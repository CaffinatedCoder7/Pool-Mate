import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SpinnerProps {
  className?: string;
  /** Accessible label; omit when a parent already announces loading. */
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <Loader2
      className={cn('h-4 w-4 animate-spin motion-reduce:animate-none', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'status' : undefined}
    />
  );
}
