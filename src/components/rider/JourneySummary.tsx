import { CalendarClock, Zap } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { RideSearchInput } from '@/types/domain';

/** Pickup → destination with the ride time. Used in review, confirmation and trip detail. */
export function JourneySummary({ input }: { input: RideSearchInput }) {
  return (
    <div>
      <ol className="relative space-y-4">
        <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-line-strong" />
        <li className="relative flex gap-3">
          <span aria-hidden className="mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-ink bg-surface" />
          <div className="min-w-0">
            <p className="text-caption text-ink-tertiary">Pickup</p>
            <p className="text-body font-medium text-ink">{input.pickupLabel}</p>
          </div>
        </li>
        <li className="relative flex gap-3">
          <span aria-hidden className="mt-1.5 h-[11px] w-[11px] shrink-0 rounded-sm bg-ink" />
          <div className="min-w-0">
            <p className="text-caption text-ink-tertiary">Destination</p>
            <p className="text-body font-medium text-ink">{input.destinationLabel}</p>
          </div>
        </li>
      </ol>
      <p className="mt-4 flex items-center gap-2 text-body-sm text-ink-secondary">
        {input.bookingMode === 'SCHEDULED' && input.scheduledAt ? (
          <>
            <CalendarClock className="h-4 w-4" aria-hidden />
            {formatDateTime(input.scheduledAt)}
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" aria-hidden />
            Leave now — no waiting for co-riders
          </>
        )}
      </p>
    </div>
  );
}
