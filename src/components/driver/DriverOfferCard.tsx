import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clock3, MapPin, Route, ShieldCheck, Users, X } from 'lucide-react';
import { Badge, Button, Card, DemoBadge, Notice } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { useNotify } from '@/context/NotificationContext';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { secondsUntil, stageLabels } from '@/lib/pooling';
import type { DriverOfferView } from '@/types/domain';

interface DriverOfferCardProps {
  view: DriverOfferView;
  /** The signed-in driver; the service checks it owns the vehicle. */
  actingDriverId: string;
}

/**
 * An incoming co-rider request, shown only to the driver responsible for the
 * vehicle. The driver is the sole approver: nothing about the trip changes
 * until they accept, and the passengers already onboard are never asked.
 *
 * The countdown is display-only — the service owns expiry against the stored
 * deadline and releases the seat hold itself.
 */
export function DriverOfferCard({ view, actingDriverId }: DriverOfferCardProps) {
  const { offer, booking } = view;
  const { markOfferDisplayed, driverRespondToOffer, syncBookings } = useBooking();
  const { notify } = useNotify();
  const [pending, setPending] = useState<'ACCEPT' | 'DECLINE' | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(offer.expiresAt));
  const displayed = useRef<string | null>(null);
  const synced = useRef(false);

  // OFFER_CREATED → OFFER_DISPLAYED → DRIVER_PENDING, once it is on screen.
  useEffect(() => {
    if (offer.stage !== 'OFFER_CREATED' || displayed.current === offer.id) return;
    displayed.current = offer.id;
    void markOfferDisplayed(offer.id);
  }, [offer.stage, offer.id, markOfferDisplayed]);

  useEffect(() => {
    const tick = () => {
      const left = secondsUntil(offer.expiresAt);
      setSecondsLeft(left);
      if (left === 0 && !synced.current) {
        synced.current = true;
        // A read is what surfaces the service's expiry decision.
        void syncBookings();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [offer.expiresAt, syncBookings]);

  async function decide(decision: 'ACCEPT' | 'DECLINE') {
    setPending(decision);
    try {
      await driverRespondToOffer(offer.id, decision, actingDriverId);
      notify({
        title: decision === 'ACCEPT' ? 'Co-rider accepted' : 'Request declined',
        description:
          decision === 'ACCEPT'
            ? 'The route and fares were updated, and both passengers were notified.'
            : 'The seat hold was released. The trip is unchanged.',
        tone: decision === 'ACCEPT' ? 'success' : 'info',
      });
    } catch (e) {
      notify({ title: 'Could not apply your decision', description: e instanceof Error ? e.message : undefined, tone: 'error' });
    } finally {
      setPending(null);
    }
  }

  const insertionPosition = (() => {
    const yourDrop = booking.trip?.stops.findIndex((s) => s.kind === 'DROP' && s.passenger === 'You') ?? -1;
    return yourDrop >= 0 ? `before your passenger's drop (stop ${yourDrop + 1})` : 'on the remaining route';
  })();

  const impact: Array<{ label: string; value: string }> = [
    { label: 'New passengers', value: `${offer.requestedSeats} ${offer.requestedSeats === 1 ? 'seat' : 'seats'}` },
    { label: 'Seats free before', value: String(offer.availableSeatsBefore) },
    { label: 'Seats free after', value: String(offer.availableSeatsAfter) },
    { label: 'Extra distance', value: `${offer.extraDistanceKm} km` },
    { label: 'Extra journey time', value: `${offer.extraDurationMinutes} min` },
    { label: 'Existing passenger delay', value: `${offer.existingRiderDelayMinutes} min` },
    { label: 'Revised ETA', value: `~${offer.revisedEtaMinutes} min` },
    { label: 'Your extra earnings', value: formatINR(offer.driverExtraEarnings) },
  ];

  return (
    <Card className="border-ink shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-heading">New co-rider request</h3>
          <p className="mt-1 truncate text-caption text-ink-secondary">
            On your trip {booking.reference} · {booking.input.pickupLabel} → {booking.input.destinationLabel}
          </p>
        </div>
        <DemoBadge label="Simulated" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="solid">{stageLabels[offer.stage]}</Badge>
        <Badge icon={Clock3}>{secondsLeft}s to decide</Badge>
        {booking.trip?.womenOnlyRestricted && (
          <Badge variant="outline" icon={ShieldCheck}>
            Women-Only trip · joiner eligible (demo)
          </Badge>
        )}
      </div>

      <div className="mt-4 rounded-md border border-line bg-surface-muted p-3">
        <p className="flex items-center gap-1.5 text-caption font-medium text-ink-secondary">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Pickup and drop to insert
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-body-sm font-medium text-ink">
          {offer.pickupLabel}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" aria-hidden />
          {offer.dropLabel}
        </p>
        <p className="mt-1.5 text-caption text-ink-tertiary">Pickup inserted {insertionPosition}; their drop is added at the end.</p>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {impact.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5">
            <dt className="text-caption text-ink-secondary">{row.label}</dt>
            <dd className="text-body-sm font-medium tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3">
        <div>
          <p className="text-caption text-ink-secondary">Existing passenger fare</p>
          <p className="mt-0.5 flex items-center gap-2 tabular-nums">
            <span className="text-body font-semibold">{formatINR(offer.originalFare)}</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-tertiary" aria-hidden />
            <span className="text-heading">{formatINR(offer.revisedFare)}</span>
          </p>
        </div>
        <Badge icon={Users}>
          {offer.requestedSeats} joining {offer.requestedSeats === 1 ? 'seat' : 'seats'}
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button fullWidth leftIcon={Check} loading={pending === 'ACCEPT'} disabled={pending !== null} onClick={() => decide('ACCEPT')}>
          Accept
        </Button>
        <Button fullWidth variant="secondary" leftIcon={X} loading={pending === 'DECLINE'} disabled={pending !== null} onClick={() => decide('DECLINE')}>
          Decline
        </Button>
      </div>

      <p className={cn('mt-2 flex items-start gap-2 text-caption text-ink-tertiary')}>
        <Route className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        Seats are held, not reserved. Route, ETA and fares change only when you accept.
      </p>

      {secondsLeft === 0 && (
        <Notice className="mt-3" tone="warning" title="Time is up">
          This request has reached its deadline and is being released.
        </Notice>
      )}
    </Card>
  );
}
