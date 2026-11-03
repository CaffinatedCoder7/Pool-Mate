import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Clock3, CreditCard, Route } from 'lucide-react';
import { Button, DemoBadge, Notice } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { useFareEstimate } from '@/hooks/useFareEstimate';
import { draftToSearchInput, hasErrors, validateDraft } from '@/lib/booking';
import { formatDuration } from '@/lib/format';
import { RidePreferenceBadges } from '../BookingBadges';
import { JourneySummary } from '../JourneySummary';
import { VehicleOptionCard } from '../VehicleOptionCard';

interface BookingReviewProps {
  onBack: () => void;
  /** Back to vehicle selection. */
  onChangeVehicle: () => void;
  onRequested: (bookingId: string) => void;
}

/** Review the journey and chosen vehicle, then send the request. */
export function BookingReview({ onBack, onChangeVehicle, onRequested }: BookingReviewProps) {
  const { draft, requestRide, seatLimits, selectedVehicle } = useBooking();
  const input = useMemo(() => draftToSearchInput(draft), [draft]);
  const { estimate } = useFareEstimate(input);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!input) {
    return (
      <Notice tone="warning" title="Trip details missing" action={<Button size="sm" onClick={onBack}>Edit trip</Button>}>
        Choose a pickup and destination first.
      </Notice>
    );
  }

  // The selected vehicle lives in memory only, so a reload returns here empty.
  if (!selectedVehicle) {
    return (
      <Notice tone="warning" title="Choose a vehicle" action={<Button size="sm" onClick={onChangeVehicle}>See ride options</Button>}>
        Pick one of the available demo vehicles before sending your request.
      </Notice>
    );
  }

  async function confirm() {
    // Re-validate: a scheduled time may have become too soon while reviewing.
    const errors = validateDraft(draft, seatLimits);
    if (hasErrors(errors)) {
      setSubmitError(Object.values(errors)[0] ?? 'Please check your trip details.');
      return;
    }
    setPending(true);
    setSubmitError(null);
    try {
      const booking = await requestRide(input!, selectedVehicle!.vehicleId);
      onRequested(booking.id);
    } catch {
      setSubmitError('We could not send your request. Please try again.');
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <button type="button" onClick={onChangeVehicle} className="-ml-1 inline-flex items-center gap-1.5 rounded px-1 text-body-sm font-medium text-ink-secondary hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Ride options
        </button>
        <h1 className="mt-3 text-title">Review your ride</h1>
      </div>

      <JourneySummary input={input} />
      <RidePreferenceBadges input={input} />

      {input.womenOnly && (
        <Notice title="Women-Only requested">
          Only this eligible Women-Only vehicle will be used. If it becomes unavailable we will tell you — we never book a mixed ride instead.
        </Notice>
      )}

      <section aria-labelledby="chosen-vehicle">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h2 id="chosen-vehicle" className="text-body font-semibold">
            Your vehicle
          </h2>
          <Button size="sm" variant="ghost" onClick={onChangeVehicle}>
            Change
          </Button>
        </div>
        <VehicleOptionCard vehicle={selectedVehicle} input={input} />
      </section>

      <div className="rounded-lg border border-line bg-surface-muted p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-caption font-medium text-ink-secondary">Journey estimate</p>
          <DemoBadge label="Demo estimate" />
        </div>
        {estimate ? (
          <>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" aria-hidden />
                {formatDuration(estimate.durationMinutes + (selectedVehicle.extraDelayMinutes ?? 0))} in the vehicle
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Route className="h-4 w-4" aria-hidden />
                {estimate.distanceKm} km
              </span>
            </div>
            <p className="mt-2 text-caption text-ink-tertiary">
              {input.poolPreference === 'POOL_ENABLED'
                ? 'You pay no more than the maximum shown. Time may increase only if a compatible co-rider joins and you approve it.'
                : 'Illustrative estimate. A real fare would be confirmed by PoolMate before the trip.'}
            </p>
          </>
        ) : (
          <p className="mt-2 text-body-sm text-ink-tertiary">Calculating…</p>
        )}
      </div>

      <p className="flex items-start gap-2 text-caption text-ink-tertiary">
        <CreditCard className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        No payment is collected in this prototype.
      </p>

      {submitError && <Notice tone="error">{submitError}</Notice>}

      <div className="flex flex-col gap-2">
        <Button size="lg" fullWidth leftIcon={Check} loading={pending} onClick={confirm}>
          {input.bookingMode === 'SCHEDULED' ? 'Confirm scheduled ride' : 'Confirm ride request'}
        </Button>
        <Button variant="ghost" fullWidth onClick={onBack} disabled={pending}>
          Edit trip details
        </Button>
      </div>
    </div>
  );
}
