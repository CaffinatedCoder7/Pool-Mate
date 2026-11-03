import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarClock,
  ChevronRight,
  Circle,
  History,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '@/components/layout/Page';
import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { BookingStatusBadge } from '@/components/rider/BookingBadges';
import { LocationField } from '@/components/rider/LocationField';
import { TripCard } from '@/components/rider/TripCard';
import { Badge, Button, Card, CardHeader, DemoBadge, EmptyState, Notice, Skeleton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useNotify } from '@/context/NotificationContext';
import { bookingTime } from '@/lib/booking';
import { formatRelativeTime, greeting } from '@/lib/format';
import { paths } from '@/routes/paths';

export function RiderHomePage() {
  const { session } = useAuth();
  const { bookings, loading, loadError, reload } = useBooking();
  const name = session?.user.displayName ?? 'there';

  const current = bookings.filter((b) => b.status === 'SEARCHING' || b.status === 'DRIVER_ASSIGNED');
  const upcoming = bookings
    .filter((b) => b.status === 'SCHEDULED')
    .sort((a, b) => bookingTime(a).localeCompare(bookingTime(b)));
  const recent = bookings
    .filter((b) => b.status === 'COMPLETED' || b.status === 'CANCELLED')
    .sort((a, b) => bookingTime(b).localeCompare(bookingTime(a)))
    .slice(0, 3);

  return (
    <Page>
      <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-micro uppercase text-ink-tertiary">Rider</p>
          <h1 className="mt-1.5 text-title sm:text-title-lg">
            {greeting()}, {name.split(' ')[0]}
          </h1>
          <p className="mt-1.5 text-body text-ink-secondary">Instant rides across Jaipur — pool when it makes sense.</p>
        </div>
        <DemoBadge label="Demo data" />
      </header>

      {loadError && (
        <Notice tone="error" title={loadError} className="mb-6" action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>} />
      )}

      {current.map((b) => (
        <Link
          key={b.id}
          to={paths.rider.trip(b.id)}
          className="mb-4 flex items-center gap-4 rounded-lg border border-ink bg-surface p-4 shadow-sm hover:bg-grey-50"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <BookingStatusBadge status={b.status} />
              {b.input.womenOnly && <Badge icon={ShieldCheck}>Women-Only</Badge>}
            </div>
            <p className="mt-2 truncate text-body font-semibold">
              {b.input.pickupLabel} → {b.input.destinationLabel}
            </p>
            <p className="text-caption text-ink-secondary">
              {b.status === 'SEARCHING' ? 'Finding a demo driver…' : `${b.driver?.driverLabel} · arriving in ~${b.driver?.pickupEtaMinutes} min`}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
      ))}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <QuickBookCard />

          <Card>
            <CardHeader title="Upcoming trips" description="Scheduled rides" action={<CalendarClock className="h-5 w-5 text-ink-tertiary" aria-hidden />} />
            <div className="mt-4 space-y-2">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : upcoming.length ? (
                upcoming.map((b) => <TripCard key={b.id} booking={b} />)
              ) : (
                <EmptyState className="py-6" icon={CalendarClock} title="Nothing scheduled" description="Choose Scheduled when booking to plan a ride up to 7 days ahead." />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent trips"
              action={
                <Link to={paths.rider.history} className="inline-flex items-center gap-1 rounded text-body-sm font-medium text-ink hover:underline">
                  Ride history <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />
            <div className="mt-4 space-y-2">
              {loading ? (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              ) : recent.length ? (
                recent.map((b) => <TripCard key={b.id} booking={b} />)
              ) : (
                <EmptyState className="py-6" icon={History} title="No trips yet" description="Your completed and cancelled rides will appear here." />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <ProfileCard />
          <NotificationsCard />
          <SafetyCard />
        </div>
      </div>
    </Page>
  );
}

function QuickBookCard() {
  const { draft, updateDraft, setActiveBookingId } = useBooking();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  function goToBooking() {
    if (!draft.pickup || !draft.destination) {
      setError('Choose both pickup and destination from the suggestions.');
      return;
    }
    if (draft.pickup.id === draft.destination.id) {
      setError('Destination must be different from pickup.');
      return;
    }
    setActiveBookingId(null);
    navigate(paths.rider.book);
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="grid md:grid-cols-5">
        <div className="space-y-4 p-5 sm:p-6 md:col-span-3">
          <div>
            <h2 className="text-heading">Where to?</h2>
            <p className="mt-1 text-body-sm text-ink-secondary">Pick from Jaipur demo landmarks.</p>
          </div>
          <LocationField
            label="Pickup"
            leadingIcon={Circle}
            placeholder="Search a pickup point"
            value={draft.pickup}
            excludeId={draft.destination?.id}
            onChange={(v) => {
              setError(null);
              updateDraft({ pickup: v });
            }}
          />
          <LocationField
            label="Destination"
            leadingIcon={MapPin}
            placeholder="Search a destination"
            value={draft.destination}
            excludeId={draft.pickup?.id}
            onChange={(v) => {
              setError(null);
              updateDraft({ destination: v });
            }}
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button fullWidth size="lg" rightIcon={ArrowRight} onClick={goToBooking}>
            Choose ride options
          </Button>
        </div>
        <MapPlaceholder className="min-h-[200px] border-t border-line md:col-span-2 md:border-l md:border-t-0" title="Jaipur map" description="Map preview arrives in a later phase." />
      </div>
    </Card>
  );
}

function ProfileCard() {
  const { session } = useAuth();
  const user = session?.user;
  if (!user) return null;
  const initials = user.displayName.split(' ').map((p) => p[0]).join('').slice(0, 2);

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-inverse text-body font-semibold text-ink-inverse">{initials}</span>
        <div className="min-w-0">
          <p className="truncate text-body font-semibold">{user.displayName}</p>
          <p className="text-caption text-ink-tertiary">Demo account · Jaipur</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {user.womenOnlyStatus === 'DEMO_VERIFIED' && (
          <Badge variant="outline" icon={ShieldCheck}>
            Women-Only · Demo verification
          </Badge>
        )}
        <Badge>{user.roles.length > 1 ? 'Rider & driver' : 'Rider'}</Badge>
      </div>
      <Link to={paths.rider.profile} className="mt-4 inline-flex items-center gap-1 text-body-sm font-medium text-ink hover:underline">
        Profile & preferences <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </Card>
  );
}

function NotificationsCard() {
  const { notifications, unreadCount, markAllRead } = useBooking();
  const [pending, setPending] = useState(false);
  const shown = notifications.slice(0, 4);

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Notifications
            {unreadCount > 0 && <Badge variant="solid">{unreadCount} new</Badge>}
          </span>
        }
        action={
          unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              loading={pending}
              onClick={async () => {
                setPending(true);
                await markAllRead().catch(() => undefined);
                setPending(false);
              }}
            >
              Mark read
            </Button>
          )
        }
      />
      {shown.length ? (
        <ul className="mt-3 divide-y divide-line">
          {shown.map((n) => {
            const body = (
              <>
                <p className="flex items-center gap-2 text-body-sm font-medium text-ink">
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden />}
                  {n.title}
                  {!n.read && <span className="sr-only">(unread)</span>}
                </p>
                <p className="mt-0.5 line-clamp-2 text-caption text-ink-secondary">{n.body}</p>
                <p className="mt-1 text-caption text-ink-tertiary">{formatRelativeTime(n.createdAt)}</p>
              </>
            );
            return (
              <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                {n.bookingId ? (
                  <Link to={paths.rider.trip(n.bookingId)} className="block rounded hover:bg-grey-50">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState className="py-6" icon={Bell} title="You’re all caught up" />
      )}
    </Card>
  );
}

function SafetyCard() {
  const { notify } = useNotify();
  const Item = ({ icon: Icon, label, hint, onClick, to }: { icon: LucideIcon; label: string; hint: string; onClick?: () => void; to?: string }) => {
    const content = (
      <>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-body-sm font-medium text-ink">{label}</span>
          <span className="block text-caption text-ink-tertiary">{hint}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-ink-tertiary" aria-hidden />
      </>
    );
    const cls = 'flex w-full items-center gap-3 rounded-md p-2 -mx-2 hover:bg-surface-muted';
    return to ? (
      <Link to={to} className={cls}>
        {content}
      </Link>
    ) : (
      <button type="button" onClick={onClick} className={cls}>
        {content}
      </button>
    );
  };

  return (
    <Card>
      <CardHeader title="Safety" action={<ShieldCheck className="h-5 w-5 text-ink-tertiary" aria-hidden />} />
      <div className="mt-3 space-y-1">
        <Item icon={ShieldCheck} label="Safety centre" hint="Tools and guidance" to={paths.rider.safety} />
        <Item icon={Phone} label="Emergency contacts" hint="Set up trusted contacts" to={paths.rider.profile} />
        <Item
          icon={Share2}
          label="Share trip status"
          hint="Demo only"
          onClick={() =>
            notify({ title: 'Trip sharing is not live yet', description: 'In the demo, no trip details are sent to anyone.', tone: 'info' })
          }
        />
      </div>
    </Card>
  );
}
