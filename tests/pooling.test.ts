/**
 * Automated assertions for capacity and the driver-approved pooling workflow.
 *
 * Runs the real mock service in Node (`npm test`), with a small localStorage
 * stub standing in for the browser. No test framework is installed, so this
 * file is a plain script that exits non-zero on the first set of failures.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const store: Record<string, string> = {};
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  },
};

import { findLocation } from '@/data/jaipurLocations';
import { fixedClock, resetClock, setClock } from '@/lib/clock';
import { isOfferOpen, OFFER_TTL_SECONDS } from '@/lib/pooling';
import { mockRideService as svc } from '@/services/ride/mockRideService';
import type { Booking, PoolPreference, RideSearchInput, TripState } from '@/types/domain';

// ── harness ────────────────────────────────────────────────────────────────

const failures: string[] = [];
let checks = 0;

function check(name: string, condition: boolean, detail = ''): void {
  checks += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`${condition ? 'pass' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function section(title: string): void {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

function rideInput(pickup: string, destination: string, seats: number, poolPreference: PoolPreference, womenOnly = false): RideSearchInput {
  const p = findLocation(pickup);
  const d = findLocation(destination);
  if (!p || !d) throw new Error('unknown demo location');
  return {
    pickup: p.position,
    pickupLabel: p.label,
    pickupId: p.id,
    destination: d.position,
    destinationLabel: d.label,
    destinationId: d.id,
    bookingMode: 'INSTANT',
    poolPreference,
    womenOnly,
    seats,
  };
}

const tripOf = (booking: Booking): TripState => {
  if (!booking.trip) throw new Error(`booking ${booking.id} has no trip state`);
  return booking.trip;
};

const reload = async (id: string): Promise<Booking> => {
  const found = (await svc.listBookings()).find((b) => b.id === id);
  if (!found) throw new Error(`booking ${id} not found`);
  return found;
};

/**
 * Suites share one demo fleet, so each starts from seeded state. Without this
 * a leftover hold or reservation from an earlier suite occupies the vehicle.
 */
async function freshDemoData(): Promise<void> {
  await svc.resetDemoData();
}

/** Creates an onboard pool trip and an open join request on it. */
async function tripWithOpenRequest(variant: 'POOL_SUV' | 'WOMEN_ONLY' = 'POOL_SUV') {
  const seeded = await svc.seedDemoActiveTrip(variant);
  const outcome = await svc.simulatePoolOffer(seeded.id, 'COMPATIBLE');
  if (!outcome.ok) throw new Error(`could not create a demo offer: ${outcome.code}`);
  const booking = await svc.markOfferDisplayed(outcome.booking.trip!.offer!.id);
  return { booking, trip: tripOf(booking), offer: tripOf(booking).offer! };
}

// ── suites ─────────────────────────────────────────────────────────────────

/** Vehicle-specific capacity: no global passenger cap, seats counted as seats. */
async function capacitySuite() {
  section('dynamic vehicle capacity');
  await freshDemoData();

  const limits = await svc.getSeatLimits();
  check('pooling limit comes from the fleet, not a fixed 2', limits.POOL_ENABLED === 6, JSON.stringify(limits));

  const single = await svc.discoverVehicles(rideInput('mnit', 'wtp', 1, 'POOL_ENABLED'));
  const categories = new Set(single.eligible.map((v) => v.category));
  check('results cover moving, waiting and empty sections', categories.size === 3, [...categories].join(','));
  check(
    'RC-pending vehicle is never offered for pooling',
    single.excluded.some((e) => e.vehicle.vehicleId === 'veh-e' && e.reasons.includes('RC_UNVERIFIED')),
  );
  check(
    'full vehicle is excluded for insufficient seats',
    single.excluded.some((e) => e.vehicle.vehicleId === 'veh-h' && e.reasons.includes('INSUFFICIENT_SEATS')),
  );
  check('every offered vehicle fits the whole group', single.eligible.every((v) => v.seats.availableSeats >= 1));

  const group4 = await svc.discoverVehicles(rideInput('mnit', 'wtp', 4, 'POOL_ENABLED'));
  check(
    'a group of 4 only matches vehicles with 4+ seats free',
    group4.eligible.length > 0 && group4.eligible.every((v) => v.seats.availableSeats >= 4),
    group4.eligible.map((v) => `${v.vehicleId}:${v.seats.availableSeats}`).join(' '),
  );

  const group6 = await svc.discoverVehicles(rideInput('mnit', 'wtp', 6, 'POOL_ENABLED'));
  check('a group larger than any vehicle matches nothing', group6.eligible.length === 0);

  const womenOnly = await svc.discoverVehicles(rideInput('mnit', 'wtp', 2, 'POOL_ENABLED', true));
  check('Women-Only discovery only offers eligible vehicles', womenOnly.eligible.every((v) => v.womenOnlyEligible));

  const outerArea = await svc.discoverVehicles(rideInput('mwc', 'wtp', 1, 'POOL_ENABLED', true));
  check(
    'Women-Only with no local coverage offers nothing',
    outerArea.eligible.length === 0 && outerArea.excluded.every((e) => e.reasons.includes('NO_WOMEN_ONLY_COVERAGE')),
  );
}

