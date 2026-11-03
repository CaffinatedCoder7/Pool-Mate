import { ArrowLeft, Clock3, SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Page } from '@/components/layout/Page';
import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { BookingStatusBadge, RidePreferenceBadges } from '@/components/rider/BookingBadges';
import { CancelBookingButton } from '@/components/rider/CancelBookingButton';
import { DriverCard } from '@/components/rider/DriverCard';
import { FareSummary } from '@/components/rider/FareSummary';
import { JourneySummary } from '@/components/rider/JourneySummary';
import { ActiveTripView } from '@/components/rider/trip/ActiveTripView';
import { Card, DemoBadge, EmptyState, Notice, Skeleton } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { isCancellable } from '@/lib/booking';
import { formatDateTime } from '@/lib/format';
import { paths } from '@/routes/paths';

/**
 * One trip. Bookings with trip state (driver assigned, onboard, completed)
 * render the full active-trip experience; the rest show a summary.
 */
export function TripDetailPage() {
  const { bookingId = '' } = useParams();
  const { getBooking, loading } = useBooking();
  const booking = getBooking(bookingId);

  const back = (
    <Link to={paths.rider.trips} className="mb-5 inline-flex items-center gap-1.5 rounded text-body-sm font-medium text-ink-secondary hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden /> All trips
    </Link>
  );

  if (loading) {
    return (
      <Page className="max-w-3xl">
        {back}
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-4 h-48 w-full" />
      </Page>
    );
  }

  if (!booking) {
    return (
      <Page className="max-w-3xl">
        {back}
        <Card padding="none">
          <EmptyState icon={SearchX} title="Trip not found" description="It may have been cleared from this browser’s demo data." />
        </Card>
      </Page>
    );
  }

  if (booking.trip) {
    return (
      <Page>
        {back}
        <ActiveTripView booking={booking} />
      </Page>
    );
  }

  const { input, driver } = booking;

  return (
    <Page className="max-w-3xl">
      {back}
      <div className="flex flex-wrap items-center gap-2">
        <BookingStatusBadge status={booking.status} />
        <DemoBadge />
      </div>
      <h1 className="mt-3 text-title">
        {input.pickupLabel} → {input.destinationLabel}
      </h1>
      <p className="mt-1 text-body-sm text-ink-secondary">
        Reference {booking.reference} · Requested {formatDateTime(booking.createdAt)}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <JourneySummary input={input} />
            <div className="mt-4">
              <RidePreferenceBadges input={input} />
            </div>
          </Card>

          {booking.status === 'SCHEDULED' && driver && (
            <p className="flex items-center gap-2 text-body font-medium">
              <Clock3 className="h-4 w-4" aria-hidden /> Reserved — the driver is confirmed for your scheduled time (demo)
            </p>
          )}
          {driver && booking.status !== 'CANCELLED' && <DriverCard driver={driver} womenOnly={input.womenOnly} />}
          {booking.status === 'NO_MATCH' && (
            <Notice tone="warning" title={input.womenOnly ? 'No eligible Women-Only ride found' : 'No ride found'}>
              {booking.noMatchReason}
            </Notice>
          )}
          {booking.status === 'CANCELLED' && <Notice title="This ride was cancelled">No cancellation fee applies in the demo.</Notice>}
        </div>

        <div className="space-y-5">
          <MapPlaceholder variant="inset" title="Trip map" description="Route and live position arrive in a later phase." />
          <FareSummary estimate={booking.estimate} />
          {isCancellable(booking) && <CancelBookingButton booking={booking} fullWidth />}
        </div>
      </div>
    </Page>
  );
}
