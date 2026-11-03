import { useState } from 'react';
import { Car, Check, FlaskConical, RotateCcw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader } from '@/components/layout/Page';
import { Button, Card, ConfirmDialog, DemoBadge, Notice } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useNotify } from '@/context/NotificationContext';
import { paths } from '@/routes/paths';

interface Scenario {
  title: string;
  steps: string;
  expected: string;
}

const discoveryScenarios: Scenario[] = [
  {
    title: '1 · Moving vehicle with spare seats',
    steps: 'Book a ride: MNIT Jaipur → World Trade Park, 1 passenger, Pool-enabled. Continue to ride options.',
    expected: 'Moving pool rides lists the Dzire (2 of 4 seats free) and the Innova (5 of 6 free).',
  },
  {
    title: '2 · Waiting vehicle',
    steps: 'Same search — look at the second section.',
    expected: 'Waiting pool rides lists the Amaze (1 seat on hold) and the Ciaz (2 seats reserved). You are never made to wait.',
  },
  {
    title: '3 · Vehicle at full capacity',
    steps: 'In ride options, expand “… not available for this request”.',
    expected: 'The Marazzo shows 5 onboard, 0 available, and is marked unavailable — pooling closed and not enough seats.',
  },
  {
    title: '4 · Four passengers in a six-seat pooling vehicle',
    steps: 'Set passengers to 4 with Pool-enabled.',
    expected: 'Only the Innova (6 pooling seats, 5 available) and the Ertiga (5 available) qualify. The 4-seat vehicles are excluded.',
  },
  {
    title: '9 · Insufficient available seats',
    steps: 'Set passengers to 6 with Pool-enabled, or use “Group too large” on an active trip.',
    expected: 'No vehicle is offered; the request is reported as unmatched and your requirements are left alone.',
  },
];

const poolingScenarios: Scenario[] = [
  {
    title: '5 · Passenger joining an existing trip',
    steps: 'Start the demo pool trip below, then use “Co-rider wants to join” on the trip screen.',
    expected:
      'Nothing to approve appears on your passenger screen — only a note that the driver is deciding. Seats are held, not taken.',
  },
  {
    title: '6 · Driver accepts (cross-role)',
    steps:
      'Switch to Driver mode with the toggle in the top bar. The request is on the dashboard with its full impact. Press Accept, then switch back to Rider.',
    expected:
      'Lifecycle runs OFFER_CREATED → OFFER_DISPLAYED → DRIVER_PENDING → DRIVER_ACCEPTED → ROUTE_UPDATED on the same records. The rider gets an informational notice, the hold becomes a reservation, and the co-rider’s stops, ETA and fare update on both sides.',
  },
  {
    title: '7 · Driver declines',
    steps: 'Create another request, switch to Driver mode and press Decline.',
    expected: 'The hold is released once, seats go back up, and the rider’s route, ETA and fare are untouched. The rider is never asked.',
  },
  {
    title: '8 · Request expires with the dashboard closed',
    steps: 'Create a request, stay on the rider screen (or close the tab) and wait out the 90-second countdown.',
    expected:
      'The service expires it against the stored deadline on the next read, so the request is already gone when you open the driver dashboard. The hold is released exactly once.',
  },
  {
    title: '11 · Offline driver gets nothing new',
    steps: 'In Driver mode, switch yourself offline. Then, as a rider, search for a ride, and try “Co-rider wants to join”.',
    expected:
      'Your vehicle is excluded from discovery (shown under “not available” as driver offline) and new join requests are refused with DRIVER_OFFLINE. Any trip already under way keeps running with its reservations intact.',
  },
  {
    title: '12 · A driver only sees their own vehicle',
    steps: 'Use “Drive as” below to switch to Sunita (Ertiga), then open the driver dashboard.',
    expected: 'The Innova trip and its requests are no longer visible. Each driver only ever sees their own vehicle’s trips and requests.',
  },
  {
    title: '10 · Women-Only trip rejects an ineligible joiner',
    steps: 'Start the demo Women-Only trip below, then use “Non-eligible joiner”.',
    expected:
      'The request is rejected before any offer exists (WOMEN_ONLY_INELIGIBLE), so the driver is never asked, no seats are held, and the trip is never downgraded.',
  },
];