/** 1 · The existing passenger is never given an approval action. */
async function noPassengerApprovalSuite() {
  section('1 · existing passenger has no approval action');
  await freshDemoData();

  check(
    'service exposes no rider-approval method',
    !('respondToPoolOffer' in svc) && !('riderRespondToPoolOffer' in svc),
    Object.keys(svc).filter((k) => /respond/i.test(k)).join(','),
  );

  const { booking, offer } = await tripWithOpenRequest();
  check('an open request never reaches a rider-approval stage', isOfferOpen(offer.stage) && offer.stage === 'DRIVER_PENDING', offer.stage);
  check(
    'no rider stage is ever logged',
    tripOf(booking).offerLog.every((e) => !String(e.stage).startsWith('RIDER_')),
    tripOf(booking).offerLog.map((e) => e.stage).join('>'),
  );

  // Approval lives on the driver side only. The rider's trip components must
  // carry no approval control and must not reference the decision call.
  const tripDir = join(process.cwd(), 'src', 'components', 'rider', 'trip');
  const notice = readFileSync(join(tripDir, 'CoRiderJoinedNotice.tsx'), 'utf8');
  const forbidden = ['Accept request', 'Reject request', 'Approve co-rider', 'Decline co-rider', 'driverRespondToOffer', 'respondToOffer'];
  const found = forbidden.filter((term) => notice.includes(term));
  check('passenger notice has no approval controls', found.length === 0, found.join(','));
  check('passenger notice renders no buttons for a decision', !/Accept|Decline|Approve|Reject/.test(notice));

  const riderTripFiles = readdirSync(tripDir).filter((f) => f.endsWith('.tsx'));
  const riderApprovalLeaks = riderTripFiles.filter((file) => readFileSync(join(tripDir, file), 'utf8').includes('RespondToOffer'));
  check('no rider trip component calls the driver decision', riderApprovalLeaks.length === 0, riderApprovalLeaks.join(','));

  const driverCard = readFileSync(join(process.cwd(), 'src', 'components', 'driver', 'DriverOfferCard.tsx'), 'utf8');
  check('driver offer card is the approval surface', driverCard.includes('driverRespondToOffer'));
  check('driver approval passes the acting driver for authorisation', driverCard.includes('actingDriverId'));
}

/** 6 · Nothing about the trip changes until the driver accepts. */
async function routeUnchangedUntilAcceptanceSuite() {
  section('6 · route unchanged before driver acceptance');
  await freshDemoData();

  const seeded = await svc.seedDemoActiveTrip('POOL_SUV');
  const before = tripOf(seeded);
  // `trip.seats` is a vehicle-level snapshot, so assertions compare the CHANGE
  // rather than absolute totals.
  const baseline = {
    stops: before.stops.length,
    eta: before.etaMinutes,
    fare: before.fare,
    reserved: before.seats.reservedSeats,
    holds: before.seats.activeSeatHolds,
    joined: before.joinedSeats,
    pool: before.poolStatus,
    available: before.seats.availableSeats,
  };

  const outcome = await svc.simulatePoolOffer(seeded.id, 'COMPATIBLE');
  check('an eligible request creates an offer', outcome.ok);
  if (!outcome.ok) return null;

  const pendingBooking = await svc.markOfferDisplayed(outcome.booking.trip!.offer!.id);
  const pending = tripOf(pendingBooking);
  const offer = pending.offer!;

  check('route is untouched while pending', pending.stops.length === baseline.stops);
  check('ETA is untouched while pending', pending.etaMinutes === baseline.eta);
  check('fare is untouched while pending', pending.fare === baseline.fare);
  check('no seats are reserved while pending', pending.seats.reservedSeats === baseline.reserved);
  check('no co-rider is counted while pending', pending.joinedSeats === baseline.joined);
  check('pool status is unchanged while pending', pending.poolStatus === baseline.pool);
  check(
    'seats are held, reducing availability exactly once',
    pending.seats.activeSeatHolds === baseline.holds + offer.requestedSeats &&
      pending.seats.availableSeats === baseline.available - offer.requestedSeats,
    `holds ${baseline.holds}→${pending.seats.activeSeatHolds}, available ${baseline.available}→${pending.seats.availableSeats}`,
  );

  const hostFeed = await svc.listNotifications();
  check(
    'existing passenger is not notified while the driver decides',
    !hostFeed.some((n) => n.bookingId === seeded.id && /joining/i.test(n.title)),
    hostFeed.filter((n) => n.bookingId === seeded.id).map((n) => n.title).join(' | '),
  );

  return { bookingId: seeded.id, baseline, offer };
}

