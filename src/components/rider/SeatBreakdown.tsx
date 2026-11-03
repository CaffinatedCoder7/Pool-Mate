import { BadgeCheck, FileWarning } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { SeatSnapshot } from '@/types/domain';

/** Vehicle-specific seat figures: pooling capacity, onboard, reserved, available (+ holds). */
export function SeatBreakdown({ seats, className }: { seats: SeatSnapshot; className?: string }) {
  const cells = [
    { label: 'Pooling capacity', value: seats.poolingCapacity },
    { label: 'Onboard', value: seats.onboardSeats },
    { label: 'Reserved', value: seats.reservedSeats },
    { label: 'Available', value: seats.availableSeats, strong: true },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      <dl className="grid grid-cols-4 overflow-hidden rounded-md border border-line">
        {cells.map((c) => (
          <div key={c.label} className={cn('border-l border-line px-2 py-2 first:border-l-0', c.strong ? 'bg-surface-muted' : 'bg-surface')}>
            <dt className="text-[0.6875rem] leading-tight text-ink-tertiary">{c.label}</dt>
            <dd className={cn('mt-0.5 text-body tabular-nums', c.strong ? 'font-semibold text-ink' : 'font-medium text-ink-secondary')}>{c.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {seats.rcVerified ? (
          <Badge variant="outline" icon={BadgeCheck}>
            RC verified (demo)
          </Badge>
        ) : (
          <Badge icon={FileWarning}>RC pending · solo only</Badge>
        )}
        <span className="text-caption text-ink-tertiary">
          RC {seats.rcSeatingCapacity} − {seats.driverSeats} driver
          {seats.luggageReservedSeats ? ` − ${seats.luggageReservedSeats} luggage` : ''} = {seats.poolingCapacity} seats
          {seats.activeSeatHolds ? ` · ${seats.activeSeatHolds} on hold` : ''}
        </span>
      </div>
    </div>
  );
}
