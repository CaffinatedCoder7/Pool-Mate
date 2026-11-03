import { useState } from 'react';
import { ArrowRight, Clock3, Info, MapPin, Route, X } from 'lucide-react';
import { DemoBadge, IconButton } from '@/components/ui';
import { formatINR } from '@/lib/format';
import type { PoolJoinOffer } from '@/types/domain';

/**
 * Informational notice shown to a passenger already on the trip, AFTER the
 * driver accepted a joiner. Booking a pool-enabled ride is the opt-in, so
 * there is deliberately nothing to approve or decline here — it only reports
 * what changed.
 */
export function CoRiderJoinedNotice({ offer }: { offer: PoolJoinOffer }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const fareDelta = offer.revisedFare - offer.originalFare;
  const fareLine =
    fareDelta === 0
      ? 'Your fare is unchanged.'
      : fareDelta < 0
        ? `Your fare goes down from ${formatINR(offer.originalFare)} to ${formatINR(offer.revisedFare)}.`
        : `Your fare changes from ${formatINR(offer.originalFare)} to ${formatINR(offer.revisedFare)}.`;

  const facts = [
    {
      icon: MapPin,
      label: 'Their pickup',
      value: offer.pickupLabel,
    },
    {
      icon: Clock3,
      label: 'Updated ETA',
      value: `~${offer.revisedEtaMinutes} min${offer.existingRiderDelayMinutes > 0 ? ` (+${offer.existingRiderDelayMinutes} min for you)` : ''}`,
    },
    {
      icon: Route,
      label: 'Added to the route',
      value: `${offer.extraDistanceKm} km · ${offer.extraDurationMinutes} min`,
    },
  ];

  return (
    <section aria-labelledby="co-rider-joined-heading" role="status" className="rounded-lg border border-ink bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <Info className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
          <div className="min-w-0">
            <h2 id="co-rider-joined-heading" className="text-heading">
              A passenger is joining your ride
            </h2>
            <p className="mt-1 text-body-sm text-ink-secondary">
              The driver approved this co-rider for{' '}
              {offer.requestedSeats === 1 ? 'one seat' : `${offer.requestedSeats} seats`}. Nothing is needed from you.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DemoBadge />
          <IconButton icon={X} label="Dismiss this update" size="sm" onClick={() => setDismissed(true)} />
        </div>
      </div>

      <dl className="mt-4 space-y-2.5">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
            <dt className="w-32 shrink-0 text-caption text-ink-tertiary">{label}</dt>
            <dd className="min-w-0 flex-1 text-body-sm font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <p className="text-body-sm text-ink-secondary">{fareLine}</p>
        <p className="flex shrink-0 items-center gap-1.5 tabular-nums">
          <span className="text-body-sm text-ink-tertiary line-through">{formatINR(offer.originalFare)}</span>
          <ArrowRight className="h-3.5 w-3.5 text-ink-tertiary" aria-hidden />
          <span className="text-body font-semibold text-ink">{formatINR(offer.revisedFare)}</span>
        </p>
      </div>

      <p className="mt-3 text-caption text-ink-tertiary">
        Their stops are in your route below. Fares and times are demo estimates.
      </p>
    </section>
  );
}
