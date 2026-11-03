import { useState } from 'react';
import { Car, CarFront, ChevronDown, Clock3, SearchX, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, EmptyState, Notice, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { RideCategory, RideSearchInput, VehicleDiscoveryResult, VehicleOption } from '@/types/domain';
import { VehicleOptionCard } from './VehicleOptionCard';

const sections: Array<{ category: RideCategory; title: string; description: string; icon: LucideIcon }> = [
  {
    category: 'MOVING_POOL',
    title: 'Moving pool rides',
    description: 'Already travelling with seats free on a compatible remaining route.',
    icon: CarFront,
  },
  {
    category: 'WAITING_POOL',
    title: 'Waiting pool rides',
    description: 'Forming a pool now. You are not required to wait for anyone.',
    icon: Clock3,
  },
  {
    category: 'EMPTY_VEHICLE',
    title: 'Available vehicles',
    description: 'Empty and eligible — starts as a normal ride.',
    icon: Car,
  },
];

interface RideResultsPanelProps {
  input: RideSearchInput;
  result: VehicleDiscoveryResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  selectedVehicleId: string | null;
  onSelect: (vehicle: VehicleOption) => void;
  /** Shown when nothing is eligible, e.g. "Change trip". */
  onEditRequest?: () => void;
}

/**
 * Ride discovery results, grouped as the spec requires: moving pool, waiting
 * pool, then available vehicles. Only vehicles whose AVAILABLE seats fit the
 * whole requested group are offered; the rest sit behind a disclosure with
 * their reasons, and cannot be selected.
 */
export function RideResultsPanel({
  input,
  result,
  loading,
  error,
  onRetry,
  selectedVehicleId,
  onSelect,
  onEditRequest,
}: RideResultsPanelProps) {
  const [showExcluded, setShowExcluded] = useState(false);

  if (error) {
    return (
      <Notice tone="error" title="Could not load ride options" action={<Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}>
        {error}
      </Notice>
    );
  }

  if (loading && !result) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Finding vehicles">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (!result) return null;

  const group = `${input.seats} ${input.seats === 1 ? 'passenger' : 'passengers'}`;

  return (
    <div className={cn('space-y-6', loading && 'opacity-60')}>
      {result.eligible.length === 0 ? (
        <>
          <EmptyState
            className="rounded-lg border border-dashed border-line-strong"
            icon={SearchX}
            title={input.womenOnly ? 'No eligible Women-Only vehicle right now' : 'No vehicle fits this group right now'}
            description={
              <>
                None of the demo vehicles has {input.seats} available {input.seats === 1 ? 'seat' : 'seats'}
                {input.poolPreference === 'POOL_ENABLED' ? ' with a verified RC' : ''}
                {input.womenOnly ? ' and Women-Only eligibility for this pickup' : ''}. Your requirements were not changed.
              </>
            }
            action={onEditRequest && <Button onClick={onEditRequest}>Change trip details</Button>}
          />
        </>
      ) : (
        <>
          <p className="text-caption text-ink-secondary">
            {result.eligible.length} demo {result.eligible.length === 1 ? 'vehicle' : 'vehicles'} can take {group}. Sorted by moving, waiting, then empty.
          </p>

          {sections.map(({ category, title, description, icon: Icon }) => {
            const vehicles = result.eligible.filter((v) => v.category === category);
            if (!vehicles.length) return null;
            return (
              <section key={category} aria-labelledby={`section-${category}`}>
                <div className="mb-2.5">
                  <h2 id={`section-${category}`} className="flex items-center gap-2 text-body font-semibold text-ink">
                    <Icon className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden />
                    {title}
                    <span className="font-normal text-ink-tertiary">({vehicles.length})</span>
                  </h2>
                  <p className="mt-0.5 text-caption text-ink-tertiary">{description}</p>
                </div>
                <div className="space-y-2">
                  {vehicles.map((vehicle) => (
                    <VehicleOptionCard
                      key={vehicle.vehicleId}
                      vehicle={vehicle}
                      input={input}
                      selected={vehicle.vehicleId === selectedVehicleId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {result.excluded.length > 0 && (
        <div className="border-t border-line pt-4">
          <button
            type="button"
            aria-expanded={showExcluded}
            onClick={() => setShowExcluded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded text-body-sm font-medium text-ink-secondary hover:text-ink"
          >
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden />
              {result.excluded.length} demo {result.excluded.length === 1 ? 'vehicle is' : 'vehicles are'} not available for this request
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', showExcluded && 'rotate-180')} aria-hidden />
          </button>
          {showExcluded && (
            <div className="mt-3 space-y-2">
              <p className="text-caption text-ink-tertiary">
                Shown for transparency only. These cannot be selected, and a vehicle with a pending RC is never offered for pooling.
              </p>
              {result.excluded.map(({ vehicle, reasons }) => (
                <VehicleOptionCard key={vehicle.vehicleId} vehicle={vehicle} input={input} reasons={reasons} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
