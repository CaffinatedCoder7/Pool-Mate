import { AlertTriangle, CalendarClock, CarFront, CheckCircle2, Loader2, ShieldCheck, User, Users, XCircle, Zap, type LucideIcon } from 'lucide-react';
import { Badge, type BadgeVariant } from '@/components/ui';
import type { BookingStatus, RideSearchInput } from '@/types/domain';

const statusMeta: Record<BookingStatus, { label: string; icon: LucideIcon; variant: BadgeVariant }> = {
  SEARCHING: { label: 'Searching', icon: Loader2, variant: 'outline' },
  DRIVER_ASSIGNED: { label: 'Driver assigned', icon: CarFront, variant: 'solid' },
  SCHEDULED: { label: 'Scheduled', icon: CalendarClock, variant: 'outline' },
  NO_MATCH: { label: 'No eligible ride', icon: AlertTriangle, variant: 'outline' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, variant: 'neutral' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, variant: 'neutral' },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, icon, variant } = statusMeta[status];
  return (
    <Badge variant={variant} icon={icon}>
      {label}
    </Badge>
  );
}

/** Mode, preference and Women-Only badges — Women-Only is always shown when requested. */
export function RidePreferenceBadges({ input }: { input: RideSearchInput }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {input.womenOnly && (
        <Badge variant="solid" icon={ShieldCheck}>
          Women-Only
        </Badge>
      )}
      <Badge icon={input.bookingMode === 'INSTANT' ? Zap : CalendarClock}>{input.bookingMode === 'INSTANT' ? 'Instant' : 'Scheduled'}</Badge>
      <Badge icon={input.poolPreference === 'SOLO' ? User : Users}>{input.poolPreference === 'SOLO' ? 'Solo' : 'Pool-enabled'}</Badge>
      <Badge>
        {input.seats} {input.seats === 1 ? 'passenger' : 'passengers'}
      </Badge>
    </div>
  );
}