/** 2, 3, 7 · Acceptance updates the trip once and notifies both sides. */
async function acceptanceSuite(context: Awaited<ReturnType<typeof routeUnchangedUntilAcceptanceSuite>>) {
  section('2, 3, 7 · driver acceptance');
  if (!context) {
    check('acceptance suite had a pending offer to work with', false);
    return;
  }
  const { bookingId, baseline, offer } = context;

  const accepted = await svc.driverRespondToPoolOffer(offer.id, 'ACCEPT');
  const trip = tripOf(accepted);

  check('lifecycle ends at ROUTE_UPDATED', trip.offer!.stage === 'ROUTE_UPDATED', trip.offer!.stage);
  check(
    'lifecycle follows the driver-only sequence',
    trip.offerLog.map((e) => e.stage).join('>') === 'OFFER_CREATED>OFFER_DISPLAYED>DRIVER_PENDING>DRIVER_ACCEPTED>ROUTE_UPDATED',
    trip.offerLog.map((e) => e.stage).join('>'),
  );

  // 7 · hold becomes a reservation exactly once.
  check(
    "this request's hold is cleared on acceptance",
    trip.seats.activeSeatHolds === baseline.holds,
    `holds=${trip.seats.activeSeatHolds} expected=${baseline.holds}`,
  );
  check('hold became a reservation', trip.seats.reservedSeats === baseline.reserved + offer.requestedSeats, `reserved=${trip.seats.reservedSeats}`);
  check(
    'conversion does not double count',
    trip.seats.availableSeats === baseline.available - offer.requestedSeats,
    `available=${trip.seats.availableSeats} expected=${baseline.available - offer.requestedSeats}`,
  );
  check(
    'occupied seats never exceed pooling capacity',
    trip.seats.onboardSeats + trip.seats.reservedSeats + trip.seats.activeSeatHolds <= trip.seats.poolingCapacity,
  );
  check('co-rider seats are tracked', trip.joinedSeats === offer.requestedSeats);
  check('route gains the co-rider stops', trip.stops.length === baseline.stops + 2 && trip.stops.some((s) => s.passenger === 'Co-rider'));
  check('ETA and fare match the previewed values', trip.etaMinutes === offer.revisedEtaMinutes && trip.fare === offer.revisedFare);
  check('existing passenger fare is not silently increased', trip.fare <= baseline.fare, `${baseline.fare} → ${trip.fare}`);

  // 2 · existing passenger notification.
  const hostFeed = await svc.listNotifications();
  const hostNote = hostFeed.find((n) => n.bookingId === bookingId && /joining your ride/i.test(n.title));
  check('existing passenger is notified after acceptance', Boolean(hostNote), hostNote?.title ?? 'missing');
  check(
    'that notification carries pickup, ETA and fare detail',
    Boolean(hostNote && hostNote.body.includes(offer.pickupLabel) && /ETA/.test(hostNote.body) && /fare/i.test(hostNote.body)),
    hostNote?.body ?? '',
  );

  // 3 · joining passenger confirmation, kept out of the host's feed.
  const joinerFeed = await svc.listNotifications('JOINING_PASSENGER');
  const joinerNote = joinerFeed.find((n) => n.bookingId === bookingId && /accepted/i.test(n.title));
  check('joining passenger is confirmed', Boolean(joinerNote), joinerNote?.title ?? 'missing');
  check(
    'confirmation gives pickup, drop and ETA',
    Boolean(joinerNote && joinerNote.body.includes(offer.pickupLabel) && joinerNote.body.includes(offer.dropLabel) && /ETA/.test(joinerNote.body)),
    joinerNote?.body ?? '',
  );
  check(
    "joiner messages stay out of the host's feed",
    !hostFeed.some((n) => n.audience === 'JOINING_PASSENGER'),
  );

  return { bookingId, trip };
}

/** 4 · Decline releases the hold exactly once and changes nothing else. */
async function declineSuite() {
  section('4 · driver decline releases the hold');
  await freshDemoData();

  const { booking, offer } = await tripWithOpenRequest();
  const pending = tripOf(booking);
  const declined = await svc.driverRespondToPoolOffer(offer.id, 'DECLINE');
  const trip = tripOf(declined);

  check('stage is DRIVER_DECLINED', trip.offer!.stage === 'DRIVER_DECLINED', trip.offer!.stage);
  check(
    'hold released',
    trip.seats.activeSeatHolds === pending.seats.activeSeatHolds - offer.requestedSeats,
    `holds ${pending.seats.activeSeatHolds}→${trip.seats.activeSeatHolds}`,
  );
  check(
    'availability restored exactly once',
    trip.seats.availableSeats === pending.seats.availableSeats + offer.requestedSeats,
    `${pending.seats.availableSeats} → ${trip.seats.availableSeats}`,
  );
  check('no reservation was made', trip.seats.reservedSeats === pending.seats.reservedSeats && trip.joinedSeats === 0);
  check('route, ETA and fare preserved', trip.stops.length === pending.stops.length && trip.etaMinutes === pending.etaMinutes && trip.fare === pending.fare);

  const hostFeed = await svc.listNotifications();
  check(
    'existing passenger is not told about a declined request',
    !hostFeed.some((n) => n.bookingId === booking.id && /declin/i.test(n.title)),
  );
  const joinerFeed = await svc.listNotifications('JOINING_PASSENGER');
  check('joining passenger is told it was declined', joinerFeed.some((n) => n.bookingId === booking.id && /declined/i.test(n.title)));

  // A second decline must not release seats twice.
  let threw = false;
  await svc.driverRespondToPoolOffer(offer.id, 'DECLINE').catch(() => {
    threw = true;
  });
  const after = tripOf(await reload(booking.id));
  check('a repeated decline is refused', threw);
  check('seats are not released twice', after.seats.availableSeats === trip.seats.availableSeats, `available=${after.seats.availableSeats}`);
}

