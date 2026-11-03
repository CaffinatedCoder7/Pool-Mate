import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bookingTime } from '@/lib/booking';
import { formatDateTime, formatINR } from '@/lib/format';
import { paths } from '@/routes/paths';
import type { Booking } from '@/types/domain';
import { BookingStatusBadge } from './BookingBadges';

/** Compact trip row linking to the trip detail page. */
export function TripCard({ booking }: { booking: Booking }) {
  const { input, estimate } = booking;
  return (
    <Link
      to={paths.rider.trip(booking.id)}
      className="group flex items-center gap-3 rounded-md border border-line bg-surface p-3.5 transition-colors hover:border-line-strong hover:bg-grey-50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-ink">
          {input.pickupLabel} <span className="font-normal text-ink-tertiary">→</span> {input.destinationLabel}
        </p>
        <p className="mt-0.5 text-caption text-ink-tertiary">
          {formatDateTime(bookingTime(booking))} · {formatINR(estimate.estimatedFare)} est.
          {input.womenOnly ? ' · Women-Only' : ''}
          {input.poolPreference === 'POOL_ENABLED' ? ' · Pool' : ''}
        </p>
        <div className="mt-2">
          <BookingStatusBadge status={booking.status} />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-tertiary group-hover:text-ink" aria-hidden />
    </Link>
  );
}
