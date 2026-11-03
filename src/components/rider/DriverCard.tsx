import { CarFront, ShieldCheck, Star } from 'lucide-react';
import { Badge, DemoBadge } from '@/components/ui';
import type { DriverAssignment } from '@/types/domain';
import { SeatBreakdown } from './SeatBreakdown';

/** Simulated driver/vehicle details. Always labelled DEMO. */
export function DriverCard({ driver, womenOnly }: { driver: DriverAssignment; womenOnly: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-inverse text-ink-inverse">
          <CarFront className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body font-semibold text-ink">{driver.driverLabel}</p>
            <DemoBadge />
          </div>
          <p className="mt-0.5 text-body-sm text-ink-secondary">
            {driver.vehicleModel} · {driver.vehicleType}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-line-strong px-2 py-0.5 font-mono text-caption font-semibold tracking-wide text-ink">{driver.plate}</span>
            <span className="inline-flex items-center gap-1 text-caption text-ink-secondary">
              <Star className="h-3.5 w-3.5" aria-hidden />
              {driver.rating.toFixed(1)} sample rating
            </span>
          </div>
        </div>
      </div>
      {driver.seats && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-2 text-caption font-medium text-ink-secondary">Vehicle seats (incl. your booking)</p>
          <SeatBreakdown seats={driver.seats} />
        </div>
      )}
      {womenOnly && driver.womenOnlyEligible && (
        <div className="mt-3 border-t border-line pt-3">
          <Badge variant="outline" icon={ShieldCheck}>
            Women-Only eligible · Demo verification
          </Badge>
        </div>
      )}
    </div>
  );
}