/** 5 · Expiry releases the hold exactly once. */
async function expirySuite() {
  section('5 · expiry releases the hold');
  await freshDemoData();

  const { booking, offer } = await tripWithOpenRequest();
  const pending = tripOf(booking);
  const expired = await svc.expirePoolOffer(offer.id);
  const trip = tripOf(expired);

  check('stage is OFFER_EXPIRED', trip.offer!.stage === 'OFFER_EXPIRED', trip.offer!.stage);
  check(
    'hold released on expiry',
    trip.seats.activeSeatHolds === pending.seats.activeSeatHolds - offer.requestedSeats,
    `holds ${pending.seats.activeSeatHolds}→${trip.seats.activeSeatHolds}`,
  );
  check(
    'availability restored exactly once',
    trip.seats.availableSeats === pending.seats.availableSeats + offer.requestedSeats,
    `${pending.seats.availableSeats} → ${trip.seats.availableSeats}`,
  );
  check('trip otherwise unchanged', trip.stops.length === pending.stops.length && trip.fare === pending.fare && trip.joinedSeats === 0);

  await svc.expirePoolOffer(offer.id);
  const again = tripOf(await reload(booking.id));
  check('expiring twice does not release seats twice', again.seats.availableSeats === trip.seats.availableSeats);

  let threw = false;
  await svc.driverRespondToPoolOffer(offer.id, 'ACCEPT').catch(() => {
    threw = true;
  });
  check('an expired request cannot be accepted', threw);
  const afterAccept = tripOf(await reload(booking.id));
  check('the expired request never updated the route', afterAccept.stops.length === pending.stops.length && afterAccept.joinedSeats === 0);
}

/** 8 · Women-Only and capacity rejections happen before any offer exists. */
async function hardConstraintSuite() {
  section('8 · Women-Only and capacity constraints');
  await freshDemoData();

  const woTrip = await svc.seedDemoActiveTrip('WOMEN_ONLY');
  check('a Women-Only booking produces a restricted trip', tripOf(woTrip).womenOnlyRestricted);
  const availableBefore = tripOf(woTrip).seats.availableSeats;

  const rejected = await svc.simulatePoolOffer(woTrip.id, 'WOMEN_ONLY_INELIGIBLE');
  check('ineligible joiner is rejected', !rejected.ok && rejected.code === 'WOMEN_ONLY_INELIGIBLE', rejected.ok ? 'created' : rejected.code);

  const afterReject = tripOf(await reload(woTrip.id));
  check('no offer is created for the driver to see', !afterReject.offer);
  check('no seats are held by a rejected request', afterReject.seats.availableSeats === availableBefore);

  const eligible = await svc.simulatePoolOffer(woTrip.id, 'COMPATIBLE');
  check('an eligible joiner is still accepted onto a Women-Only trip', eligible.ok);

  // Vehicle eligibility is not the same as a trip-level restriction.
  const ordinary = await svc.seedDemoActiveTrip('POOL_SUV');
  check('an ordinary pool trip is not Women-Only restricted', !tripOf(ordinary).womenOnlyRestricted);
  const nonEligibleJoiner = await svc.simulatePoolOffer(ordinary.id, 'WOMEN_ONLY_INELIGIBLE');
  check('a non-eligible joiner may join an unrestricted trip', nonEligibleJoiner.ok, nonEligibleJoiner.ok ? '' : nonEligibleJoiner.code);

  // One request at a time per trip; clear that one before the next check.
  if (nonEligibleJoiner.ok) {
    const queued = await svc.simulatePoolOffer(ordinary.id, 'COMPATIBLE');
    check('a second request is refused while one is open', !queued.ok && queued.code === 'OFFER_ALREADY_ACTIVE', queued.ok ? 'created' : queued.code);
    await svc.driverRespondToPoolOffer(nonEligibleJoiner.booking.trip!.offer!.id, 'DECLINE');
  }

  // Capacity cannot be overridden.
  const tooLarge = await svc.simulatePoolOffer(ordinary.id, 'LARGE_GROUP');
  check('a group beyond capacity is rejected', !tooLarge.ok && tooLarge.code === 'INSUFFICIENT_SEATS', tooLarge.ok ? 'created' : tooLarge.code);

  const soloInput = rideInput('uni-raj', 'hawa-mahal', 1, 'SOLO');
  const freeVehicle = (await svc.discoverVehicles(soloInput)).eligible[0];
  check('a vehicle is free for a solo ride', Boolean(freeVehicle));
  if (freeVehicle) {
    const created = await svc.createBooking(soloInput, freeVehicle.vehicleId);
    const resolvedBooking = await svc.resolveBooking(created.id);
    check('a chosen vehicle is honoured', resolvedBooking.driver?.vehicleId === freeVehicle.vehicleId, resolvedBooking.noMatchReason ?? '');
    check('a solo trip leaves no seats available', tripOf(resolvedBooking).seats.availableSeats === 0);
    const soloOffer = await svc.simulatePoolOffer(created.id, 'COMPATIBLE');
    check('a solo trip takes no joiners', !soloOffer.ok && soloOffer.code === 'POOL_NOT_ENABLED', soloOffer.ok ? 'created' : soloOffer.code);
  }

  const fullVehicle = await svc.createBooking(rideInput('mnit', 'wtp', 1, 'POOL_ENABLED'), 'veh-h');
  const noMatch = await svc.resolveBooking(fullVehicle.id);
  check(
    'an unavailable chosen vehicle reports no match instead of substituting',
    noMatch.status === 'NO_MATCH' && /Marazzo/.test(noMatch.noMatchReason ?? ''),
    noMatch.noMatchReason ?? '',
  );
}

