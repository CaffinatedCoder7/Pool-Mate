import { useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, Notice } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { useVehicleDiscovery } from '@/hooks/useVehicleDiscovery';
import { draftToSearchInput } from '@/lib/booking';
import { formatINR } from '@/lib/format';
import { RidePreferenceBadges } from '../BookingBadges';
import { JourneySummary } from '../JourneySummary';
import { RideResultsPanel } from '../RideResultsPanel';

/** Discovery stage: pick a vehicle before the request is sent. */
export function BookingResults({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const { draft, selectedVehicle, selectVehicle } = useBooking();
  const input = useMemo(() => draftToSearchInput(draft), [draft]);
  const { result, loading, error, retry } = useVehicleDiscovery(input);

  if (!input) {
    return (
      <Notice tone="warning" title="Trip details missing" action={<Button size="sm" onClick={onBack}>Edit trip</Button>}>
        Choose a pickup and destination first.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button type="button" onClick={onBack} className="-ml-1 inline-flex items-center gap-1.5 rounded px-1 text-body-sm font-medium text-ink-secondary hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Edit trip
        </button>
        <h1 className="mt-3 text-title">Choose your ride</h1>
      </div>

      <JourneySummary input={input} />
      <RidePreferenceBadges input={input} />

      {input.womenOnly && (
        <Notice title="Women-Only requested">
          Only Women-Only eligible demo vehicles are listed. This requirement stays on through booking and the trip.
        </Notice>
      )}

      <RideResultsPanel
        input={input}
        result={result}
        loading={loading}
        error={error}
        onRetry={retry}
        selectedVehicleId={selectedVehicle?.vehicleId ?? null}
        onSelect={selectVehicle}
        onEditRequest={onBack}
      />

      {selectedVehicle && (
        <div className="sticky bottom-0 -mx-5 border-t border-line bg-surface px-5 pb-2 pt-3 lg:-mx-6 lg:px-6">
          <p className="mb-2 truncate text-caption text-ink-secondary">
            Selected: {selectedVehicle.vehicleModel} · {formatINR(selectedVehicle.estimatedFare)} · {selectedVehicle.pickupEtaMinutes} min
          </p>
          <Button size="lg" fullWidth rightIcon={ArrowRight} onClick={onContinue}>
            Review ride
          </Button>
        </div>
      )}
    </div>
  );
}
