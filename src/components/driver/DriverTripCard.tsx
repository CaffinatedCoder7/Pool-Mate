import { ArrowRight, Clock3, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SeatBreakdown } from '@/components/rider/SeatBreakdown';
import { TripStopsList } from '@/components/rider/trip/TripStopsList';
import { Badge, Button, Card, DemoBadge } from '@/components/ui';
import { formatDateTime, formatDuration, formatINR } from '@/lib/format';
import { paths } from '@/routes/paths';
import type { Booking, TripPhase } from '@/types/domain';
import { DriverTripControls } from './DriverTripControls';

const phaseLabels: Record<TripPhase, string> = {
  DRIVER_EN_ROUTE: 'Heading to pickup',
  ARRIVED: 'At pickup point',
  ONBOARD: 'Passenger on board',
  COMPLETED: 'Completed',
};

interface DriverTripCardProps {
  booking: Booking;
  /** Dashboard view links out to trip management instead of showing controls. */
  variant?: 'summary' | 'full';
}

/** One of the driver's trips: group size, route, phase, stops, seats, earnings. */
export function DriverTripCard({ booking, variant = 'full' }: DriverTripCardProps) {
  const { input, trip, estimate } = booking;
  const fare = trip?.fare ?? estimate.estimatedFare;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-1.5 text-body font-semibold">
            {input.pickupLabel}
            <ArrowRight className="h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
            {input.destinationLabel}
          </p>
          <p className="mt-1 text-caption text-ink-secondary">
            {booking.reference} · {formatDateTime(input.scheduledAt ?? booking.createdAt)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-heading tabular-nums">{formatINR(fare)}</p>
          <p className="text-caption text-ink-tertiary">trip fare</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {trip && <Badge variant="solid">{phaseLabels[trip.phase]}</Badge>}
        <Badge icon={Users}>
          {input.seats} {input.seats === 1 ? 'passenger' : 'passengers'}
          {trip && trip.joinedSeats > 0 ? ` + ${trip.joinedSeats} joined` : ''}
        </Badge>
        {input.poolPreference === 'POOL_ENABLED' ? <Badge>Pool-enabled</Badge> : <Badge>Solo</Badge>}
        {trip?.womenOnlyRestricted && (
          <Badge variant="outline" icon={ShieldCheck}>
            Women-Only trip
          </Badge>
        )}
        <DemoBadge />
      </div>

      {trip && (
        <>
          {trip.phase !== 'COMPLETED' && (
            <p className="mt-3 flex items-center gap-2 text-body-sm font-medium">
              <Clock3 className="h-4 w-4 shrink-0" aria-hidden />
              {trip.phase === 'ARRIVED' ? 'Waiting at the pickup point' : `${formatDuration(trip.etaMinutes)} remaining (demo)`}
            </p>
          )}

          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-3 text-micro uppercase text-ink-tertiary">Ordered stops</p>
            <TripStopsList stops={trip.stops} />
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-micro uppercase text-ink-tertiary">Vehicle seats</p>
            <SeatBreakdown seats={trip.seats} />
          </div>

          {variant === 'full' ? (
            <div className="mt-4 border-t border-line pt-4">
              <DriverTripControls booking={booking} />
            </div>
          ) : (
            booking.status === 'DRIVER_ASSIGNED' && (
              <div className="mt-4 border-t border-line pt-4">
                <Link to={paths.driver.trips}>
                  <Button size="sm" variant="secondary">
                    Open trip management
                  </Button>
                </Link>
              </div>
            )
          )}
        </>
      )}
    </Card>
  );
}
