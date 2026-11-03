import { Page, PageHeader } from '@/components/layout/Page';
import { SafetyCentre } from '@/components/safety/SafetyCentre';
import { DemoBadge } from '@/components/ui';
import { useDriver } from '@/hooks/useDriver';

export function DriverSafetyPage() {
  const { activeBooking } = useDriver();

  return (
    <Page>
      <PageHeader
        eyebrow="Driver"
        title="Safety centre"
        description="SOS, emergency contacts, trip sharing and issue reports. Everything here is simulated."
        actions={<DemoBadge label="Simulated" />}
      />
      <SafetyCentre role="DRIVER" activeBooking={activeBooking} />
    </Page>
  );
}