/**
 * Timestamp-driven expiry. The service owns expiry and reconciles it on every
 * read, so these assertions never open a screen or wait on the wall clock —
 * they advance an injected clock instead.
 */
async function expirySuiteHardening() {
  section('expiry hardening · service-owned, timestamp-driven');
  await freshDemoData();

  const start = Date.parse('2026-11-03T10:00:00.000Z');
  const testClock = fixedClock(start);
  setClock(testClock);

  try {
    // ── an offer nobody ever looked at ───────────────────────────────────────
    const seeded = await svc.seedDemoActiveTrip('POOL_SUV');
    const baseline = tripOf(seeded);
    const created = await svc.simulatePoolOffer(seeded.id, 'COMPATIBLE');
    check('request created for the expiry walkthrough', created.ok);
    if (!created.ok) return;

    const offer = tripOf(created.booking).offer!;
    const held = tripOf(created.booking);
    check(
      'offer persists an absolute deadline',
      offer.expiresAt === new Date(start + OFFER_TTL_SECONDS * 1000).toISOString(),
      offer.expiresAt,
    );
    check('seats are held while it is in time', held.seats.availableSeats === baseline.seats.availableSeats - offer.requestedSeats);

    // Before the deadline, a read must leave it alone.
    testClock.advance((OFFER_TTL_SECONDS - 5) * 1000);
    const beforeDeadline = tripOf(await reload(seeded.id));
    check('still open just before the deadline', isOfferOpen(beforeDeadline.offer!.stage), beforeDeadline.offer!.stage);
    check('hold still in place before the deadline', beforeDeadline.seats.availableSeats === held.seats.availableSeats);

    // Past the deadline with no screen open: the next read reconciles it.
    testClock.advance(6 * 1000);
    const afterRead = tripOf(await reload(seeded.id));
    check('expired on the next service read', afterRead.offer!.stage === 'OFFER_EXPIRED', afterRead.offer!.stage);
    check(
      'hold released exactly once',
      afterRead.seats.availableSeats === baseline.seats.availableSeats,
      `available=${afterRead.seats.availableSeats} expected=${baseline.seats.availableSeats}`,
    );
    check('expiry logged once', afterRead.offerLog.filter((e) => e.stage === 'OFFER_EXPIRED').length === 1);

    // Requirement 6: nothing about the trip itself may move.
    check('stops unchanged by expiry', afterRead.stops.length === baseline.stops.length);
    check('fare unchanged by expiry', afterRead.fare === baseline.fare, `${baseline.fare} → ${afterRead.fare}`);
    check('ETA unchanged by expiry', afterRead.etaMinutes === baseline.etaMinutes);
    check('pool status unchanged by expiry', afterRead.poolStatus === baseline.poolStatus);
    check('no co-rider counted by expiry', afterRead.joinedSeats === 0 && afterRead.seats.reservedSeats === baseline.seats.reservedSeats);

    const joinerFeed = await svc.listNotifications('JOINING_PASSENGER');
    check('joining passenger told it expired', joinerFeed.some((n) => n.bookingId === seeded.id && /expired/i.test(n.title)));

    // Requirement 9: repeated reads must be idempotent.
    const reads = [tripOf(await reload(seeded.id)), tripOf(await reload(seeded.id)), tripOf(await reload(seeded.id))];
    check(
      'repeated reads never release the hold twice',
      reads.every((t) => t.seats.availableSeats === afterRead.seats.availableSeats),
      reads.map((t) => t.seats.availableSeats).join(','),
    );
    check('repeated reads log no further expiry', reads.every((t) => t.offerLog.filter((e) => e.stage === 'OFFER_EXPIRED').length === 1));

    // A different read path sees the same reconciled state.
    const discovery = await svc.discoverVehicles(rideInput('mnit', 'wtp', 1, 'POOL_ENABLED'));
    const vehicle = [...discovery.eligible, ...discovery.excluded.map((e) => e.vehicle)].find(
      (v) => v.vehicleId === seeded.driver?.vehicleId,
    );
    check('discovery reflects the released hold', vehicle?.seats.activeSeatHolds === 0, `holds=${vehicle?.seats.activeSeatHolds}`);

    // A lapsed request can no longer be approved.
    let acceptThrew = false;
    await svc.driverRespondToPoolOffer(offer.id, 'ACCEPT').catch(() => {
      acceptThrew = true;
    });
    check('driver cannot accept a lapsed request', acceptThrew);
    const afterLateAccept = tripOf(await reload(seeded.id));
    check(
      'a late acceptance changes nothing',
      afterLateAccept.stops.length === baseline.stops.length && afterLateAccept.joinedSeats === 0 && afterLateAccept.fare === baseline.fare,
    );

    // ── requirement 10: an accepted offer outlives its deadline ─────────────
    await freshDemoData();
    testClock.set(start);
    const host = await svc.seedDemoActiveTrip('POOL_SUV');
    const hostBaseline = tripOf(host);
    const second = await svc.simulatePoolOffer(host.id, 'COMPATIBLE');
    check('second request created', second.ok);
    if (!second.ok) return;

    const acceptedOffer = tripOf(second.booking).offer!;
    const accepted = tripOf(await svc.driverRespondToPoolOffer(acceptedOffer.id, 'ACCEPT'));
    check('accepted before its deadline', accepted.offer!.stage === 'ROUTE_UPDATED');
    const reservedAfterAccept = accepted.seats.reservedSeats;

    // Jump an hour past the original deadline and read repeatedly.
    testClock.advance(60 * 60 * 1000);
    const later = [tripOf(await reload(host.id)), tripOf(await reload(host.id))];
    check('accepted offer never expires', later.every((t) => t.offer!.stage === 'ROUTE_UPDATED'), later.map((t) => t.offer!.stage).join(','));
    check('converted reservation is never released', later.every((t) => t.seats.reservedSeats === reservedAfterAccept));
    check('co-rider stays on the trip', later.every((t) => t.joinedSeats === acceptedOffer.requestedSeats));
    check('updated route survives the deadline', later.every((t) => t.stops.length === hostBaseline.stops.length + 2));
    check('no expiry is logged for an accepted offer', later.every((t) => !t.offerLog.some((e) => e.stage === 'OFFER_EXPIRED')));
  } finally {
    resetClock();
  }
}

