import { Inbox, PowerOff } from 'lucide-react';
import { Page } from '@/components/layout/Page';
import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { DriverDaySummaryCard } from '@/components/driver/DriverDaySummaryCard';
import { DriverOfferCard } from '@/components/driver/DriverOfferCard';
import { DriverStatusCard } from '@/components/driver/DriverStatusCard';
import { DriverTripCard } from '@/components/driver/DriverTripCard';
import { SafetyActionPanel } from '@/components/rider/SafetyActionPanel';
import { Button, Card, DemoBadge, EmptyState, Notice, Skeleton } from '@/components/ui';
import { useDriver } from '@/hooks/useDriver';

/** Driver home: availability, day figures, the active trip and incoming requests. */
export function DriverDashboardPage() {
  const { driverId, profile, summary, error, loading, activeBooking, pendingOffers, setAvailability, refresh } = useDriver();

  return (
    <Page>
      <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-micro uppercase text-ink-tertiary">Driver</p>
          <h1 className="mt-1.5 text-title sm:text-title-lg">Dashboard</h1>
          <p className="mt-1.5 text-body text-ink-secondary">
            Your vehicle, trip and incoming co-rider requests. You are the only one who approves a joiner.
          </p>
        </div>
        <DemoBadge label="Demo data" />
      </header>

      {error && (
        <Notice tone="error" title={error} className="mb-6" action={<Button size="sm" variant="secondary" onClick={refresh}>Retry</Button>} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Incoming requests first: they are time-limited. */}
          <section aria-labelledby="requests-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="requests-heading" className="text-heading">
                Incoming requests
                {pendingOffers.length > 0 && <span className="ml-1.5 font-normal text-ink-tertiary">({pendingOffers.length})</span>}
              </h2>
            </div>

            {loading && !profile ? (
              <Skeleton className="h-40 w-full" />
            ) : pendingOffers.length === 0 ? (
              <Card padding="none">
                <EmptyState
                  icon={profile?.availability === 'OFFLINE' ? PowerOff : Inbox}
                  title={profile?.availability === 'OFFLINE' ? 'You are offline' : 'No requests right now'}
                  description={
                    profile?.availability === 'OFFLINE'
                      ? 'Go online to receive new ride and co-rider requests. Any trip already under way continues.'
                      : 'Co-rider requests for your vehicle appear here while you have a pool-enabled trip under way.'
                  }
                />
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingOffers.map((view) => (
                  <DriverOfferCard key={view.offer.id} view={view} actingDriverId={driverId} />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="active-trip-heading">
            <h2 id="active-trip-heading" className="mb-3 text-heading">
              Active trip
            </h2>
            {loading && !profile ? (
              <Skeleton className="h-48 w-full" />
            ) : activeBooking ? (
              <DriverTripCard booking={activeBooking} variant="summary" />
            ) : (
              <Card padding="none">
                <EmptyState
                  icon={Inbox}
                  title="No trip assigned"
                  description="When a rider books your vehicle, the trip and its stops appear here."
                />
              </Card>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {profile ? (
            <DriverStatusCard profile={profile} onAvailabilityChange={setAvailability} hasActiveTrip={Boolean(activeBooking)} />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
          <DriverDaySummaryCard summary={summary} />
          <MapPlaceholder variant="inset" title="Driver map" description="Your route and stops will appear here in a later phase." />
          <SafetyActionPanel compact />
        </div>
      </div>
    </Page>
  );
}
