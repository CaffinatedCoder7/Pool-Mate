import { useState } from 'react';
import { CircleUser, FlaskConical, Flag, TimerOff, UserPlus, Users } from 'lucide-react';
import { Button, DemoBadge, Notice } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { useNotify } from '@/context/NotificationContext';
import { isOfferOpen } from '@/lib/pooling';
import type { Booking, PoolOfferRejectionCode, PoolOfferScenario } from '@/types/domain';

type Busy = 'board' | 'complete' | 'expire' | PoolOfferScenario | null;

/**
 * Development-only controls that drive the trip simulation: boarding,
 * completion, and the scripted join-request scenarios. These stand in for
 * events a real backend would push.
 */
export function TripDemoControls({ booking }: { booking: Booking }) {
  const { boardTrip, completeTrip, simulatePoolOffer, expireOffer } = useBooking();
  const { notify } = useNotify();
  const [busy, setBusy] = useState<Busy>(null);
  const [rejection, setRejection] = useState<{ code: PoolOfferRejectionCode; message: string } | null>(null);

  const trip = booking.trip;
  if (!trip) return null;

  const pooling = booking.input.poolPreference === 'POOL_ENABLED';
  const offerOpen = Boolean(trip.offer && isOfferOpen(trip.offer.stage));
  const active = booking.status === 'DRIVER_ASSIGNED';

  async function run<T>(key: Busy, action: () => Promise<T>, onDone?: () => void) {
    setBusy(key);
    try {
      await action();
      onDone?.();
    } catch (e) {
      notify({ title: 'Demo action failed', description: e instanceof Error ? e.message : undefined, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function offer(scenario: PoolOfferScenario) {
    setRejection(null);
    setBusy(scenario);
    try {
      const outcome = await simulatePoolOffer(booking.id, scenario);
      if (!outcome.ok) setRejection({ code: outcome.code, message: outcome.message });
    } catch (e) {
      notify({ title: 'Could not create the offer', description: e instanceof Error ? e.message : undefined, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="demo-controls-heading" className="rounded-lg border border-dashed border-line-strong bg-surface-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="demo-controls-heading" className="flex items-center gap-2 text-body font-semibold">
            <FlaskConical className="h-4 w-4" aria-hidden />
            Demo controls
          </h2>
          <p className="mt-1 text-caption text-ink-secondary">
            These replace events a real backend would send. A join request goes to the driver — switch to Driver mode to accept or
            decline it.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {active && trip.phase === 'DRIVER_EN_ROUTE' && (
          <Button size="sm" variant="secondary" leftIcon={CircleUser} loading={busy === 'board'} onClick={() => run('board', () => boardTrip(booking.id))}>
            Simulate pickup
          </Button>
        )}
        {active && trip.phase === 'ONBOARD' && (
          <Button size="sm" variant="secondary" leftIcon={Flag} loading={busy === 'complete'} onClick={() => run('complete', () => completeTrip(booking.id))}>
            Complete trip
          </Button>
        )}
        {active && pooling && !offerOpen && (
          <>
            <Button size="sm" variant="secondary" leftIcon={UserPlus} loading={busy === 'COMPATIBLE'} onClick={() => offer('COMPATIBLE')}>
              Co-rider wants to join
            </Button>
            <Button size="sm" variant="secondary" leftIcon={Users} loading={busy === 'LARGE_GROUP'} onClick={() => offer('LARGE_GROUP')}>
              Group too large
            </Button>
            <Button size="sm" variant="secondary" leftIcon={Users} loading={busy === 'WOMEN_ONLY_INELIGIBLE'} onClick={() => offer('WOMEN_ONLY_INELIGIBLE')}>
              Non-eligible joiner
            </Button>
          </>
        )}
        {offerOpen && trip.offer && (
          <Button size="sm" variant="secondary" leftIcon={TimerOff} loading={busy === 'expire'} onClick={() => run('expire', () => expireOffer(trip.offer!.id))}>
            Expire offer now
          </Button>
        )}
      </div>

      {!pooling && active && (
        <p className="mt-3 text-caption text-ink-tertiary">This is a solo ride, so no co-rider can be offered a seat.</p>
      )}

      {offerOpen && (
        <Notice className="mt-3" title="Waiting for the driver">
          A request is with the driver. You are not asked to approve it — switch to Driver mode to decide, or let it expire.
        </Notice>
      )}

      {rejection && (
        <Notice className="mt-3" tone="warning" title="Join request rejected — trip unchanged">
          <span className="font-mono text-caption">{rejection.code}</span> · {rejection.message}
        </Notice>
      )}
    </section>
  );
}
