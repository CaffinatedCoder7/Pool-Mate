import { useState } from 'react';
import { CircleUser, Flag, MapPin } from 'lucide-react';
import { Button, ConfirmDialog } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { useNotify } from '@/context/NotificationContext';
import type { Booking } from '@/types/domain';

type Busy = 'arrive' | 'board' | 'complete' | string | null;

/**
 * Driver trip progression, using the shared service operations so seat
 * accounting stays in one place: arrival → boarding → stops → completion.
 */
export function DriverTripControls({ booking }: { booking: Booking }) {
  const { arriveAtPickup, boardTrip, completeStop, completeTrip } = useBooking();
  const { notify } = useNotify();
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const trip = booking.trip;
  if (!trip || booking.status !== 'DRIVER_ASSIGNED') return null;

  async function run(key: Busy, action: () => Promise<unknown>, success?: string) {
    setBusy(key);
    try {
      await action();
      if (success) notify({ title: success, tone: 'success' });
    } catch (e) {
      notify({ title: 'Could not update the trip', description: e instanceof Error ? e.message : undefined, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  const pendingCoRiderStops = trip.stops.filter((s) => s.status === 'PENDING' && s.passenger !== 'You');
  const yourDropDone = trip.stops.some((s) => s.kind === 'DROP' && s.passenger === 'You' && s.status === 'DONE');

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {trip.phase === 'DRIVER_EN_ROUTE' && (
          <Button size="sm" leftIcon={MapPin} loading={busy === 'arrive'} onClick={() => run('arrive', () => arriveAtPickup(booking.id), 'Arrived at pickup')}>
            Mark arrival at pickup
          </Button>
        )}
        {(trip.phase === 'ARRIVED' || trip.phase === 'DRIVER_EN_ROUTE') && (
          <Button
            size="sm"
            variant={trip.phase === 'ARRIVED' ? 'primary' : 'secondary'}
            leftIcon={CircleUser}
            loading={busy === 'board'}
            onClick={() => run('board', () => boardTrip(booking.id), 'Passenger on board')}
          >
            Confirm boarding
          </Button>
        )}

        {trip.phase === 'ONBOARD' &&
          pendingCoRiderStops.map((stop) => (
            <Button
              key={stop.id}
              size="sm"
              variant="secondary"
              leftIcon={MapPin}
              loading={busy === stop.id}
              onClick={() => run(stop.id, () => completeStop(booking.id, stop.id), `${stop.kind === 'PICKUP' ? 'Picked up' : 'Dropped'} co-rider`)}
            >
              {stop.kind === 'PICKUP' ? 'Co-rider picked up' : 'Co-rider dropped'}
            </Button>
          ))}

        {trip.phase === 'ONBOARD' && (
          <Button size="sm" variant={pendingCoRiderStops.length ? 'secondary' : 'primary'} leftIcon={Flag} onClick={() => setConfirmComplete(true)}>
            Complete trip
          </Button>
        )}
      </div>

      {trip.phase === 'ONBOARD' && pendingCoRiderStops.length > 0 && (
        <p className="mt-2 text-caption text-ink-tertiary">
          {pendingCoRiderStops.length} co-rider {pendingCoRiderStops.length === 1 ? 'stop' : 'stops'} still to do.
        </p>
      )}
      {yourDropDone && <p className="mt-2 text-caption text-ink-tertiary">Main passenger dropped.</p>}

      <ConfirmDialog
        open={confirmComplete}
        pending={busy === 'complete'}
        title="Complete this trip?"
        description="All seats on the vehicle are released and the trip moves to your completed list. This cannot be undone in the demo."
        confirmLabel="Complete trip"
        cancelLabel="Keep driving"
        onCancel={() => setConfirmComplete(false)}
        onConfirm={() =>
          run('complete', async () => {
            await completeTrip(booking.id);
            setConfirmComplete(false);
          }, 'Trip completed')
        }
      />
    </>
  );
}
