import { Clock3, Route } from 'lucide-react';
import { DemoBadge, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDuration, formatINR } from '@/lib/format';
import type { FareEstimate } from '@/types/domain';

interface FareSummaryProps {
  estimate: FareEstimate | null;
  loading?: boolean;
  className?: string;
}

/** Estimated fare, duration and distance. Always labelled as a demo estimate. */
export function FareSummary({ estimate, loading, className }: FareSummaryProps) {
  if (loading && !estimate) {
    return (
      <div className={cn('rounded-lg border border-line bg-surface-muted p-4', className)} aria-busy="true" aria-label="Calculating estimate">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-20" />
        <Skeleton className="mt-3 h-3 w-40" />
      </div>
    );
  }
  if (!estimate) return null;

  const pooled = estimate.maximumFare !== undefined;

  return (
    <div className={cn('rounded-lg border border-line bg-surface-muted p-4', loading && 'opacity-60', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption font-medium text-ink-secondary">{pooled ? 'Estimated pool fare' : 'Estimated fare'}</p>
        <DemoBadge label="Demo estimate" />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-title tabular-nums">{formatINR(estimate.estimatedFare)}</p>
        {pooled && <p className="text-body-sm text-ink-secondary">max {formatINR(estimate.maximumFare!)}</p>}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4" aria-hidden />
          {formatDuration(estimate.durationMinutes)}
          {estimate.maxDurationMinutes ? `–${formatDuration(estimate.maxDurationMinutes)}` : ''}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Route className="h-4 w-4" aria-hidden />
          {estimate.distanceKm} km
        </span>
      </div>
      <p className="mt-3 text-caption text-ink-tertiary">
        {pooled
          ? 'You pay no more than the maximum. Time may increase only if a compatible co-rider joins.'
          : 'Illustrative estimate. A real fare would be confirmed by PoolMate before the trip.'}
      </p>
    </div>
  );
}
