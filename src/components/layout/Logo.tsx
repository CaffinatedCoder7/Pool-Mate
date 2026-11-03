import { cn } from '@/lib/cn';

/** PoolMate mark: a route joining two stops. Wordmark hidden on very small screens when `compact`. */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill="rgb(var(--pm-ink))" />
        <path d="M9.5 22.5c0-5 4-6.5 6.5-6.5s6.5-1.5 6.5-6.5" stroke="#fff" strokeWidth="2.25" strokeLinecap="round" fill="none" />
        <circle cx="9.5" cy="22.5" r="2.5" fill="#fff" />
        <circle cx="22.5" cy="9.5" r="2.5" fill="rgb(var(--pm-ink))" stroke="#fff" strokeWidth="2" />
      </svg>
      <span className={cn('text-[1.0625rem] font-semibold tracking-[-0.02em] text-ink', compact && 'hidden sm:inline')}>PoolMate</span>
    </span>
  );
}
