import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TripStop } from '@/types/domain';

/** Ordered pickup/drop summary for the trip. No passenger identities are shown. */
export function TripStopsList({ stops }: { stops: TripStop[] }) {
  return (
    <ol className="relative space-y-4">
      <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-px bg-line-strong" />
      {stops.map((stop) => {
        const done = stop.status === 'DONE';
        return (
          <li key={stop.id} className="relative flex gap-3">
            <span
              className={cn(
                'z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-surface',
                done ? 'border-ink bg-ink text-ink-inverse' : 'border-line-strong',
              )}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <span aria-hidden className={cn('bg-ink', stop.kind === 'PICKUP' ? 'h-2 w-2 rounded-full' : 'h-2 w-2 rounded-sm')} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-caption text-ink-tertiary">
                {stop.kind === 'PICKUP' ? 'Pickup' : 'Drop'} · {stop.passenger} · {stop.seats} {stop.seats === 1 ? 'seat' : 'seats'}
              </p>
              <p className={cn('truncate text-body font-medium', done ? 'text-ink-tertiary line-through' : 'text-ink')}>{stop.label}</p>
            </div>
            <span className="shrink-0 text-caption tabular-nums text-ink-secondary">
              {done ? 'Done' : `~${stop.etaMinutes} min`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
