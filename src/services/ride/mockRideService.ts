import { demoFleet, type DemoVehicleFixture } from '@/data/demoDrivers';
import { findLocation } from '@/data/jaipurLocations';
import {
  categorizeVehicle,
  convertHoldToReserved,
  holdSeats,
  releaseHold,
  reserveSeats,
  seatSnapshot,
  vehicleIneligibilityReasons,
  withOccupancy,
} from '@/lib/capacity';
import { nowIso, nowMs } from '@/lib/clock';
import { delay } from '@/lib/delay';
import { bookingsForDriver, driverOwnsBooking, offersForDriver } from '@/lib/driver';
import { formatINR } from '@/lib/format';
import { buildOfferQuote, isOfferOpen, isPastDeadline, missingStagesBefore, OFFER_TTL_SECONDS } from '@/lib/pooling';
import { storage } from '@/lib/storage';
import type {
  Booking,
  DriverAssignment,
  DriverAvailability,
  DriverProfile,
  IneligibilityReason,
  IneligibleVehicle,
  NotificationAudience,
  PoolJoinOffer,
  PoolOfferOutcome,
  PoolOfferScenario,
  PoolOfferStage,
  RideSearchInput,
  RiderNotification,
  SeatLimits,
  TripState,
  TripStop,
  VehicleDiscoveryResult,
  VehicleOption,
} from '@/types/domain';
import { estimateJourney, vehicleQuote } from './pricing';
import type { DemoTripVariant, OfferDecision, RideService } from './RideService';

/**
 * Demo ride service — a scripted simulation, not matching or dispatch.
 *
 * Capacity is vehicle-specific (see lib/capacity.ts and data/demoDrivers.ts)
 * and always counted in SEATS: a booking for 3 passengers consumes 3 seats, a
 * solo booking takes the whole vehicle, and an open join offer holds seats
 * once (a hold becomes a reservation on acceptance; it is never both).
 *
 * The driver is the sole approver of a join request. Passengers already on a
 * pool-enabled trip are informed after acceptance and never asked to approve.
 *
 * Deterministic outcomes:
 * - Women-Only + pickup in an outer area (Mahindra World City, Manipal
 *   University) → NO_MATCH. The request is never downgraded to a mixed ride.
 * - No vehicle with enough available seats for the group → NO_MATCH.
 * - A rider-selected vehicle that is no longer eligible → NO_MATCH naming it;
 *   another vehicle is never substituted silently.
 * - With no selection (scheduled rides), the shortest-ETA eligible vehicle is
 *   assigned.
 */

const BOOKINGS_KEY = 'poolmate.demo-bookings.v4';
const NOTIFICATIONS_KEY = 'poolmate.demo-notifications.v4';
const AVAILABILITY_KEY = 'poolmate.driver-availability.v1';
const SEARCH_LATENCY_MS = 2800;

/** Landmarks used as co-rider pickup/drop points in join offers. */
const JOIN_POINTS = ['statue-circle', 'wtp', 'jawahar-circle', 'raja-park', 'sms-hospital', 'badi-chaupar'];

