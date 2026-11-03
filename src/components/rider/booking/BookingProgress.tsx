import { useState } from 'react';
import { Check, CheckCircle2, Circle, Clock3, Plus, RotateCcw, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, ConfirmDialog, DemoBadge, EmptyState, Notice, Spinner } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { useNotify } from '@/context/NotificationContext';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { paths } from '@/routes/paths';
import type { Booking } from '@/types/domain';
import { BookingStatusBadge, RidePreferenceBadges } from '../BookingBadges';
import { CancelBookingButton } from '../CancelBookingButton';
import { DriverCard } from '../DriverCard';
import { FareSummary } from '../FareSummary';
import { JourneySummary } from '../JourneySummary';

interface BookingProgressProps {
  booking: Booking;
  /** Clear the flow and start a fresh booking. */
  onNewBooking: () => void;
  /** Return to the form keeping the current draft. */
  onEdit: () => void;
  /** Return to vehicle selection. */
  onChooseVehicle: () => void;
  onRetry: (bookingId: string) => void;
}

/** Steps 8–10: simulated search, driver assignment, confirmation (plus no-match / cancelled). */
export function BookingProgress({ booking, onNewBooking, onEdit, onChooseVehicle, onRetry }: BookingProgressProps) {
  switch (booking.status) {
    case 'SEARCHING':
      return <Searching booking={booking} />;
    case 'NO_MATCH':
      return <NoMatch booking={booking} onEdit={onEdit} onChooseVehicle={onChooseVehicle} onRetry={onRetry} />;
    case 'DRIVER_ASSIGNED':
    case 'SCHEDULED':
      return <Confirmed booking={booking} onNewBooking={onNewBooking} />;
    default:
      return (
        <EmptyState
          icon={XCircle}
          title={booking.status === 'CANCELLED' ? 'Ride cancelled' : 'Trip completed'}
          description={`${booking.input.pickupLabel} → ${booking.input.destinationLabel}`}
          action={<Button onClick={onNewBooking}>Start a new booking</Button>}
        />
      );
  }
}

function Step({ state, label }: { state: 'done' | 'current' | 'todo'; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
          state === 'done' ? 'border-ink bg-ink text-ink-inverse' : state === 'current' ? 'border-ink' : 'border-line-strong',
        )}
      >
        {state === 'done' ? <Check className="h-3.5 w-3.5" aria-hidden /> : state === 'current' ? <Spinner className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 text-ink-disabled" aria-hidden />}
      </span>
      <span className={cn('text-body-sm', state === 'todo' ? 'text-ink-tertiary' : 'font-medium text-ink')}>
        {label}
        <span className="sr-only"> — {state === 'done' ? 'done' : state === 'current' ? 'in progress' : 'pending'}</span>
      </span>
    </li>
  );
}

function Searching({ booking }: { booking: Booking }) {
  const scheduled = booking.input.bookingMode === 'SCHEDULED';
  return (
    <div className="space-y-6" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-micro uppercase text-ink-tertiary">Request {booking.reference}</p>
          <h1 className="mt-1.5 text-title">{scheduled ? 'Reserving your ride…' : 'Finding your driver…'}</h1>
        </div>
        <DemoBadge label="Simulated" />
      </div>
      <p className="text-body-sm text-ink-secondary">
        This is a scripted demo search over sample vehicles — no real drivers are contacted.
      </p>

      <ol className="space-y-3 rounded-lg border border-line bg-surface-muted p-4">
        <Step state="done" label="Request sent" />
        <Step state="current" label={booking.input.womenOnly ? 'Checking eligible Women-Only demo vehicles' : 'Checking nearby demo vehicles'} />
        <Step state="todo" label={scheduled ? 'Reservation confirmed' : 'Driver assigned'} />
      </ol>

      <JourneySummary input={booking.input} />
      <RidePreferenceBadges input={booking.input} />

      <CancelBookingButton booking={booking} label="Cancel request" fullWidth />
    </div>
  );
}

