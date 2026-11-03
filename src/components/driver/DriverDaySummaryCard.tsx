import { Card, DemoBadge, Skeleton } from '@/components/ui';
import { formatINR } from '@/lib/format';
import type { DriverDaySummary } from '@/types/domain';

/** Illustrative day figures, derived from this driver's completed demo trips. */
export function DriverDaySummaryCard({ summary }: { summary: DriverDaySummary | null }) {
  if (!summary) {
    return (
      <Card aria-busy="true" aria-label="Loading today's figures">
        <Skeleton className="h-4 w-28" />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const tiles = [
    { label: 'Earnings', value: formatINR(summary.earnings) },
    { label: 'Trips done', value: String(summary.completedTrips) },
    { label: 'Distance', value: `${summary.distanceKm} km` },
    { label: 'Pooled trips', value: String(summary.poolingTrips) },
  ];

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-heading">Today</h2>
          <p className="mt-1 text-caption text-ink-secondary">
            Added up from your completed demo trips — not real earnings, and no payment is processed.
          </p>
        </div>
        <DemoBadge label="Demo figures" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label}>
            <dt className="text-caption text-ink-tertiary">{tile.label}</dt>
            <dd className="mt-0.5 text-title tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>

      {summary.completedTrips === 0 && (
        <p className="mt-4 border-t border-line pt-3 text-caption text-ink-tertiary">
          Nothing completed today yet. Finish a demo trip and these figures update.
        </p>
      )}
    </Card>
  );
}