function ScenarioList({ title, scenarios }: { title: string; scenarios: Scenario[] }) {
  return (
    <Card>
      <h2 className="text-heading">{title}</h2>
      <ol className="mt-4 space-y-4">
        {scenarios.map((s) => (
          <li key={s.title} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
            <h3 className="text-body font-semibold">{s.title}</h3>
            <p className="mt-1 text-body-sm text-ink-secondary">
              <span className="font-medium text-ink">Do: </span>
              {s.steps}
            </p>
            <p className="mt-1 text-body-sm text-ink-secondary">
              <span className="font-medium text-ink">Expect: </span>
              {s.expected}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Reproducible walkthroughs plus a reset, so demos always start from a known state. */
/** The demo drivers whose vehicles the walkthroughs use. */
const driverChoices = [
  { driverId: 'drv-03', label: 'Arjun · Innova' },
  { driverId: 'drv-06', label: 'Sunita · Ertiga (Women-Only)' },
];

export function DemoCentrePage() {
  const { seedDemoTrip, resetDemoData } = useBooking();
  const { session, setDriverIdentity } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const driverId = session?.user.driverId;

  async function chooseDriver(nextDriverId: string) {
    setBusy(nextDriverId);
    try {
      await setDriverIdentity(nextDriverId);
      notify({ title: 'Driver identity changed', description: 'The driver dashboard now shows that vehicle only.', tone: 'success' });
    } catch {
      notify({ title: 'Could not change driver', tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function start(variant: 'POOL_SUV' | 'WOMEN_ONLY') {
    setBusy(variant);
    try {
      const booking = await seedDemoTrip(variant);
      notify({ title: 'Demo trip started', description: 'You are onboard, so a co-rider can be offered a seat.', tone: 'success' });
      navigate(paths.rider.trip(booking.id));
    } catch (e) {
      notify({ title: 'Could not start the demo trip', description: e instanceof Error ? e.message : undefined, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setBusy('reset');
    try {
      await resetDemoData();
      setConfirmReset(false);
      notify({ title: 'Demo data reset', description: 'Sample trips, notifications and the booking form were restored.', tone: 'success' });
    } catch {
      notify({ title: 'Could not reset the demo data', tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Rider"
        title="Demo centre"
        description="Everything in PoolMate is simulated sample data. Use these walkthroughs to show the same behaviour every time."
        actions={<DemoBadge label="Prototype" />}
      />

      <Notice className="mb-6" title="What is simulated">
        Drivers, vehicles, fares, seat availability, the search, driver responses and pool offers are all scripted demo data held in this
        browser. No backend, payment, verification, GPS or matching engine is connected.
      </Notice>

      <Card className="mb-6">
        <h2 className="text-heading">Drive as</h2>
        <p className="mt-1 text-body-sm text-ink-secondary">
          Your account is associated with one fleet driver at a time. A driver only ever sees their own vehicle&rsquo;s trips and
          requests, so pick the driver whose vehicle your demo trip is on.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {driverChoices.map((choice) => {
            const active = driverId === choice.driverId;
            return (
              <Button
                key={choice.driverId}
                size="sm"
                variant={active ? 'primary' : 'secondary'}
                leftIcon={active ? Check : undefined}
                loading={busy === choice.driverId}
                onClick={() => void chooseDriver(choice.driverId)}
              >
                {choice.label}
              </Button>
            );
          })}
        </div>
        <p className="mt-3 text-caption text-ink-tertiary">
          The pool trip below runs on the Innova (Arjun) and the Women-Only trip on the Ertiga (Sunita).
        </p>
      </Card>

      <Card className="mb-6">
        <h2 className="text-heading">Set up a scenario</h2>
        <p className="mt-1 text-body-sm text-ink-secondary">
          Each button creates an active trip you are already onboard, so the pooling walkthroughs work straight away.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button leftIcon={Car} loading={busy === 'POOL_SUV'} onClick={() => start('POOL_SUV')}>
            Start demo pool trip (Innova)
          </Button>
          <Button variant="secondary" leftIcon={ShieldCheck} loading={busy === 'WOMEN_ONLY'} onClick={() => start('WOMEN_ONLY')}>
            Start demo Women-Only trip
          </Button>
          <Button variant="ghost" leftIcon={RotateCcw} onClick={() => setConfirmReset(true)}>
            Reset demo data
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        <ScenarioList title="Ride discovery" scenarios={discoveryScenarios} />
        <ScenarioList title="Dynamic pooling" scenarios={poolingScenarios} />
      </div>

      <p className="mt-6 flex items-start gap-2 text-caption text-ink-tertiary">
        <FlaskConical className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        Seat numbers come from the demo fleet fixtures: pooling capacity = RC seats − driver seat − luggage-reserved seats.
      </p>

      <ConfirmDialog
        open={confirmReset}
        pending={busy === 'reset'}
        title="Reset all demo data?"
        description="Every demo booking, trip, pool offer and notification in this browser is deleted and the original samples are restored. This cannot be undone."
        confirmLabel="Reset demo data"
        cancelLabel="Keep my data"
        onConfirm={reset}
        onCancel={() => setConfirmReset(false)}
      />
    </Page>
  );
}
