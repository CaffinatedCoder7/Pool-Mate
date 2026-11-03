import { useEffect } from 'react';
import { CheckCircle2, Clock3, Route, ShieldCheck, Users } from 'lucide-react';
import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { Badge, Button, Card, DemoBadge, Notice } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { useNotify } from '@/context/NotificationContext';
import { formatDuration, formatINR } from '@/lib/format';
import { isOfferAccepted } from '@/lib/pooling';
import type { Booking, TripPoolStatus } from '@/types/domain';
import { BookingStatusBadge, RidePreferenceBadges } from '../BookingBadges';
import { CancelBookingButton } from '../CancelBookingButton';
import { DriverCard } from '../DriverCard';
import { SafetyActionPanel } from '../SafetyActionPanel';
import { SeatBreakdown } from '../SeatBreakdown';
import { CoRiderJoinedNotice } from './CoRiderJoinedNotice';
import { TripDemoControls } from './TripDemoControls';
import { TripStopsList } from './TripStopsList';

const poolStatusLabels: Record<TripPoolStatus, string> = {
  SOLO: 'Solo ride · nobody else can join',
  POOL_OPEN: 'Pool open · a compatible co-rider may be offered a seat',
  POOL_JOINED: 'Co-rider added to this trip',
  POOL_CLOSED: 'Pool closed',
};

/**
 * Active trip screen: status, driver and vehicle, live seat state, ordered
 * stops, ETA, fare, pool status, join offers, cancellation, completion and
 * safety shortcuts. All movement is demo state — there is no GPS here.
 */
export function ActiveTripView({ booking }: { booking: Booking }) {
  const { completeTrip, syncBookings } = useBooking();
  const { notify } = useNotify();

  // Opening the trip is a read, which is where the service reconciles an offer
  // that lapsed while this screen was closed.
  useEffect(() => {
    void syncBookings();
  }, [syncBookings]);

  const trip = booking.trip;
  if (!trip) return null;

  const { driver, input } = booking;
  const fareChanged = trip.fare !== booking.estimate.estimatedFare;
  const etaLabel =
    trip.phase === 'COMPLETED'
      ? 'Trip completed'
      : trip.phase === 'ONBOARD'
        ? `Arriving in about ${formatDuration(trip.etaMinutes)}`
        : `Driver arriving in about ${formatDuration(trip.etaMinutes)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <BookingStatusBadge status={booking.status} />
        <Badge icon={trip.phase === 'ONBOARD' ? Users : Clock3}>
          {trip.phase === 'ONBOARD' ? 'On board' : trip.phase === 'COMPLETED' ? 'Finished' : 'Driver on the way'}
        </Badge>
        {trip.womenOnlyRestricted && (
          <Badge variant="solid" icon={ShieldCheck}>
            Women-Only trip
          </Badge>
        )}
        <DemoBadge />
      </div>

      <div>
        <h1 className="text-title">
          {input.pickupLabel} → {input.destinationLabel}
        </h1>
        <p className="mt-1.5 flex items-center gap-2 text-body font-medium text-ink">
          <Clock3 className="h-4 w-4 shrink-0" aria-hidden />
          {etaLabel}
        </p>
        <p className="mt-1 text-caption text-ink-tertiary">
          Reference {booking.reference} · simulated progress, no GPS tracking
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {/* Passengers already onboard are informed, never asked to approve. */}
          {trip.offer && isOfferAccepted(trip.offer.stage) && <CoRiderJoinedNotice offer={trip.offer} />}

          <Card>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-heading">Route</h2>
              <Badge icon={Users}>
                {trip.poolStatus === 'POOL_JOINED' ? `${trip.joinedSeats} joined` : `${input.seats} ${input.seats === 1 ? 'seat' : 'seats'} yours`}
              </Badge>
            </div>
            <p className="mb-4 mt-1 text-caption text-ink-secondary">{poolStatusLabels[trip.poolStatus]}</p>
            <TripStopsList stops={trip.stops} />
          </Card>

          <Card>
            <h2 className="text-heading">Vehicle seats</h2>
            <p className="mb-3 mt-1 text-caption text-ink-secondary">
              Live seat state for this vehicle, counted in seats and including your {input.seats}{' '}
              {input.seats === 1 ? 'passenger' : 'passengers'}.
            </p>
            <SeatBreakdown seats={trip.seats} />
          </Card>

          <TripDemoControls booking={booking} />
        </div>

        <div className="space-y-5 lg:col-span-2">
          <MapPlaceholder variant="inset" title="Trip map" description="Route, stops and live position arrive in a later phase." />

          {driver && <DriverCard driver={driver} womenOnly={input.womenOnly} />}

          <div className="rounded-lg border border-line bg-surface-muted p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-caption font-medium text-ink-secondary">Current fare estimate</p>
              <DemoBadge label="Demo estimate" />
            </div>
            <p className="mt-1 text-title tabular-nums">{formatINR(trip.fare)}</p>
            {fareChanged && (
              <p className="mt-1 text-caption text-ink-secondary">
                Was {formatINR(booking.estimate.estimatedFare)} before the co-rider joined.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Route className="h-4 w-4" aria-hidden />
                {booking.estimate.distanceKm} km
              </span>
            </div>
            <p className="mt-2 text-caption text-ink-tertiary">No payment is taken in this prototype.</p>
          </div>

          <div>
            <h2 className="mb-2 text-body font-semibold">Ride preferences</h2>
            <RidePreferenceBadges input={input} />
          </div>

          <SafetyActionPanel />

          {booking.status === 'DRIVER_ASSIGNED' && (
            <div className="flex flex-col gap-2">
              {trip.phase === 'ONBOARD' && (
                <Button
                  variant="secondary"
                  fullWidth
                  leftIcon={CheckCircle2}
                  onClick={() =>
                    completeTrip(booking.id)
                      .then(() => notify({ title: 'Trip completed (demo)', tone: 'success' }))
                      .catch(() => notify({ title: 'Could not complete the trip', tone: 'error' }))
                  }
                >
                  Mark trip completed
                </Button>
              )}
              <CancelBookingButton booking={booking} variant="ghost" fullWidth />
            </div>
          )}

          {trip.phase === 'COMPLETED' && (
            <Notice tone="success" title="Trip completed">
              Seats were released back to the vehicle. The fare shown was an estimate.
            </Notice>
          )}
        </div>
      </div>
    </div>
  );
}
