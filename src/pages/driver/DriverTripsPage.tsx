import { CalendarClock, CarFront, History } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DriverTripCard } from '@/components/driver/DriverTripCard';
import { Page, PageHeader } from '@/components/layout/Page';
import { Card, DemoBadge, EmptyState, Notice, SegmentedControl, Skeleton } from '@/components/ui';
import { useDriver } from '@/hooks/useDriver';
import { bookingTime } from '@/lib/booking';
import type { Booking } from '@/types/domain';

type Tab = 'active' | 'assigned' | 'completed';

const tabs: Array<{ value: Tab; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'assigned', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
];

function inTab(booking: Booking, tab: Tab): boolean {
  if (tab === 'active') return booking.status === 'DRIVER_ASSIGNED';
  if (tab === 'assigned') return booking.status === 'SCHEDULED';
  return booking.status === 'COMPLETED' || booking.status === 'CANCELLED';
}

/** Driver trip management: progression controls on the active trip, plus history. */
export function DriverTripsPage() {
  const { driverBookings, loading, error } = useDriver();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'assigned' || raw === 'completed' ? raw : 'active';

  const list = driverBookings
    .filter((b) => inTab(b, tab))
    .sort((a, b) => (tab === 'completed' ? bookingTime(b).localeCompare(bookingTime(a)) : bookingTime(a).localeCompare(bookingTime(b))));

  return (
    <Page>
      <PageHeader
        eyebrow="Driver"
        title="Trips"
        description="Progress your current trip and review your demo history. Seat counts come from the shared capacity rules."
        actions={<DemoBadge label="Demo data" />}
      />

      <SegmentedControl<Tab>
        label="Trip filter"
        value={tab}
        onChange={(next) => setParams(next === 'active' ? {} : { tab: next }, { replace: true })}
        options={tabs}
      />

      <div className="mt-5 space-y-4">
        {error ? (
          <Notice tone="error" title={error} />
        ) : loading ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : list.length ? (
          list.map((booking) => <DriverTripCard key={booking.id} booking={booking} variant={tab === 'active' ? 'full' : 'summary'} />)
        ) : (
          <Card padding="none">
            <EmptyState
              icon={tab === 'completed' ? History : tab === 'assigned' ? CalendarClock : CarFront}
              title={
                tab === 'active'
                  ? 'No trip under way'
                  : tab === 'assigned'
                    ? 'Nothing scheduled for your vehicle'
                    : 'No completed trips yet'
              }
              description={
                tab === 'active'
                  ? 'Trips assigned to your vehicle appear here with arrival, boarding and completion controls.'
                  : tab === 'assigned'
                    ? 'Scheduled rides booked onto your vehicle will show here.'
                    : 'Completed and cancelled trips for your vehicle will show here.'
              }
            />
          </Card>
        )}
      </div>
    </Page>
  );
}
