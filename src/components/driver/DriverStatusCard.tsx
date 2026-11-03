import { useState } from 'react';
import { BadgeCheck, Car, FileWarning, Power, ShieldCheck, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, DemoBadge, Notice, Switch } from '@/components/ui';
import { useNotify } from '@/context/NotificationContext';
import { paths } from '@/routes/paths';
import type { DriverAvailability, DriverProfile } from '@/types/domain';

interface DriverStatusCardProps {
  profile: DriverProfile;
  onAvailabilityChange: (availability: DriverAvailability) => Promise<void>;
  /** True when a trip is under way, so going offline is explained. */
  hasActiveTrip: boolean;
}

/** Availability, the driver's own vehicle and their profile summary. */
export function DriverStatusCard({ profile, onAvailabilityChange, hasActiveTrip }: DriverStatusCardProps) {
  const { notify } = useNotify();
  const [pending, setPending] = useState(false);
  const online = profile.availability === 'ONLINE';
  const { vehicle } = profile;

  async function toggle(next: boolean) {
    setPending(true);
    try {
      await onAvailabilityChange(next ? 'ONLINE' : 'OFFLINE');
      notify({
        title: next ? 'You are online' : 'You are offline',
        description: next
          ? 'Your vehicle appears in rider searches again.'
          : hasActiveTrip
            ? 'No new requests. Your current trip continues as normal.'
            : 'You will not appear in new rider searches.',
        tone: 'info',
      });
    } catch {
      notify({ title: 'Could not change your status', tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-inverse text-ink-inverse">
            <Car className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold">{profile.driverLabel}</p>
            <p className="mt-0.5 flex items-center gap-1 text-caption text-ink-secondary">
              <Star className="h-3.5 w-3.5" aria-hidden />
              {profile.rating.toFixed(1)} sample rating
            </p>
          </div>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <Switch
          label={online ? 'Online — taking requests' : 'Offline — not taking requests'}
          description={
            online
              ? 'Riders searching nearby can be matched with your vehicle.'
              : 'Your vehicle is hidden from new rider searches and new join requests.'
          }
          checked={online}
          disabled={pending}
          onCheckedChange={toggle}
        />
      </div>

      {!online && hasActiveTrip && (
        <Notice className="mt-3" title="Your current trip is unaffected">
          Going offline only stops new requests. Reserved seats and the trip under way stay exactly as they are.
        </Notice>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-micro uppercase text-ink-tertiary">Your vehicle</p>
        <p className="mt-1.5 text-body font-medium">
          {vehicle.vehicleModel} <span className="font-normal text-ink-tertiary">· {vehicle.vehicleType}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-sm border border-line-strong px-2 py-0.5 font-mono text-caption font-semibold tracking-wide">{vehicle.plate}</span>
          {vehicle.seats.rcVerified ? (
            <Badge variant="outline" icon={BadgeCheck}>
              RC verified (demo)
            </Badge>
          ) : (
            <Badge icon={FileWarning}>RC pending · solo only</Badge>
          )}
          {vehicle.womenOnlyEligible && (
            <Badge variant="outline" icon={ShieldCheck}>
              Women-Only eligible
            </Badge>
          )}
          <Badge icon={Power}>{vehicle.status.replace(/_/g, ' ').toLowerCase()}</Badge>
        </div>
        <Link to={paths.driver.vehicle} className="mt-3 inline-block text-body-sm font-medium text-ink hover:underline">
          Vehicle &amp; capacity details
        </Link>
      </div>
    </Card>
  );
}
