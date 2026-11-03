import type {
  Booking,
  DriverAvailability,
  DriverDaySummary,
  DriverOfferView,
  DriverProfile,
  FareEstimate,
  NotificationAudience,
  PoolOfferOutcome,
  PoolOfferScenario,
  RideSearchInput,
  RiderNotification,
  SeatLimits,
  VehicleDiscoveryResult,
} from '@/types/domain';

export type OfferDecision = 'ACCEPT' | 'DECLINE';
export type DemoTripVariant = 'POOL_SUV' | 'WOMEN_ONLY';

/**
 * Rider booking boundary. MockRideService implements it with local demo data;
 * a FastAPI adapter will implement the same contract.
 *
 * Seat state is always vehicle-specific and counted in seats. Nothing here
 * performs real matching, dispatch, payment or route insertion.
 */
export interface RideService {
  estimate(input: RideSearchInput): Promise<FareEstimate>;
  /** Passenger-group limits derived from the (verified) fleet's capacity. */
  getSeatLimits(): Promise<SeatLimits>;
  /** Vehicles that can take the whole group, plus those that cannot and why. */
  discoverVehicles(input: RideSearchInput): Promise<VehicleDiscoveryResult>;

  /** Creates a request in SEARCHING state, optionally for a rider-chosen vehicle. */
  createBooking(input: RideSearchInput, requestedVehicleId?: string): Promise<Booking>;
  /** Resolves a SEARCHING request (driver assigned, scheduled, or no eligible match). */
  resolveBooking(bookingId: string): Promise<Booking>;
  cancelBooking(bookingId: string): Promise<Booking>;
  listBookings(): Promise<Booking[]>;

  // ── Active trip ───────────────────────────────────────────────────────────
  /** Driver reached the pickup point. Seats are unchanged. */
  arriveAtPickup(bookingId: string): Promise<Booking>;
  /** Simulated pickup: the rider's reserved seats become onboard seats. */
  boardTrip(bookingId: string): Promise<Booking>;
  /** Marks one ordered stop as done, e.g. a co-rider pickup or drop. */
  completeStop(bookingId: string, stopId: string): Promise<Booking>;
  completeTrip(bookingId: string): Promise<Booking>;

  // ── Driver ────────────────────────────────────────────────────────────────
  /** The driver with their associated vehicle and live seat state. */
  getDriverProfile(driverId: string): Promise<DriverProfile>;
  /**
   * Going offline removes the vehicle from new discovery and blocks new join
   * requests. It never touches an active trip or existing reservations.
   */
  setDriverAvailability(driverId: string, availability: DriverAvailability): Promise<DriverProfile>;
  /** Bookings assigned to this driver only. */
  listDriverBookings(driverId: string): Promise<Booking[]>;
  /** Join requests awaiting this driver's decision, for their vehicle only. */
  listDriverOffers(driverId: string): Promise<DriverOfferView[]>;
  /** Illustrative day figures derived from this driver's demo bookings. */
  getDriverSummary(driverId: string): Promise<DriverDaySummary>;

  // ── Dynamic pool joining ──────────────────────────────────────────────────
  /**
   * Creates a scripted join request against an active pool-enabled trip.
   * Hard constraints (capacity, Women-Only, pool state) are checked here, so
   * an ineligible request never becomes an offer and never holds a seat.
   */
  simulatePoolOffer(bookingId: string, scenario: PoolOfferScenario): Promise<PoolOfferOutcome>;
  /** Marks an offer as shown to the driver (OFFER_DISPLAYED → DRIVER_PENDING). */
  markOfferDisplayed(offerId: string): Promise<Booking>;
  /**
   * The driver's decision — the only approval in this workflow. Passengers
   * already on the trip are never asked; they are notified after acceptance.
   *
   * `actingDriverId` authorises the caller: a driver cannot answer for another
   * driver's vehicle. A real backend would take this from the session instead.
   */
  driverRespondToPoolOffer(offerId: string, decision: OfferDecision, actingDriverId?: string): Promise<Booking>;
  expirePoolOffer(offerId: string): Promise<Booking>;

  // ── Demo utilities ────────────────────────────────────────────────────────
  /** Creates a ready-made active trip for the pooling walkthrough. */
  seedDemoActiveTrip(variant: DemoTripVariant): Promise<Booking>;
  /** Clears all demo bookings and notifications, restoring seeded samples. */
  resetDemoData(): Promise<void>;

  /** Defaults to the host passenger's feed; pass an audience to read another. */
  listNotifications(audience?: NotificationAudience): Promise<RiderNotification[]>;
  markNotificationsRead(): Promise<RiderNotification[]>;
}