/**
 * Driver dashboard behaviour. The driver experience reads the same records as
 * the rider, so these assertions check scoping, authorisation, availability
 * and that one decision updates the single shared trip.
 */
async function driverSuite() {
  section('driver · scoping, availability and shared state');
  await freshDemoData();

  const innovaDriver = 'drv-03'; // owns veh-c, which the pool walkthrough uses
  const ertigaDriver = 'drv-06'; // owns veh-f

  const profile = await svc.getDriverProfile(innovaDriver);
  check('driver is associated with exactly one vehicle', profile.vehicle.vehicleId === 'veh-c', profile.vehicle.vehicleId);
  check('driver profile is online by default', profile.availability === 'ONLINE');
  check(
    'vehicle seats come from the shared capacity rules',
    profile.vehicle.seats.poolingCapacity === profile.vehicle.seats.rcSeatingCapacity - profile.vehicle.seats.driverSeats - profile.vehicle.seats.luggageReservedSeats,
    `pooling=${profile.vehicle.seats.poolingCapacity}`,
  );

  const summary = await svc.getDriverSummary(innovaDriver);
  check('day figures are derived, not invented', summary.completedTrips >= 0 && summary.earnings >= 0, JSON.stringify(summary));

  // ── scoping: a driver sees only their own vehicle ───────────────────────
  const hostTrip = await svc.seedDemoActiveTrip('POOL_SUV');
  check('demo pool trip runs on the Innova driver’s vehicle', hostTrip.driver?.driverId === innovaDriver, hostTrip.driver?.driverId ?? 'none');

  const innovaBookings = await svc.listDriverBookings(innovaDriver);
  const ertigaBookings = await svc.listDriverBookings(ertigaDriver);
  check('driver sees their own trips', innovaBookings.some((b) => b.id === hostTrip.id));
  check('driver sees only their own vehicle’s trips', innovaBookings.every((b) => b.driver?.driverId === innovaDriver));
  check('another driver does not see that trip', !ertigaBookings.some((b) => b.id === hostTrip.id));

  const created = await svc.simulatePoolOffer(hostTrip.id, 'COMPATIBLE');
  check('join request created on the host trip', created.ok);
  if (!created.ok) return;
  const offer = tripOf(created.booking).offer!;

  const innovaOffers = await svc.listDriverOffers(innovaDriver);
  const ertigaOffers = await svc.listDriverOffers(ertigaDriver);
  check('pending request reaches the responsible driver', innovaOffers.some((o) => o.offer.id === offer.id), `${innovaOffers.length} offers`);
  check('request carries the host trip for context', innovaOffers[0]?.booking.id === hostTrip.id);
  check('request is not shown to another driver', ertigaOffers.length === 0);

  // ── authorisation ───────────────────────────────────────────────────────
  let wrongDriverThrew = false;
  await svc.driverRespondToPoolOffer(offer.id, 'ACCEPT', ertigaDriver).catch(() => {
    wrongDriverThrew = true;
  });
  check('wrong driver cannot accept another vehicle’s request', wrongDriverThrew);

  const untouched = tripOf(await reload(hostTrip.id));
  check('a rejected attempt changes nothing', untouched.offer!.stage === offer.stage && untouched.joinedSeats === 0);
  check('the hold is still in place', untouched.seats.activeSeatHolds === offer.requestedSeats);

  // ── acceptance updates the one shared trip ──────────────────────────────
  const baselineFare = untouched.fare;
  const baselineStops = untouched.stops.length;
  const accepted = await svc.driverRespondToPoolOffer(offer.id, 'ACCEPT', innovaDriver);
  const acceptedTrip = tripOf(accepted);

  check('responsible driver can accept', acceptedTrip.offer!.stage === 'ROUTE_UPDATED', acceptedTrip.offer!.stage);
  check('hold converted exactly once', acceptedTrip.seats.activeSeatHolds === 0 && acceptedTrip.joinedSeats === offer.requestedSeats);
  check('shared trip route updated', acceptedTrip.stops.length === baselineStops + 2);
  check('shared trip fare updated by the pricing rules', acceptedTrip.fare === offer.revisedFare && acceptedTrip.fare <= baselineFare);

  // The rider reads the same record — no separate copy, no manual refresh.
  const riderView = await reload(hostTrip.id);
  check('rider sees the same updated trip', tripOf(riderView).stops.length === acceptedTrip.stops.length && tripOf(riderView).fare === acceptedTrip.fare);
  const driverView = (await svc.listDriverBookings(innovaDriver)).find((b) => b.id === hostTrip.id)!;
  check(
    'capacity matches across driver and rider views',
    tripOf(driverView).seats.availableSeats === tripOf(riderView).seats.availableSeats &&
      tripOf(driverView).seats.reservedSeats === tripOf(riderView).seats.reservedSeats,
    `driver=${tripOf(driverView).seats.availableSeats} rider=${tripOf(riderView).seats.availableSeats}`,
  );

  const hostFeed = await svc.listNotifications();
  check('existing passenger notified only after acceptance', hostFeed.some((n) => n.bookingId === hostTrip.id && /joining your ride/i.test(n.title)));
  const joinerFeed = await svc.listNotifications('JOINING_PASSENGER');
  check('joining passenger confirmed', joinerFeed.some((n) => n.bookingId === hostTrip.id && /accepted/i.test(n.title)));
  check('request disappears from the driver queue once decided', (await svc.listDriverOffers(innovaDriver)).length === 0);

  // ── driver decline ──────────────────────────────────────────────────────
  const beforeDecline = tripOf(await reload(hostTrip.id));
  const secondRequest = await svc.simulatePoolOffer(hostTrip.id, 'COMPATIBLE');
  if (secondRequest.ok) {
    const second = tripOf(secondRequest.booking).offer!;
    const declined = tripOf(await svc.driverRespondToPoolOffer(second.id, 'DECLINE', innovaDriver));
    check('driver decline releases the hold once', declined.seats.availableSeats === beforeDecline.seats.availableSeats);
    check('decline leaves route, ETA and fare alone', declined.stops.length === beforeDecline.stops.length && declined.fare === beforeDecline.fare);
    check('declined request leaves the driver queue', (await svc.listDriverOffers(innovaDriver)).length === 0);
  } else {
    check('second request could be created for the decline check', false, secondRequest.code);
  }

  // ── availability ────────────────────────────────────────────────────────
  const activeBefore = tripOf(await reload(hostTrip.id));
  const offlineProfile = await svc.setDriverAvailability(innovaDriver, 'OFFLINE');
  check('driver can go offline', offlineProfile.availability === 'OFFLINE');

  const discovery = await svc.discoverVehicles(rideInput('mnit', 'wtp', 1, 'POOL_ENABLED'));
  check('offline vehicle is not offered in discovery', !discovery.eligible.some((v) => v.vehicleId === 'veh-c'));
  check(
    'offline vehicle is excluded for being offline',
    discovery.excluded.some((e) => e.vehicle.vehicleId === 'veh-c' && e.reasons.includes('DRIVER_OFFLINE')),
  );

  const offlineOffer = await svc.simulatePoolOffer(hostTrip.id, 'COMPATIBLE');
  check('offline driver receives no new join request', !offlineOffer.ok && offlineOffer.code === 'DRIVER_OFFLINE', offlineOffer.ok ? 'created' : offlineOffer.code);

  const activeAfter = tripOf(await reload(hostTrip.id));
  check(
    'going offline leaves the active trip intact',
    activeAfter.phase === activeBefore.phase &&
      activeAfter.stops.length === activeBefore.stops.length &&
      activeAfter.fare === activeBefore.fare &&
      activeAfter.joinedSeats === activeBefore.joinedSeats,
  );
  check(
    'going offline preserves existing reservations',
    activeAfter.seats.reservedSeats === activeBefore.seats.reservedSeats && activeAfter.seats.onboardSeats === activeBefore.seats.onboardSeats,
    `reserved=${activeAfter.seats.reservedSeats} onboard=${activeAfter.seats.onboardSeats}`,
  );
  check('the driver still sees their active trip while offline', (await svc.listDriverBookings(innovaDriver)).some((b) => b.id === hostTrip.id));

  const onlineAgain = await svc.setDriverAvailability(innovaDriver, 'ONLINE');
  check('driver can come back online', onlineAgain.availability === 'ONLINE');
  const afterOnline = await svc.discoverVehicles(rideInput('mnit', 'wtp', 1, 'POOL_ENABLED'));
  check('vehicle returns to discovery when online', afterOnline.eligible.some((v) => v.vehicleId === 'veh-c'));

  // ── trip progression and completion ─────────────────────────────────────
  // A freshly assigned booking starts before pickup, unlike the seeded demo
  // trip which begins already onboard.
  await freshDemoData();
  const progressionInput = rideInput('mnit', 'wtp', 1, 'POOL_ENABLED');
  const innovaOption = (await svc.discoverVehicles(progressionInput)).eligible.find((v) => v.vehicleId === 'veh-c');
  check('Innova is available for a new booking', Boolean(innovaOption));
  const newBooking = await svc.createBooking(progressionInput, innovaOption!.vehicleId);
  const assigned = await svc.resolveBooking(newBooking.id);
  check('a new booking starts before pickup', tripOf(assigned).phase === 'DRIVER_EN_ROUTE', tripOf(assigned).phase);
  const reservedOnAssign = tripOf(assigned).seats.reservedSeats;

  const arrived = await svc.arriveAtPickup(newBooking.id);
  check('arrival changes phase only', tripOf(arrived).phase === 'ARRIVED');
  check(
    'arrival leaves seat counts untouched',
    tripOf(arrived).seats.reservedSeats === reservedOnAssign && tripOf(arrived).seats.onboardSeats === tripOf(assigned).seats.onboardSeats,
  );

  const boarded = await svc.boardTrip(newBooking.id);
  check('boarding works from the arrived phase', tripOf(boarded).phase === 'ONBOARD');
  check(
    'boarding moves reserved seats to onboard',
    tripOf(boarded).seats.reservedSeats === reservedOnAssign - assigned.input.seats &&
      tripOf(boarded).seats.onboardSeats === tripOf(assigned).seats.onboardSeats + assigned.input.seats,
    `reserved=${tripOf(boarded).seats.reservedSeats} onboard=${tripOf(boarded).seats.onboardSeats}`,
  );
  check('boarding does not change total occupancy', tripOf(boarded).seats.availableSeats === tripOf(assigned).seats.availableSeats);

  const completed = await svc.completeTrip(newBooking.id);
  check('driver completes the trip', completed.status === 'COMPLETED' && tripOf(completed).phase === 'COMPLETED');
  check('completion releases every seat', tripOf(completed).seats.onboardSeats === 0 && tripOf(completed).seats.reservedSeats === 0);
  const freed = await svc.discoverVehicles(rideInput('mnit', 'wtp', 4, 'POOL_ENABLED'));
  const freedVehicle = freed.eligible.find((v) => v.vehicleId === 'veh-c');
  check('released seats are available again in discovery', Boolean(freedVehicle), `available=${freedVehicle?.seats.availableSeats}`);

  const summaryAfter = await svc.getDriverSummary(innovaDriver);
  check('completed trip counts towards the day figures', summaryAfter.completedTrips >= 1, JSON.stringify(summaryAfter));

  // ── Women-Only stays enforced on the driver side ────────────────────────
  await freshDemoData();
  const woTrip = await svc.seedDemoActiveTrip('WOMEN_ONLY');
  check('Women-Only trip runs on a Women-Only eligible vehicle', woTrip.driver?.womenOnlyEligible === true);
  const rejected = await svc.simulatePoolOffer(woTrip.id, 'WOMEN_ONLY_INELIGIBLE');
  check('ineligible joiner never reaches the driver', !rejected.ok && rejected.code === 'WOMEN_ONLY_INELIGIBLE', rejected.ok ? 'created' : rejected.code);
  const woDriver = woTrip.driver!.driverId;
  check('no request appears in that driver’s queue', (await svc.listDriverOffers(woDriver)).length === 0);
  check('the Women-Only trip is unchanged', tripOf(await reload(woTrip.id)).womenOnlyRestricted === true);
}

async function main() {
  await svc.resetDemoData();

  await capacitySuite();
  await noPassengerApprovalSuite();
  const pendingContext = await routeUnchangedUntilAcceptanceSuite();
  await acceptanceSuite(pendingContext);
  await declineSuite();
  await expirySuite();
  await expirySuiteHardening();
  await hardConstraintSuite();
  await driverSuite();

  console.log(`\n${checks} checks run.`);
  if (failures.length) {
    console.error(`\n${failures.length} FAILED:\n- ${failures.join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log('All checks passed.');
  }
}

void main().catch((error: unknown) => {
  console.error('\nTest run crashed:', error);
  process.exitCode = 1;
});
