import { BadgeCheck, Car, FileWarning, LogOut, Power, ShieldCheck, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, Card, DemoBadge, Notice, Skeleton, Switch } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useNotify } from '@/context/NotificationContext';
import { useDriver } from '@/hooks/useDriver';
import { paths } from '@/routes/paths';

/** Driver identity, vehicle association and verification — from the demo session. */
export function DriverProfilePage() {
  const { session, signOut } = useAuth();
  const { profile, activeBooking, setAvailability } = useDriver();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const user = session?.user;

  if (!profile || !user) {
    return (
      <Page className="max-w-3xl">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-4 h-64 w-full" />
      </Page>
    );
  }

  const { vehicle } = profile;
  const initials = profile.driverLabel
    .replace(/^Demo driver · /, '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return (
    <Page className="max-w-3xl">
      <PageHeader
        eyebrow="Driver"
        title="Profile"
        description="Your demo driver identity and the vehicle you are associated with."
        actions={<DemoBadge label="Demo account" />}
      />

      <div className="space-y-6">
        <Card>
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-inverse text-body-lg font-semibold text-ink-inverse">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-heading">{profile.driverLabel}</p>
              <p className="mt-0.5 text-body-sm text-ink-secondary">Signed in as {user.displayName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge icon={Star}>{profile.rating.toFixed(1)} sample rating</Badge>
                <Badge icon={Power}>{profile.availability === 'ONLINE' ? 'Online' : 'Offline'}</Badge>
                {user.roles.length > 1 && <Badge>Rider &amp; driver account</Badge>}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-heading">Vehicle association</h2>
          <p className="mt-1 text-caption text-ink-secondary">A driver is associated with exactly one vehicle in this prototype.</p>
          <div className="mt-4 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-muted">
              <Car className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-body font-medium">
                {vehicle.vehicleModel} <span className="font-normal text-ink-tertiary">· {vehicle.vehicleType}</span>
              </p>
              <p className="mt-0.5 font-mono text-caption text-ink-secondary">{vehicle.plate}</p>
            </div>
          </div>
          <Link to={paths.driver.vehicle} className="mt-3 inline-block text-body-sm font-medium text-ink hover:underline">
            Vehicle &amp; capacity details
          </Link>
        </Card>

        <Card>
          <h2 className="text-heading">Verification</h2>
          <ul className="mt-3 space-y-3">
            <li className="flex items-start gap-3">
              {vehicle.seats.rcVerified ? (
                <BadgeCheck className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
              ) : (
                <FileWarning className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
              )}
              <div>
                <p className="text-body-sm font-medium">
                  Vehicle registration: {vehicle.seats.rcVerified ? 'verified (demo)' : 'pending — solo rides only'}
                </p>
                <p className="text-caption text-ink-secondary">No real RC or licence document is checked in this prototype.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${vehicle.womenOnlyEligible ? '' : 'text-ink-tertiary'}`} aria-hidden />
              <div>
                <p className="text-body-sm font-medium">
                  Women-Only driving: {vehicle.womenOnlyEligible ? 'eligible (demo verification)' : 'not eligible'}
                </p>
                <p className="text-caption text-ink-secondary">
                  Eligibility is a fixture flag. A trip&rsquo;s Women-Only restriction is separate and set by the rider who booked.
                </p>
              </div>
            </li>
          </ul>
          <Notice className="mt-4" title="Demo verification only">
            No identity, gender, licence or background check happens here.
          </Notice>
        </Card>

        <Card>
          <h2 className="text-heading">Settings</h2>
          <div className="mt-4 space-y-4">
            <Switch
              label="Available for new requests"
              description={
                activeBooking
                  ? 'Turning this off stops new requests. Your current trip and its reservations are unaffected.'
                  : 'Controls whether your vehicle appears in rider searches.'
              }
              checked={profile.availability === 'ONLINE'}
              onCheckedChange={(next) => void setAvailability(next ? 'ONLINE' : 'OFFLINE')}
            />
            <div className="border-t border-line pt-4">
              <Button
                variant="secondary"
                leftIcon={LogOut}
                onClick={async () => {
                  await signOut();
                  notify({ title: 'Signed out', description: 'Your demo session has ended.', tone: 'success' });
                  navigate(paths.signIn, { replace: true });
                }}
              >
                Sign out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