function NoMatch({
  booking,
  onEdit,
  onChooseVehicle,
  onRetry,
}: {
  booking: Booking;
  onEdit: () => void;
  onChooseVehicle: () => void;
  onRetry: (id: string) => void;
}) {
  const { requestRide, updateDraft } = useBooking();
  const { notify } = useNotify();
  const [retrying, setRetrying] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const womenOnly = booking.input.womenOnly;

  async function searchAgain() {
    setRetrying(true);
    try {
      const next = await requestRide(booking.input);
      onRetry(next.id);
    } catch {
      notify({ title: 'Could not search again', tone: 'error' });
      setRetrying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-micro uppercase text-ink-tertiary">Request {booking.reference}</p>
        <h1 className="mt-1.5 text-title">{womenOnly ? 'No eligible Women-Only ride found yet' : 'No ride found'}</h1>
      </div>
      <Notice tone="warning" title="Your request was not changed">
        {booking.noMatchReason} {womenOnly && 'We did not book a mixed ride.'}
      </Notice>
      <JourneySummary input={booking.input} />
      <RidePreferenceBadges input={booking.input} />

      <div className="flex flex-col gap-2">
        {booking.requestedVehicleId ? (
          <Button fullWidth onClick={onChooseVehicle}>
            Choose another vehicle
          </Button>
        ) : (
          <Button fullWidth leftIcon={RotateCcw} loading={retrying} onClick={searchAgain}>
            Search again
          </Button>
        )}
        <Button fullWidth variant="secondary" onClick={onEdit}>
          Change pickup or time
        </Button>
        {womenOnly && (
          <Button fullWidth variant="ghost" onClick={() => setConfirmOff(true)}>
            Change preference
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOff}
        title="Search without Women-Only?"
        description="This changes your search criteria: drivers and co-riders of any gender may be matched. You will review the ride again before it is requested."
        confirmLabel="Turn off and edit"
        cancelLabel="Keep Women-Only"
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => {
          updateDraft({ womenOnly: false });
          setConfirmOff(false);
          onEdit();
        }}
      />
    </div>
  );
}

function Confirmed({ booking, onNewBooking }: { booking: Booking; onNewBooking: () => void }) {
  const scheduled = booking.status === 'SCHEDULED';
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <BookingStatusBadge status={booking.status} />
          <DemoBadge />
        </div>
        <h1 className="mt-3 flex items-center gap-2 text-title">
          <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden />
          {scheduled ? 'Ride scheduled' : 'Booking confirmed'}
        </h1>
        <p className="mt-1 text-body-sm text-ink-secondary">Reference {booking.reference}</p>
      </div>

      {booking.driver && (
        <>
          <p className="flex items-center gap-2 text-body font-medium text-ink">
            <Clock3 className="h-4 w-4" aria-hidden />
            {scheduled && booking.input.scheduledAt
              ? `Pickup ${formatDateTime(booking.input.scheduledAt)}`
              : `Arriving in about ${booking.driver.pickupEtaMinutes} min (demo)`}
          </p>
          <DriverCard driver={booking.driver} womenOnly={booking.input.womenOnly} />
        </>
      )}

      <JourneySummary input={booking.input} />
      <RidePreferenceBadges input={booking.input} />
      {booking.input.poolPreference === 'POOL_ENABLED' && (
        <Notice>Your ride starts as normal. If a compatible co-rider can join later, you’ll be asked to review the change first.</Notice>
      )}
      <FareSummary estimate={booking.estimate} />

      <div className="flex flex-col gap-2">
        <Link
          to={paths.rider.trip(booking.id)}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-body font-medium text-primary-foreground hover:bg-primary-hover"
        >
          View trip details
        </Link>
        <Button variant="secondary" fullWidth leftIcon={Plus} onClick={onNewBooking}>
          Book another ride
        </Button>
        <CancelBookingButton booking={booking} variant="ghost" fullWidth />
      </div>
    </div>
  );
}
