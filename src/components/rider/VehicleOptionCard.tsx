import { Check, Clock3, Route, ShieldCheck, Star, Users } from 'lucide-react';
import { Badge, DemoBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { ineligibilityLabels } from '@/lib/capacity';
import type { IneligibilityReason, RideSearchInput, VehicleOption } from '@/types/domain';
import { SeatBreakdown } from './SeatBreakdown';

interface VehicleOptionCardProps {
  vehicle: VehicleOption;
  input: RideSearchInput;
  selected?: boolean;
  onSelect?: (vehicle: VehicleOption) => void;
  /** When set, the card is shown as unavailable and cannot be selected. */
  reasons?: IneligibilityReason[];
}

/**
 * One demo vehicle: driver, vehicle, ETA, fare, seat breakdown, route impact
 * and Women-Only eligibility. Selectable when eligible; ineligible vehicles
 * render as a disabled, clearly-labelled card.
 */
export function VehicleOptionCard({ vehicle, input, selected = false, onSelect, reasons }: VehicleOptionCardProps) {
  const ineligible = Boolean(reasons?.length);
  const fare = (
    <div className="text-right">
      <p className="text-heading tabular-nums">{formatINR(vehicle.estimatedFare)}</p>
      {vehicle.maximumFare !== undefined && vehicle.maximumFare > vehicle.estimatedFare && (
        <p className="text-caption text-ink-tertiary">max {formatINR(vehicle.maximumFare)}</p>
      )}
    </div>
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-ink">
            {vehicle.vehicleModel} <span className="font-normal text-ink-tertiary">· {vehicle.vehicleType}</span>
          </p>
          <p className="mt-0.5 truncate text-caption text-ink-secondary">{vehicle.driverLabel}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-secondary">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              {vehicle.pickupEtaMinutes} min to pickup
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5" aria-hidden />
              {vehicle.rating.toFixed(1)}
            </span>
            <span className="rounded-sm border border-line px-1.5 font-mono text-[0.6875rem] tracking-wide text-ink-secondary">{vehicle.plate}</span>
          </div>
        </div>
        {fare}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge icon={Users}>
          {input.seats} {input.seats === 1 ? 'passenger' : 'passengers'} requested
        </Badge>
        {vehicle.womenOnlyEligible && (
          <Badge variant={input.womenOnly ? 'solid' : 'outline'} icon={ShieldCheck}>
            Women-Only eligible
          </Badge>
        )}
        {vehicle.extraDelayMinutes !== undefined && <Badge icon={Clock3}>+{vehicle.extraDelayMinutes} min journey</Badge>}
        {vehicle.extraDistanceKm !== undefined && <Badge icon={Route}>+{vehicle.extraDistanceKm} km</Badge>}
        <DemoBadge />
      </div>

      <SeatBreakdown seats={vehicle.seats} className="mt-3" />

      {ineligible && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3">
          {reasons!.map((reason) => (
            <li key={reason} className="text-caption font-medium text-ink">
              Unavailable — {ineligibilityLabels[reason]}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (ineligible || !onSelect) {
    return (
      <div
        aria-disabled={ineligible || undefined}
        className={cn('rounded-lg border border-line bg-surface p-4', ineligible && 'bg-surface-muted opacity-80')}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(vehicle)}
      className={cn(
        'w-full rounded-lg border bg-surface p-4 text-left transition-colors duration-150',
        selected ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-strong hover:bg-grey-50',
      )}
    >
      {body}
      <p className={cn('mt-3 flex items-center gap-1.5 text-caption font-semibold', selected ? 'text-ink' : 'text-ink-tertiary')}>
        {selected ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden />
            Selected
          </>
        ) : (
          'Tap to select this vehicle'
        )}
      </p>
    </button>
  );
}
