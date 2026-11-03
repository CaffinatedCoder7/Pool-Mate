import { cn } from '@/lib/cn';

/** Restrained loading placeholder. Pulse is disabled under reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded bg-surface-sunken motion-reduce:animate-none', className)} />;
}
