import { Page, PageHeader } from '@/components/layout/Page';
import { SafetyCentre } from '@/components/safety/SafetyCentre';
import { DemoBadge } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { isActive } from '@/lib/booking';

export function RiderSafetyPage() {
  const { bookings } = useBooking();
  const activeBooking = bookings.find((b) => isActive(b) && b.trip);

  return (
    <Page>
      <PageHeader
        eyebrow="Rider"
        title="Safety centre"
        description="SOS, emergency contacts, trip sharing and issue reports. Everything here is simulated."
        actions={<DemoBadge label="Simulated" />}
      />
      <SafetyCentre role="RIDER" activeBooking={activeBooking} />
    </Page>
  );
}
