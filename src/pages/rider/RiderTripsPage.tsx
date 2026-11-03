import { CalendarClock, History, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Page, PageHeader } from '@/components/layout/Page';
import { TripCard } from '@/components/rider/TripCard';
import { Button, Card, EmptyState, Notice, SegmentedControl, Skeleton } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { bookingTime, isActive } from '@/lib/booking';
import { paths } from '@/routes/paths';

type Tab = 'upcoming' | 'past';

export function RiderTripsPage() {
  const { bookings, loading, loadError, reload, setActiveBookingId } = useBooking();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tab: Tab = params.get('tab') === 'past' ? 'past' : 'upcoming';

  const list = bookings
    .filter((b) => (tab === 'upcoming' ? isActive(b) : !isActive(b)))
    .sort((a, b) => (tab === 'upcoming' ? bookingTime(a).localeCompare(bookingTime(b)) : bookingTime(b).localeCompare(bookingTime(a))));

  const book = () => {
    setActiveBookingId(null);
    navigate(paths.rider.book);
  };

  return (
    <Page className="max-w-3xl">
      <PageHeader
        eyebrow="Rider"
        title="Trips"
        description="Current, scheduled and past demo rides."
        actions={
          <Button leftIcon={Plus} onClick={book}>
            Book a ride
          </Button>
        }
      />

      <SegmentedControl<Tab>
        label="Trip filter"
        value={tab}
        onChange={(t) => setParams(t === 'past' ? { tab: 'past' } : {}, { replace: true })}
        options={[
          { value: 'upcoming', label: 'Current & upcoming', icon: CalendarClock },
          { value: 'past', label: 'History', icon: History },
        ]}
      />

      <div className="mt-5 space-y-2">
        {loadError ? (
          <Notice tone="error" title={loadError} action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>} />
        ) : loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : list.length ? (
          list.map((b) => <TripCard key={b.id} booking={b} />)
        ) : (
          <Card padding="none">
            <EmptyState
              icon={tab === 'upcoming' ? CalendarClock : History}
              title={tab === 'upcoming' ? 'No current or upcoming rides' : 'No ride history yet'}
              description={tab === 'upcoming' ? 'Book an instant ride or schedule one for later.' : 'Completed, cancelled and unmatched requests appear here.'}
              action={<Button onClick={book}>Book a ride</Button>}
            />
          </Card>
        )}
      </div>
    </Page>
  );
}
