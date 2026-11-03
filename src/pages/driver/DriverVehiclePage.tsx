import { BadgeCheck, FileWarning, ShieldCheck, ShieldOff } from 'lucide-react';
import { Page, PageHeader } from '@/components/layout/Page';
import { SeatBreakdown } from '@/components/rider/SeatBreakdown';
import { Badge, Card, DemoBadge, Notice, Skeleton } from '@/components/ui';
import { useDriver } from '@/hooks/useDriver';

/** Vehicle record, RC-derived capacity and the live seat breakdown (read-only). */
export function DriverVehiclePage() {
  const { profile, activeBooking } = useDriver();

  if (!profile) {
    return (
      <Page className="max-w-3xl">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-4 h-64 w-full" />
      </Page>
    );
  }

  const { vehicle } = profile;
  const { seats } = vehicle;
  const tripRestricted = activeBooking?.trip?.womenOnlyRestricted ?? false;

  const registration = [
    { label: 'Make and model', value: vehicle.vehicleModel },
    { label: 'Category', value: vehicle.vehicleType },
    { label: 'Registration number', value: vehicle.plate },
    { label: 'RC seating capacity', value: `${seats.rcSeatingCapacity} seats` },
    { label: 'Driver seat', value: `− ${seats.driverSeats}` },
    { label: 'Luggage-reserved seats', value: `− ${seats.luggageReservedSeats}` },
    { label: 'Pooling capacity', value: `${seats.poolingCapacity} passenger seats` },
  ];

  return (
    <Page className="max-w-3xl">
      <PageHeader
        eyebrow="Driver"
        title="Vehicle"
        description="Capacity comes from the registration record. Seat figures use the same shared rules as rider discovery."
        actions={<DemoBadge label="Mock record" />}
      />

      <div className="space-y-6">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-heading">Registration</h2>
            {seats.rcVerified ? (
              <Badge variant="outline" icon={BadgeCheck}>
                RC verified (demo)
              </Badge>
            ) : (
              <Badge icon={FileWarning}>RC pending</Badge>
            )}
          </div>
          <dl className="mt-4 divide-y divide-line">
            {registration.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <dt className="text-body-sm text-ink-secondary">{row.label}</dt>
                <dd className="text-body-sm font-medium tabular-nums text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 border-t border-line pt-3 text-caption text-ink-tertiary">
            Pooling capacity = RC seats − driver seat − luggage-reserved seats.
          </p>
        </Card>

        <Card>
          <h2 className="text-heading">Live seats</h2>
          <p className="mb-3 mt-1 text-caption text-ink-secondary">
            Counted in seats, including any passengers onboard, reservations and holds from an open join request.
          </p>
          <SeatBreakdown seats={seats} />
        </Card>

        <Card>
          <h2 className="text-heading">Women-Only</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              {vehicle.womenOnlyEligible ? (
                <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
              ) : (
                <ShieldOff className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink-tertiary" aria-hidden />
              )}
              <div>
                <p className="text-body-sm font-semibold">
                  Vehicle eligibility: {vehicle.womenOnlyEligible ? 'eligible (demo verification)' : 'not eligible'}
                </p>
                <p className="mt-0.5 text-caption text-ink-secondary">
                  {vehicle.womenOnlyEligible
                    ? 'This vehicle may be matched to Women-Only requests. It can still serve ordinary trips.'
                    : 'This vehicle is never offered for Women-Only requests.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-line pt-4">
              <ShieldCheck className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${tripRestricted ? '' : 'text-ink-tertiary'}`} aria-hidden />
              <div>
                <p className="text-body-sm font-semibold">
                  Current trip restriction: {tripRestricted ? 'Women-Only trip in progress' : 'none'}
                </p>
                <p className="mt-0.5 text-caption text-ink-secondary">
                  {tripRestricted
                    ? 'A passenger who is not Women-Only eligible is rejected before a request ever reaches you.'
                    : 'Your current trip carries no Women-Only restriction.'}
                </p>
              </div>
            </div>
          </div>
          <Notice className="mt-4" title="Two different things">
            Vehicle eligibility says what the vehicle <em>may</em> serve. A trip restriction is set by the rider who booked, and is
            enforced for that trip regardless of the vehicle.
          </Notice>
        </Card>

        {!seats.rcVerified && (
          <Notice tone="warning" title="Pooling needs a verified RC">
            Until the registration is verified, this vehicle is only offered for solo rides and never presented as a verified pooling
            vehicle.
          </Notice>
        )}

        <Notice title="Read-only in this build">
          Vehicle details come from fixed demo fixtures. Editing is disabled rather than offering changes that could break seat-capacity
          rules, and there are no document uploads or KYC in this prototype.
        </Notice>
      </div>
    </Page>
  );
}