const CATEGORY_ORDER = { MOVING_POOL: 0, WAITING_POOL: 1, EMPTY_VEHICLE: 2 } as const;

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const newId = (prefix: string) => `${prefix}-${nowMs().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
const referenceFor = (id: string) => `PM-${String(hash(id) % 10000).padStart(4, '0')}`;

function inputBetween(pickupId: string, destinationId: string, extra: Partial<RideSearchInput> = {}): RideSearchInput {
  const p = findLocation(pickupId);
  const d = findLocation(destinationId);
  if (!p || !d) throw new Error(`Unknown demo location: ${pickupId} / ${destinationId}`);
  return {
    pickup: p.position,
    pickupLabel: p.label,
    pickupId: p.id,
    destination: d.position,
    destinationLabel: d.label,
    destinationId: d.id,
    bookingMode: 'INSTANT',
    poolPreference: 'SOLO',
    womenOnly: false,
    seats: 1,
    ...extra,
  };
}

// ── Driver availability ─────────────────────────────────────────────────────

type AvailabilityMap = Record<string, DriverAvailability>;

/** Drivers are on duty unless they have explicitly gone offline. */
function readAvailability(): AvailabilityMap {
  return storage.get<AvailabilityMap>(AVAILABILITY_KEY) ?? {};
}

function availabilityOf(driverId: string): DriverAvailability {
  return readAvailability()[driverId] ?? 'ONLINE';
}

function driverOfVehicle(vehicleId: string): string | undefined {
  return demoFleet.find((v) => v.vehicleId === vehicleId)?.driverId;
}

function fixtureForDriver(driverId: string): DemoVehicleFixture {
  const fixture = demoFleet.find((v) => v.driverId === driverId);
  if (!fixture) throw new Error(`Unknown demo driver: ${driverId}`);
  return fixture;
}

// ── Seat accounting ─────────────────────────────────────────────────────────

interface VehicleUsage {
  onboardSeats: number;
  reservedSeats: number;
  activeSeatHolds: number;
  exclusive: boolean;
}

/**
 * Seats consumed on a vehicle by active demo bookings, counted per seat:
 * the booking's own passengers, co-riders who joined, and open offer holds.
 */
function vehicleUsage(vehicleId: string, bookings: Booking[]): VehicleUsage {
  const usage: VehicleUsage = { onboardSeats: 0, reservedSeats: 0, activeSeatHolds: 0, exclusive: false };

  for (const b of bookings) {
    if (b.status !== 'DRIVER_ASSIGNED' || b.driver?.vehicleId !== vehicleId) continue;
    if (b.trip?.phase === 'ONBOARD') usage.onboardSeats += b.input.seats;
    else usage.reservedSeats += b.input.seats;
    if (b.trip) {
      usage.reservedSeats += b.trip.joinedSeats;
      if (b.trip.offer && isOfferOpen(b.trip.offer.stage)) usage.activeSeatHolds += b.trip.offer.requestedSeats;
    }
    if (b.input.poolPreference === 'SOLO') usage.exclusive = true;
  }

  return usage;
}

function toVehicleOption(v: DemoVehicleFixture, input: RideSearchInput, bookings: Booking[]): VehicleOption {
  const usage = vehicleUsage(v.vehicleId, bookings);
  const seats = seatSnapshot(
    v.capacity,
    {
      onboardSeats: v.occupancy.onboardSeats + usage.onboardSeats,
      reservedSeats: v.occupancy.reservedSeats + usage.reservedSeats,
      activeSeatHolds: v.occupancy.activeSeatHolds + usage.activeSeatHolds,
    },
    usage.exclusive,
  );
  const category = categorizeVehicle(seats);
  const quote = vehicleQuote(input, v.vehicleId, category);

  return {
    vehicleId: v.vehicleId,
    driverLabel: v.driverLabel,
    vehicleModel: v.vehicleModel,
    vehicleType: v.vehicleType,
    plate: v.plate,
    rating: v.rating,
    status: v.status,
    category,
    womenOnlyEligible: v.womenOnlyEligible,
    seats,
    pickupEtaMinutes: 2 + (hash(v.vehicleId + (input.pickupId ?? '')) % 9),
    ...quote,
    demo: true,
  };
}

function discover(input: RideSearchInput, bookings: Booking[]): VehicleDiscoveryResult {
  const coverage = input.pickupId ? (findLocation(input.pickupId)?.womenOnlyCoverage ?? true) : true;
  const noCoverage = input.womenOnly && !coverage;

  const eligible: VehicleOption[] = [];
  const excluded: IneligibleVehicle[] = [];

  const availability = readAvailability();

  for (const fixture of demoFleet) {
    const vehicle = toVehicleOption(fixture, input, bookings);
    const reasons: IneligibilityReason[] = vehicleIneligibilityReasons(vehicle, input);
    if (noCoverage) reasons.unshift('NO_WOMEN_ONLY_COVERAGE');
    // An offline driver receives no new discovery requests. Trips already
    // assigned to them are unaffected — this only filters new searches.
    if ((availability[fixture.driverId] ?? 'ONLINE') === 'OFFLINE') reasons.unshift('DRIVER_OFFLINE');
    if (reasons.length) excluded.push({ vehicle, reasons });
    else eligible.push(vehicle);
  }

  // Presentation order from the spec: moving pool, waiting pool, then empty.
  eligible.sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || a.pickupEtaMinutes - b.pickupEtaMinutes);

  return { eligible, excluded, excludedCount: excluded.length };
}

// ── Assignment and trip state ───────────────────────────────────────────────

function assignmentFrom(option: VehicleOption, input: RideSearchInput): DriverAssignment {
  const fixture = demoFleet.find((v) => v.vehicleId === option.vehicleId)!;
  return {
    driverId: fixture.driverId,
    vehicleId: option.vehicleId,
    driverLabel: option.driverLabel,
    vehicleModel: option.vehicleModel,
    vehicleType: option.vehicleType,
    plate: option.plate,
    rating: option.rating,
    pickupEtaMinutes: option.pickupEtaMinutes,
    womenOnlyEligible: option.womenOnlyEligible,
    // Instant bookings reserve seats now; scheduled ones show today's capacity only.
    seats: input.bookingMode === 'INSTANT' ? reserveSeats(option.seats, input.seats, input.poolPreference === 'SOLO') : option.seats,
    demo: true,
  };
}

function makeTripState(option: VehicleOption, input: RideSearchInput, fare: number, durationMinutes: number, phase: TripState['phase'] = 'DRIVER_EN_ROUTE'): TripState {
  const solo = input.poolPreference === 'SOLO';
  const onboard = phase === 'ONBOARD';
  const base = reserveSeats(option.seats, input.seats, solo);
  const seats = onboard
    ? withOccupancy(base, { reservedSeats: base.reservedSeats - input.seats, onboardSeats: base.onboardSeats + input.seats }, solo)
    : base;

  const stops: TripStop[] = [
    {
      id: 'stop-pickup-you',
      kind: 'PICKUP',
      label: input.pickupLabel,
      passenger: 'You',
      seats: input.seats,
      etaMinutes: option.pickupEtaMinutes,
      status: onboard ? 'DONE' : 'PENDING',
    },
    {
      id: 'stop-drop-you',
      kind: 'DROP',
      label: input.destinationLabel,
      passenger: 'You',
      seats: input.seats,
      etaMinutes: option.pickupEtaMinutes + durationMinutes,
      status: 'PENDING',
    },
  ];

  return {
    phase,
    seats,
    stops,
    etaMinutes: onboard ? durationMinutes : option.pickupEtaMinutes,
    fare,
    poolStatus: solo ? 'SOLO' : 'POOL_OPEN',
    joinedSeats: 0,
    womenOnlyRestricted: input.womenOnly,
    offerLog: [],
  };
}

/**
 * Builds a seeded booking. `onVehicleId` forces a specific vehicle for
 * historical records, where present-day eligibility is irrelevant.
 */
function makeBooking(
  input: RideSearchInput,
  createdAt: Date,
  status: Booking['status'],
  seed: string,
  onVehicleId?: string,
): Booking {
  const id = `bk-seed-${seed}`;
  const iso = createdAt.toISOString();
  const forced = onVehicleId ? demoFleet.find((v) => v.vehicleId === onVehicleId) : undefined;
  const option = forced ? toVehicleOption(forced, input, []) : discover(input, []).eligible[0];
  const estimate = estimateJourney(input);
  return {
    id,
    reference: referenceFor(id),
    createdAt: iso,
    updatedAt: iso,
    status,
    input,
    estimate,
    driver: status === 'CANCELLED' || !option ? undefined : assignmentFrom(option, input),
    demo: true,
  };
}

/** Sample history so the dashboard is not empty on first visit. */
function seedBookings(now = new Date(nowMs())): Booking[] {
  const daysAgo = (d: number, h: number) => {
    const t = new Date(now);
    t.setDate(t.getDate() - d);
    t.setHours(h, 15, 0, 0);
    return t;
  };
  const todayAt = (hour: number) => {
    const t = new Date(now);
    t.setHours(Math.min(hour, Math.max(0, now.getHours())), 5, 0, 0);
    return t;
  };
  const upcoming = new Date(now);
  upcoming.setDate(upcoming.getDate() + 2);
  upcoming.setHours(9, 0, 0, 0);

  return [
    makeBooking(
      inputBetween('vaishali', 'mnit', { bookingMode: 'SCHEDULED', poolPreference: 'POOL_ENABLED', scheduledAt: upcoming.toISOString() }),
      daysAgo(0, Math.max(0, now.getHours() - 1)),
      'SCHEDULED',
      'upcoming-1',
    ),
    makeBooking(inputBetween('mnit', 'wtp', { poolPreference: 'POOL_ENABLED' }), daysAgo(1, 18), 'COMPLETED', 'past-1'),
    makeBooking(inputBetween('jaipur-jn', 'raja-park', { womenOnly: true }), daysAgo(3, 21), 'COMPLETED', 'past-2'),
    makeBooking(inputBetween('airport', 'statue-circle', { seats: 2 }), daysAgo(5, 7), 'CANCELLED', 'past-3'),
    makeBooking(inputBetween('uni-raj', 'hawa-mahal'), daysAgo(8, 16), 'COMPLETED', 'past-4'),

    // Earlier today on the default demo driver's vehicle, so their dashboard
    // has illustrative day figures instead of a row of zeros.
    makeBooking(inputBetween('mansarovar-metro', 'wtp', { poolPreference: 'POOL_ENABLED' }), todayAt(8), 'COMPLETED', 'driver-today-1', 'veh-c'),
    makeBooking(inputBetween('jawahar-circle', 'jaipur-jn', { poolPreference: 'POOL_ENABLED', seats: 2 }), todayAt(10), 'COMPLETED', 'driver-today-2', 'veh-c'),
    makeBooking(inputBetween('statue-circle', 'sitapura'), todayAt(11), 'COMPLETED', 'driver-today-3', 'veh-c'),
  ];
}

function seedNotifications(now = new Date(nowMs())): RiderNotification[] {
  const ago = (min: number) => new Date(now.getTime() - min * 60000).toISOString();
  return [
    { id: 'nt-seed-1', title: 'Scheduled ride confirmed', body: 'Vaishali Nagar → MNIT Jaipur is reserved. Demo driver details are on the trip.', createdAt: ago(55), read: false, bookingId: 'bk-seed-upcoming-1', demo: true },
    { id: 'nt-seed-2', title: 'Trip completed', body: 'MNIT Jaipur → World Trade Park. Fare shown was an estimate (demo).', createdAt: ago(60 * 24), read: true, bookingId: 'bk-seed-past-1', demo: true },
    { id: 'nt-seed-3', title: 'Welcome to the PoolMate demo', body: 'All drivers, fares and locations here are simulated sample data.', createdAt: ago(60 * 24 * 9), read: true, demo: true },
  ];
}

/**
 * Expires one open offer whose absolute deadline has passed, releasing its
 * seat hold exactly once. Route, stops, ETA, fare, pool status and joined
 * seats are deliberately left untouched.
 */
function expireByDeadline(booking: Booking, at: number): Booking | null {
  const trip = booking.trip;
  const offer = trip?.offer;
  if (!trip || !offer) return null;
  // An accepted offer has already become a reservation and can never expire.
  if (!isOfferOpen(offer.stage)) return null;
  if (!isPastDeadline(offer.expiresAt, at)) return null;

  return {
    ...booking,
    updatedAt: nowIso(),
    trip: {
      ...trip,
      offer: { ...offer, stage: 'OFFER_EXPIRED' },
      offerLog: [...trip.offerLog, { stage: 'OFFER_EXPIRED', at: nowIso(), note: 'Deadline passed' }],
      seats: releaseHold(trip.seats, offer.requestedSeats),
    },
  };
}

/**
 * Reconciles every stored booking against the clock. Called on each read, so
 * expiry never depends on a screen being open — and, because the expired
 * stage is persisted, repeated reads cannot release the same hold twice.
 */
function reconcileExpiredOffers(all: Booking[], at: number): { bookings: Booking[]; expired: Booking[] } {
  const expired: Booking[] = [];
  const bookings = all.map((booking) => {
    const next = expireByDeadline(booking, at);
    if (!next) return booking;
    expired.push(next);
    return next;
  });
  return { bookings, expired };
}

function readBookings(): Booking[] {
  const stored = storage.get<Booking[]>(BOOKINGS_KEY);
  if (!stored) {
    const seeded = seedBookings();
    storage.set(BOOKINGS_KEY, seeded);
    return seeded;
  }

  const { bookings, expired } = reconcileExpiredOffers(stored, nowMs());
  if (expired.length) {
    storage.set(BOOKINGS_KEY, bookings);
    // Uses a different storage key, so this cannot recurse into readBookings.
    expired.forEach((booking) => pushExpiryNotification(booking));
  }
  return bookings;
}

function readNotifications(): RiderNotification[] {
  const stored = storage.get<RiderNotification[]>(NOTIFICATIONS_KEY);
  if (stored) return stored;
  const seeded = seedNotifications();
  storage.set(NOTIFICATIONS_KEY, seeded);
  return seeded;
}

function updateBooking(id: string, patch: (b: Booking) => Booking): Booking {
  const all = readBookings();
  const index = all.findIndex((b) => b.id === id);
  if (index < 0) throw new Error('Booking not found');
  const next = { ...patch(all[index]!), updatedAt: nowIso() };
  all[index] = next;
  storage.set(BOOKINGS_KEY, all);
  return next;
}

function pushNotification(title: string, body: string, bookingId?: string, audience: NotificationAudience = 'EXISTING_PASSENGER') {
  const all = readNotifications();
  all.unshift({ id: newId('nt'), title, body, bookingId, audience, createdAt: nowIso(), read: false, demo: true });
  storage.set(NOTIFICATIONS_KEY, all.slice(0, 40));
}

/** Tells the joining passenger their request lapsed. The host trip is unaffected. */
function pushExpiryNotification(booking: Booking): void {
  pushNotification(
    'Your join request expired',
    'The driver did not respond in time, so the seat hold was released.',
    booking.id,
    'JOINING_PASSENGER',
  );
}

const route = (b: Booking) => `${b.input.pickupLabel} → ${b.input.destinationLabel}`;

/** The driver with their one associated vehicle and live seat state. */
function driverProfile(driverId: string): DriverProfile {
  const fixture = fixtureForDriver(driverId);
  const bookings = readBookings();
  // Reuses the shared capacity logic rather than recomputing seats here.
  const vehicle = toVehicleOption(fixture, inputBetween('mnit', 'wtp'), bookings);

  return {
    driverId,
    driverLabel: fixture.driverLabel,
    rating: fixture.rating,
    availability: availabilityOf(driverId),
    vehicle: {
      vehicleId: vehicle.vehicleId,
      vehicleModel: vehicle.vehicleModel,
      vehicleType: vehicle.vehicleType,
      plate: vehicle.plate,
      status: vehicle.status,
      womenOnlyEligible: vehicle.womenOnlyEligible,
      seats: vehicle.seats,
    },
    demo: true,
  };
}

// ── Pool offers ─────────────────────────────────────────────────────────────

function requireTrip(booking: Booking): TripState {
  if (!booking.trip) throw new Error('This trip is not active.');
  return booking.trip;
}

function findBookingByOffer(offerId: string): Booking {
  const booking = readBookings().find((b) => b.trip?.offer?.id === offerId);
  if (!booking) throw new Error('Offer not found');
  return booking;
}

/** Appends lifecycle events and sets the offer's current stage. */
function advanceOffer(booking: Booking, stages: PoolOfferStage[], mutate?: (trip: TripState, offer: PoolJoinOffer) => TripState): Booking {
  return updateBooking(booking.id, (b) => {
    const trip = requireTrip(b);
    const offer = trip.offer;
    if (!offer) throw new Error('Offer not found');
    const stage = stages[stages.length - 1]!;
    const at = nowIso();
    const next: TripState = {
      ...trip,
      offer: { ...offer, stage },
      offerLog: [...trip.offerLog, ...stages.map((s) => ({ stage: s, at }))],
    };
    return { ...b, trip: mutate ? mutate(next, { ...offer, stage }) : next };
  });
}

function offerStops(seed: string, excludeIds: Array<string | undefined>): { pickup: string; drop: string } {
  const candidates = JOIN_POINTS.filter((id) => !excludeIds.includes(id));
  const h = hash(seed);
  const pickupId = candidates[h % candidates.length] ?? 'statue-circle';
  const dropId = candidates.filter((id) => id !== pickupId)[h % Math.max(1, candidates.length - 1)] ?? 'wtp';
  return {
    pickup: findLocation(pickupId)?.label ?? 'Statue Circle',
    drop: findLocation(dropId)?.label ?? 'World Trade Park',
  };
}

export const mockRideService: RideService = {
  async estimate(input) {
    await delay(350);
    if (input.pickupId && input.pickupId === input.destinationId) throw new Error('Pickup and destination must be different.');
    return estimateJourney(input);
  },

  async getSeatLimits(): Promise<SeatLimits> {
    await delay(100);
    const pooling = (v: DemoVehicleFixture) => seatSnapshot(v.capacity, v.occupancy).poolingCapacity;
    return {
      // Solo may use RC-pending vehicles (demo policy); pooling only verified ones.
      SOLO: Math.max(0, ...demoFleet.map(pooling)),
      POOL_ENABLED: Math.max(0, ...demoFleet.filter((v) => v.capacity.rcVerified).map(pooling)),
    };
  },

  async discoverVehicles(input) {
    await delay(400);
    return discover(input, readBookings());
  },

  async createBooking(input, requestedVehicleId) {
    await delay(500);
    const id = newId('bk');
    const now = nowIso();
    const base = estimateJourney(input);

    // Keep the stored estimate consistent with the vehicle the rider chose.
    const chosen = requestedVehicleId
      ? discover(input, readBookings()).eligible.find((o) => o.vehicleId === requestedVehicleId)
      : undefined;
    const estimate = chosen
      ? { ...base, estimatedFare: chosen.estimatedFare, maximumFare: chosen.maximumFare ?? base.maximumFare }
      : base;

    const booking: Booking = {
      id,
      reference: referenceFor(id),
      createdAt: now,
      updatedAt: now,
      status: 'SEARCHING',
      input,
      estimate,
      requestedVehicleId,
      demo: true,
    };
    storage.set(BOOKINGS_KEY, [booking, ...readBookings()]);
    return booking;
  },

  async resolveBooking(bookingId) {
    await delay(SEARCH_LATENCY_MS);
    const current = readBookings().find((b) => b.id === bookingId);
    if (!current) throw new Error('Booking not found');
    if (current.status !== 'SEARCHING') return current; // e.g. cancelled meanwhile

    const { input } = current;
    const others = readBookings().filter((b) => b.id !== bookingId);
    const { eligible } = discover(input, others);

    // A rider-chosen vehicle is honoured or reported — never substituted.
    const option = current.requestedVehicleId ? eligible.find((o) => o.vehicleId === current.requestedVehicleId) : eligible[0];

    if (!option) {
      const coverage = input.pickupId ? (findLocation(input.pickupId)?.womenOnlyCoverage ?? true) : true;
      const group = `${input.seats} ${input.seats === 1 ? 'passenger' : 'passengers'}`;
      const chosen = current.requestedVehicleId ? demoFleet.find((v) => v.vehicleId === current.requestedVehicleId) : undefined;
      const result = updateBooking(bookingId, (b) => ({
        ...b,
        status: 'NO_MATCH',
        noMatchReason: chosen
          ? `${chosen.vehicleModel} (${chosen.plate}) no longer has ${input.seats} available ${input.seats === 1 ? 'seat' : 'seats'}. Choose another vehicle — your requirements were not changed.`
          : input.womenOnly && !coverage
            ? 'No eligible Women-Only demo vehicle serves this pickup yet.'
            : input.womenOnly
              ? `No eligible Women-Only demo vehicle has ${input.seats} available seats right now (${group}).`
              : `No demo vehicle has ${input.seats} available seats for your group of ${group} right now.`,
      }));
      pushNotification(input.womenOnly ? 'No eligible Women-Only ride found yet' : 'No ride found', route(result), bookingId);
      return result;
    }

    const scheduled = input.bookingMode === 'SCHEDULED';
    const driver = assignmentFrom(option, input);
    const result = updateBooking(bookingId, (b) => ({
      ...b,
      status: scheduled ? 'SCHEDULED' : 'DRIVER_ASSIGNED',
      driver,
      trip: scheduled ? undefined : makeTripState(option, input, b.estimate.estimatedFare, b.estimate.durationMinutes),
    }));
    pushNotification(scheduled ? 'Scheduled ride confirmed' : 'Driver assigned', `${route(result)} · ${driver.driverLabel}`, bookingId);
    return result;
  },

  async cancelBooking(bookingId) {
    await delay(450);
    const current = readBookings().find((b) => b.id === bookingId);
    if (!current) throw new Error('Booking not found');
    if (!['SEARCHING', 'DRIVER_ASSIGNED', 'SCHEDULED'].includes(current.status)) {
      throw new Error('This booking can no longer be cancelled.');
    }
    // Cancelling frees every seat this booking held, including any open offer hold.
    const result = updateBooking(bookingId, (b) => ({ ...b, status: 'CANCELLED', trip: undefined }));
    pushNotification('Ride cancelled', `${route(result)} · No cancellation fee in the demo.`, bookingId);
    return result;
  },

  async listBookings() {
    await delay(250);
    return readBookings();
  },

  // ── Active trip ───────────────────────────────────────────────────────────

  async arriveAtPickup(bookingId) {
    await delay(350);
    const booking = readBookings().find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');
    const trip = requireTrip(booking);
    if (trip.phase !== 'DRIVER_EN_ROUTE') throw new Error('The driver has already arrived.');
    // Arrival changes no seats: the rider is still only reserved.
    return updateBooking(bookingId, (b) => ({ ...b, trip: { ...requireTrip(b), phase: 'ARRIVED', etaMinutes: 0 } }));
  },

  async completeStop(bookingId, stopId) {
    await delay(300);
    const booking = readBookings().find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');
    const trip = requireTrip(booking);
    const stop = trip.stops.find((s) => s.id === stopId);
    if (!stop) throw new Error('Stop not found');
    if (stop.status === 'DONE') return booking;

    return updateBooking(bookingId, (b) => {
      const t = requireTrip(b);
      const target = t.stops.find((s) => s.id === stopId)!;
      const solo = b.input.poolPreference === 'SOLO';
      // A co-rider pickup puts their reserved seats onboard; their drop frees them.
      const seats =
        target.passenger === 'You'
          ? t.seats
          : target.kind === 'PICKUP'
            ? withOccupancy(
                t.seats,
                { reservedSeats: t.seats.reservedSeats - target.seats, onboardSeats: t.seats.onboardSeats + target.seats },
                solo,
              )
            : withOccupancy(t.seats, { onboardSeats: t.seats.onboardSeats - target.seats }, solo);

      return {
        ...b,
        trip: { ...t, seats, stops: t.stops.map((s) => (s.id === stopId ? { ...s, status: 'DONE' as const } : s)) },
      };
    });
  },

  async boardTrip(bookingId) {
    await delay(400);
    const booking = readBookings().find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');
    const trip = requireTrip(booking);
    if (trip.phase !== 'DRIVER_EN_ROUTE' && trip.phase !== 'ARRIVED') throw new Error('This trip has already started.');

    return updateBooking(bookingId, (b) => {
      const t = requireTrip(b);
      const solo = b.input.poolPreference === 'SOLO';
      return {
        ...b,
        trip: {
          ...t,
          phase: 'ONBOARD',
          seats: withOccupancy(
            t.seats,
            { reservedSeats: t.seats.reservedSeats - b.input.seats, onboardSeats: t.seats.onboardSeats + b.input.seats },
            solo,
          ),
          stops: t.stops.map((s) => (s.kind === 'PICKUP' && s.passenger === 'You' ? { ...s, status: 'DONE' } : s)),
          etaMinutes: b.estimate.durationMinutes,
        },
      };
    });
  },

  async completeTrip(bookingId) {
    await delay(500);
    const booking = readBookings().find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');
    requireTrip(booking);

    const result = updateBooking(bookingId, (b) => {
      const t = requireTrip(b);
      return {
        ...b,
        status: 'COMPLETED',
        trip: {
          ...t,
          phase: 'COMPLETED',
          poolStatus: 'POOL_CLOSED',
          // Releases this booking's seats and any outstanding hold.
          seats: withOccupancy(t.seats, { onboardSeats: 0, reservedSeats: 0, activeSeatHolds: 0 }),
          stops: t.stops.map((s) => ({ ...s, status: 'DONE' as const })),
          offer: t.offer && isOfferOpen(t.offer.stage) ? { ...t.offer, stage: 'OFFER_EXPIRED' } : t.offer,
        },
      };
    });
    pushNotification('Trip completed', `${route(result)} · Fare shown was an estimate (demo).`, bookingId);
    return result;
  },

  // ── Driver ────────────────────────────────────────────────────────────────

  async getDriverProfile(driverId) {
    await delay(200);
    return driverProfile(driverId);
  },

  async setDriverAvailability(driverId, availability) {
    await delay(250);
    // Only affects new discovery and new join requests; active trips, holds
    // and reservations are deliberately left untouched.
    storage.set(AVAILABILITY_KEY, { ...readAvailability(), [driverId]: availability });
    return driverProfile(driverId);
  },

  async listDriverBookings(driverId) {
    await delay(250);
    return bookingsForDriver(readBookings(), driverId);
  },

  async listDriverOffers(driverId) {
    await delay(200);
    return offersForDriver(readBookings(), driverId);
  },

  async getDriverSummary(driverId) {
    await delay(250);
    const fixture = fixtureForDriver(driverId);
    const startOfDay = new Date(nowMs());
    startOfDay.setHours(0, 0, 0, 0);

    const today = bookingsForDriver(readBookings(), driverId).filter(
      (b) => b.status === 'COMPLETED' && new Date(b.updatedAt).getTime() >= startOfDay.getTime(),
    );

    return {
      earnings: today.reduce((sum, b) => sum + (b.trip?.fare ?? b.estimate.estimatedFare), 0),
      completedTrips: today.length,
      distanceKm: Math.round(today.reduce((sum, b) => sum + b.estimate.distanceKm, 0) * 10) / 10,
      poolingTrips: today.filter((b) => b.input.poolPreference === 'POOL_ENABLED').length,
      rating: fixture.rating,
      demo: true,
    };
  },

  // ── Dynamic pool joining ──────────────────────────────────────────────────

  async simulatePoolOffer(bookingId, scenario: PoolOfferScenario): Promise<PoolOfferOutcome> {
    await delay(700);
    const booking = readBookings().find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    const trip = booking.trip;
    if (!trip || booking.status !== 'DRIVER_ASSIGNED') {
      return { ok: false, code: 'TRIP_NOT_ACTIVE', message: 'A join offer needs an active trip with an assigned driver.' };
    }
    if (booking.input.poolPreference !== 'POOL_ENABLED') {
      return { ok: false, code: 'POOL_NOT_ENABLED', message: 'This is a solo ride, so nobody can be added to it.' };
    }
    if (trip.offer && isOfferOpen(trip.offer.stage)) {
      return { ok: false, code: 'OFFER_ALREADY_ACTIVE', message: 'An offer is already awaiting a decision on this trip.' };
    }
    const vehicleDriver = booking.driver?.vehicleId ? driverOfVehicle(booking.driver.vehicleId) : undefined;
    if (vehicleDriver && availabilityOf(vehicleDriver) === 'OFFLINE') {
      return { ok: false, code: 'DRIVER_OFFLINE', message: 'The driver is offline, so no new join request is sent to them.' };
    }

    const available = trip.seats.availableSeats;
    const requestedSeats = scenario === 'LARGE_GROUP' ? available + 2 : scenario === 'COMPATIBLE' ? Math.max(1, Math.min(2, available)) : 1;
    const joinerEligible = scenario !== 'WOMEN_ONLY_INELIGIBLE';

    // Trip-level Women-Only restriction: an ineligible passenger is rejected
    // outright, and the host trip is left exactly as it was.
    if (trip.womenOnlyRestricted && !joinerEligible) {
      pushNotification(
        'Join request rejected',
        'A passenger who is not Women-Only eligible asked to join your Women-Only trip. PoolMate rejected it automatically.',
        bookingId,
      );
      return {
        ok: false,
        code: 'WOMEN_ONLY_INELIGIBLE',
        message: 'This trip is Women-Only. A passenger who does not meet that requirement cannot join, so the request was rejected.',
      };
    }

    if (requestedSeats > available) {
      return {
        ok: false,
        code: 'INSUFFICIENT_SEATS',
        message: `The joining group needs ${requestedSeats} seats but only ${available} ${available === 1 ? 'seat is' : 'seats are'} available on this vehicle.`,
      };
    }

    const offerId = newId('offer');
    const stops = offerStops(offerId, [booking.input.pickupId, booking.input.destinationId]);
    const quote = buildOfferQuote(offerId, trip.fare, trip.etaMinutes, requestedSeats);
    const heldSeats = holdSeats(trip.seats, requestedSeats);

    const offer: PoolJoinOffer = {
      id: offerId,
      bookingId,
      stage: 'OFFER_CREATED',
      createdAt: nowIso(),
      // Absolute deadline, persisted with the offer so expiry survives
      // reloads and does not depend on any screen being open.
      expiresAt: new Date(nowMs() + OFFER_TTL_SECONDS * 1000).toISOString(),
      requestedSeats,
      pickupLabel: stops.pickup,
      dropLabel: stops.drop,
      availableSeatsBefore: available,
      availableSeatsAfter: heldSeats.availableSeats,
      extraDistanceKm: quote.extraDistanceKm,
      extraDurationMinutes: quote.extraDurationMinutes,
      existingRiderDelayMinutes: quote.existingRiderDelayMinutes,
      revisedEtaMinutes: quote.revisedEtaMinutes,
      originalFare: trip.fare,
      revisedFare: quote.revisedFare,
      driverExtraEarnings: quote.driverExtraEarnings,
      joiningPassengerWomenOnlyEligible: joinerEligible,
      demo: true,
    };

    const result = updateBooking(bookingId, (b) => {
      const t = requireTrip(b);
      return {
        ...b,
        // The hold is recorded once, on the vehicle's seat state.
        trip: { ...t, seats: heldSeats, offer, offerLog: [...t.offerLog, { stage: 'OFFER_CREATED', at: offer.createdAt }] },
      };
    });
    // No notification to passengers already onboard: they opted into pooling
    // and are told only once the driver has accepted.
    return { ok: true, booking: result };
  },

  async markOfferDisplayed(offerId) {
    const booking = findBookingByOffer(offerId);
    const stage = booking.trip?.offer?.stage;
    if (stage !== 'OFFER_CREATED') return booking;
    // Shown in the driver's app, which is exactly when it awaits their decision.
    return advanceOffer(booking, ['OFFER_DISPLAYED', 'DRIVER_PENDING']);
  },

  async driverRespondToPoolOffer(offerId, decision: OfferDecision, actingDriverId?: string) {
    await delay(900);
    const booking = findBookingByOffer(offerId);
    const offer = booking.trip?.offer;
    if (!offer) throw new Error('Offer not found');
    // Only the driver responsible for this vehicle may decide.
    if (actingDriverId && !driverOwnsBooking(booking, actingDriverId)) {
      throw new Error('This join request belongs to another driver’s vehicle.');
    }
    if (!isOfferOpen(offer.stage)) throw new Error('This request is no longer open.');

    const trip = requireTrip(booking);
    // Acceptance can never override a hard constraint: re-check that the held
    // seats still fit the vehicle's pooling capacity.
    if (decision === 'ACCEPT' && offer.requestedSeats > trip.seats.activeSeatHolds + trip.seats.availableSeats) {
      throw new Error('The vehicle no longer has room for this group.');
    }

    // Keep the logged lifecycle in order if the driver decided first.
    const prefix = missingStagesBefore(offer.stage);

    if (decision === 'DECLINE') {
      const result = advanceOffer(booking, [...prefix, 'DRIVER_DECLINED'], (t, o) => ({
        ...t,
        // Release the hold exactly once; route, ETA and fare stay unchanged.
        seats: releaseHold(t.seats, o.requestedSeats),
      }));
      pushNotification(
        'Your join request was declined',
        `The driver could not take ${offer.pickupLabel} → ${offer.dropLabel}. No seats were reserved.`,
        booking.id,
        'JOINING_PASSENGER',
      );
      return result;
    }

    // Accepted: the hold becomes a reservation (counted once), the route gains
    // the co-rider's stops, and ETA/fare move to the previewed values.
    const result = advanceOffer(booking, [...prefix, 'DRIVER_ACCEPTED', 'ROUTE_UPDATED'], (trip, o) => {
      const yourDropIndex = trip.stops.findIndex((s) => s.kind === 'DROP' && s.passenger === 'You');
      const coRiderPickup: TripStop = {
        id: `stop-pickup-${o.id}`,
        kind: 'PICKUP',
        label: o.pickupLabel,
        passenger: 'Co-rider',
        seats: o.requestedSeats,
        etaMinutes: Math.max(1, o.revisedEtaMinutes - 2),
        status: 'PENDING',
      };
      const coRiderDrop: TripStop = {
        id: `stop-drop-${o.id}`,
        kind: 'DROP',
        label: o.dropLabel,
        passenger: 'Co-rider',
        seats: o.requestedSeats,
        etaMinutes: o.revisedEtaMinutes + 4,
        status: 'PENDING',
      };
      const stops = [...trip.stops];
      stops.splice(Math.max(0, yourDropIndex), 0, coRiderPickup);
      stops.push(coRiderDrop);

      return {
        ...trip,
        seats: convertHoldToReserved(trip.seats, o.requestedSeats),
        joinedSeats: trip.joinedSeats + o.requestedSeats,
        stops,
        etaMinutes: o.revisedEtaMinutes,
        fare: o.revisedFare,
        poolStatus: 'POOL_JOINED',
      };
    });
    // Only now are the passengers already onboard told — informational, with
    // no action required from them.
    const fareNote =
      offer.revisedFare === offer.originalFare
        ? 'Your fare is unchanged'
        : offer.revisedFare < offer.originalFare
          ? `Your fare drops to ${formatINR(offer.revisedFare)}`
          : `Your fare changes to ${formatINR(offer.revisedFare)}`;
    pushNotification(
      'A passenger is joining your ride',
      `Pickup at ${offer.pickupLabel} · ETA now ~${offer.revisedEtaMinutes} min (+${offer.existingRiderDelayMinutes} min) · ${fareNote} (demo estimate)`,
      booking.id,
    );
    // The joining passenger gets their own confirmation with the agreed stops.
    pushNotification(
      'Your join request was accepted',
      `Pickup ${offer.pickupLabel} → drop ${offer.dropLabel} · pickup ETA ~${Math.max(1, offer.revisedEtaMinutes - 2)} min (demo estimate)`,
      booking.id,
      'JOINING_PASSENGER',
    );
    return result;
  },

  async expirePoolOffer(offerId) {
    // `findBookingByOffer` reads, which already expires anything past its
    // deadline; this only force-expires an offer that is still in time.
    const booking = findBookingByOffer(offerId);
    const offer = booking.trip?.offer;
    if (!offer || !isOfferOpen(offer.stage)) return booking;
    const result = advanceOffer(booking, ['OFFER_EXPIRED'], (trip, o) => ({
      ...trip,
      // Release the hold exactly once; the trip is left untouched.
      seats: releaseHold(trip.seats, o.requestedSeats),
    }));
    pushExpiryNotification(booking);
    return result;
  },

  // ── Demo utilities ────────────────────────────────────────────────────────

  async seedDemoActiveTrip(variant: DemoTripVariant) {
    await delay(600);
    const input =
      variant === 'WOMEN_ONLY'
        ? inputBetween('jaipur-jn', 'raja-park', { poolPreference: 'POOL_ENABLED', womenOnly: true })
        : inputBetween('mnit', 'jaipur-jn', { poolPreference: 'POOL_ENABLED' });
    const preferredVehicle = variant === 'WOMEN_ONLY' ? 'veh-f' : 'veh-c';

    const existing = readBookings();
    const { eligible } = discover(input, existing);
    const option = eligible.find((o) => o.vehicleId === preferredVehicle) ?? eligible[0];
    if (!option) throw new Error('No eligible demo vehicle is free for this scenario. Reset the demo data and try again.');

    const id = newId('bk');
    const estimate = estimateJourney(input);
    const booking: Booking = {
      id,
      reference: referenceFor(id),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      status: 'DRIVER_ASSIGNED',
      input,
      estimate,
      requestedVehicleId: option.vehicleId,
      driver: assignmentFrom(option, input),
      // Starts already onboard, so a co-rider can be inserted into the
      // remaining route straight away.
      trip: makeTripState(option, input, estimate.estimatedFare, estimate.durationMinutes, 'ONBOARD'),
      demo: true,
    };
    storage.set(BOOKINGS_KEY, [booking, ...existing]);
    pushNotification(
      variant === 'WOMEN_ONLY' ? 'Demo Women-Only trip started' : 'Demo pool trip started',
      `${route(booking)} · ${booking.driver?.vehicleModel}`,
      id,
    );
    return booking;
  },

  async resetDemoData() {
    await delay(300);
    storage.remove(BOOKINGS_KEY);
    storage.remove(NOTIFICATIONS_KEY);
  },

  async listNotifications(audience: NotificationAudience = 'EXISTING_PASSENGER') {
    await delay(150);
    // Seeded samples predate audiences, so an absent value means the host.
    return readNotifications().filter((n) => (n.audience ?? 'EXISTING_PASSENGER') === audience);
  },

  async markNotificationsRead() {
    await delay(150);
    const all = readNotifications().map((n) => ({ ...n, read: true }));
    storage.set(NOTIFICATIONS_KEY, all);
    return all;
  },
};
