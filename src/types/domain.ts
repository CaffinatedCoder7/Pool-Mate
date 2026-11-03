/**
 * PoolMate frontend domain types (see POOLMATE_FRONTEND_SPEC.md §10).
 * These mirror the expected FastAPI contracts but are NOT backend validation.
 */

// ── Identity ────────────────────────────────────────────────────────────────

export type UserRole = 'RIDER' | 'DRIVER';
export type WomenOnlyStatus = 'OFF' | 'REQUESTED' | 'DEMO_VERIFIED';

export interface DemoUser {
  id: string;
  displayName: string;
  roles: UserRole[];
  womenOnlyStatus: WomenOnlyStatus;
  /**
   * Which demo driver this account drives as, linking the session to one
   * vehicle in the fleet. A driver never sees another driver's vehicle.
   */
  driverId: string;
  /** Always true in this milestone: no real identity is attached. */
  demo: true;
}

export interface Session {
  user: DemoUser;
  /** Role the user last worked in; used to pick the landing route. */
  lastRole: UserRole;
}

// ── Geography ───────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationSuggestion {
  id: string;
  label: string;
  secondaryLabel?: string;
  position: LatLng;
  kind: 'CAMPUS' | 'TRANSIT' | 'OFFICE' | 'RESIDENTIAL' | 'LANDMARK';
  /** Demo fixture flag: whether eligible Women-Only demo vehicles serve this pickup. */
  womenOnlyCoverage: boolean;
}

// ── Ride search & results ───────────────────────────────────────────────────

export type BookingMode = 'INSTANT' | 'SCHEDULED';
export type PoolPreference = 'SOLO' | 'POOL_ENABLED';
export type RideCategory = 'MOVING_POOL' | 'WAITING_POOL' | 'EMPTY_VEHICLE';
export type VehicleStatus = 'IDLE' | 'EN_ROUTE' | 'ACTIVE_POOLING' | 'POOLING_CLOSED';
export type PassengerStatus = 'REQUESTED' | 'OFFERED' | 'RESERVED' | 'ONBOARD' | 'DROPPED';

export interface RideSearchInput {
  pickup: LatLng;
  pickupLabel: string;
  destination: LatLng;
  destinationLabel: string;
  bookingMode: BookingMode;
  poolPreference: PoolPreference;
  womenOnly: boolean;
  scheduledAt?: string;
  seats: number;
  /** Fixture ids, so the mock can apply deterministic demo scenarios. */
  pickupId?: string;
  destinationId?: string;
}

export interface RideOption {
  id: string;
  category: RideCategory;
  vehicleType: string;
  pickupEtaMinutes: number;
  estimatedFare: number;
  maximumFare?: number;
  availableSeats: number;
  onboardCount: number;
  extraDelayMinutes?: number;
  extraDistanceKm?: number;
  routePolyline?: LatLng[];
  womenOnlyEligible: boolean;
  demo: true;
}

export interface FareEstimate {
  currency: 'INR';
  estimatedFare: number;
  maximumFare?: number;
  distanceKm: number;
  durationMinutes: number;
  /** Upper bound when a co-rider may join (pool-enabled only). */
  maxDurationMinutes?: number;
  /** Frontend estimates are illustrative; the backend confirms the real fare. */
  isEstimate: true;
}

// ── Bookings ────────────────────────────────────────────────────────────────

export type BookingStatus = 'SEARCHING' | 'DRIVER_ASSIGNED' | 'SCHEDULED' | 'NO_MATCH' | 'CANCELLED' | 'COMPLETED';

// ── Vehicle capacity (vehicle-centric model; supersedes the v1 two-passenger limit) ──

/** From the vehicle's registration (RC) record. */
export interface VehicleCapacity {
  rcSeatingCapacity: number;
  driverSeats: number;
  luggageReservedSeats: number;
  rcVerified: boolean;
}

/** Live seat usage, counted in seats (one booking may hold several). */
export interface VehicleOccupancy {
  onboardSeats: number;
  reservedSeats: number;
  activeSeatHolds: number;
}

export interface SeatSnapshot extends VehicleCapacity, VehicleOccupancy {
  /** rcSeatingCapacity − driverSeats − luggageReservedSeats */
  poolingCapacity: number;
  /** poolingCapacity − onboard − reserved − holds (never below 0) */
  availableSeats: number;
}

export interface VehicleOption {
  vehicleId: string;
  driverLabel: string;
  vehicleModel: string;
  vehicleType: string;
  plate: string;
  rating: number;
  status: VehicleStatus;
  /** Result grouping: already moving, waiting/forming, or empty. */
  category: RideCategory;
  womenOnlyEligible: boolean;
  seats: SeatSnapshot;
  pickupEtaMinutes: number;
  estimatedFare: number;
  /** Ceiling for a pooled fare (the solo price). */
  maximumFare?: number;
  /** Additional journey time/distance from joining this vehicle's route. */
  extraDelayMinutes?: number;
  extraDistanceKm?: number;
  demo: true;
}

/** Why a vehicle cannot serve the current request. */
export type IneligibilityReason =
  | 'INSUFFICIENT_SEATS'
  | 'RC_UNVERIFIED'
  | 'POOLING_CLOSED'
  | 'VEHICLE_OCCUPIED'
  | 'NOT_WOMEN_ONLY_ELIGIBLE'
  | 'NO_WOMEN_ONLY_COVERAGE'
  | 'DRIVER_OFFLINE';

export interface IneligibleVehicle {
  vehicle: VehicleOption;
  reasons: IneligibilityReason[];
}

export interface VehicleDiscoveryResult {
  /** Vehicles with enough available seats that satisfy every requirement. */
  eligible: VehicleOption[];
  /** Fleet vehicles that cannot serve this request, with reasons. */
  excluded: IneligibleVehicle[];
  /** Convenience count of `excluded`. */
  excludedCount: number;
}

// ── Dynamic pool joining ────────────────────────────────────────────────────

/**
 * Offer lifecycle. The driver is the sole approver:
 * `OFFER_CREATED` → `OFFER_DISPLAYED` → `DRIVER_PENDING` → `DRIVER_ACCEPTED`
 * → `ROUTE_UPDATED`, with `DRIVER_DECLINED` and `OFFER_EXPIRED` as the other
 * outcomes.
 *
 * Passengers already on the trip opted into pooling when they booked, so they
 * are never asked to approve a joiner — they are informed after acceptance.
 */
export type PoolOfferStage =
  | 'OFFER_CREATED'
  | 'OFFER_DISPLAYED'
  | 'DRIVER_PENDING'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_DECLINED'
  | 'OFFER_EXPIRED'
  | 'ROUTE_UPDATED';

export interface PoolOfferEvent {
  stage: PoolOfferStage;
  at: string;
  note?: string;
}

/** A simulated request from another passenger to join an in-progress trip. */
export interface PoolJoinOffer {
  id: string;
  bookingId: string;
  stage: PoolOfferStage;
  createdAt: string;
  expiresAt: string;
  /** Seats the joining passenger needs (a booking may be for several). */
  requestedSeats: number;
  pickupLabel: string;
  dropLabel: string;
  availableSeatsBefore: number;
  availableSeatsAfter: number;
  extraDistanceKm: number;
  extraDurationMinutes: number;
  /** Delay added for passengers already onboard. */
  existingRiderDelayMinutes: number;
  revisedEtaMinutes: number;
  /** The host rider's fare before and after sharing. */
  originalFare: number;
  revisedFare: number;
  driverExtraEarnings: number;
  /** Whether the joining passenger meets the Women-Only requirement. */
  joiningPassengerWomenOnlyEligible: boolean;
  demo: true;
}

export type PoolOfferRejectionCode =
  | 'TRIP_NOT_ACTIVE'
  | 'POOL_NOT_ENABLED'
  | 'OFFER_ALREADY_ACTIVE'
  | 'INSUFFICIENT_SEATS'
  | 'WOMEN_ONLY_INELIGIBLE'
  | 'DRIVER_OFFLINE';

/** A rejected join request never alters the host trip. */
export type PoolOfferOutcome =
  | { ok: true; booking: Booking }
  | { ok: false; code: PoolOfferRejectionCode; message: string };

/** Deterministic demo variants used by the trip's demo controls. */
export type PoolOfferScenario = 'COMPATIBLE' | 'LARGE_GROUP' | 'WOMEN_ONLY_INELIGIBLE';

// ── Active trips ────────────────────────────────────────────────────────────

export type TripPhase = 'DRIVER_EN_ROUTE' | 'ARRIVED' | 'ONBOARD' | 'COMPLETED';
export type TripPoolStatus = 'SOLO' | 'POOL_OPEN' | 'POOL_JOINED' | 'POOL_CLOSED';

export interface TripStop {
  id: string;
  kind: 'PICKUP' | 'DROP';
  label: string;
  /** Who the stop is for — never a real person's name. */
  passenger: string;
  seats: number;
  etaMinutes: number;
  status: 'PENDING' | 'DONE';
}

export interface TripState {
  phase: TripPhase;
  /** Live seat state of the assigned vehicle, including this booking. */
  seats: SeatSnapshot;
  /** Ordered remaining stops. */
  stops: TripStop[];
  etaMinutes: number;
  fare: number;
  poolStatus: TripPoolStatus;
  /** Co-rider seats added through an accepted pool offer. */
  joinedSeats: number;
  /**
   * Trip-level Women-Only restriction, distinct from a vehicle merely being
   * Women-Only eligible: a restricted trip must reject ineligible joiners.
   */
  womenOnlyRestricted: boolean;
  offer?: PoolJoinOffer;
  offerLog: PoolOfferEvent[];
}

/** Largest passenger group the demo fleet can serve, per ride preference. */
export type SeatLimits = Record<PoolPreference, number>;

export interface DriverAssignment {
  driverId: string;
  vehicleId?: string;
  /** Seat state of the assigned vehicle at assignment time (includes this booking when instant). */
  seats?: SeatSnapshot;
  driverLabel: string;
  vehicleModel: string;
  vehicleType: string;
  plate: string;
  rating: number;
  pickupEtaMinutes: number;
  womenOnlyEligible: boolean;
  demo: true;
}

export interface Booking {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  status: BookingStatus;
  input: RideSearchInput;
  estimate: FareEstimate;
  driver?: DriverAssignment;
  /** Vehicle the rider chose during discovery, if any. */
  requestedVehicleId?: string;
  /** Present once a driver is assigned; drives the active-trip screen. */
  trip?: TripState;
  noMatchReason?: string;
  demo: true;
}

// ── Driver ──────────────────────────────────────────────────────────────────

export type DriverAvailability = 'ONLINE' | 'OFFLINE';

/** The one vehicle a driver is associated with, with live seat state. */
export interface DriverVehicle {
  vehicleId: string;
  vehicleModel: string;
  vehicleType: string;
  plate: string;
  status: VehicleStatus;
  /** The vehicle may serve ordinary trips; see TripState.womenOnlyRestricted. */
  womenOnlyEligible: boolean;
  seats: SeatSnapshot;
}

export interface DriverProfile {
  driverId: string;
  driverLabel: string;
  rating: number;
  availability: DriverAvailability;
  vehicle: DriverVehicle;
  demo: true;
}

/** Illustrative day figures derived from demo bookings — never real earnings. */
export interface DriverDaySummary {
  earnings: number;
  completedTrips: number;
  distanceKm: number;
  poolingTrips: number;
  rating: number;
  demo: true;
}

/** A pending join request, scoped to the driver responsible for the vehicle. */
export interface DriverOfferView {
  offer: PoolJoinOffer;
  /** The host trip the joiner would be inserted into. */
  booking: Booking;
  driverId: string;
  vehicleId: string;
}

// ── Safety (demo only) ──────────────────────────────────────────────────────

export type SafetyReportCategory = 'PASSENGER' | 'VEHICLE' | 'ROUTE' | 'SAFETY' | 'OTHER';

export interface SafetyReport {
  id: string;
  category: SafetyReportCategory;
  message: string;
  role: UserRole;
  bookingId?: string;
  createdAt: string;
  demo: true;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  /** Masked sample number; no call or message is ever placed. */
  phoneMasked: string;
  demo: true;
}

/**
 * Who a notification is for. A joining passenger's messages belong to their
 * own feed, so they never appear in the host passenger's notifications.
 * Absent means `EXISTING_PASSENGER`.
 */
export type NotificationAudience = 'EXISTING_PASSENGER' | 'JOINING_PASSENGER';

export interface RiderNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  bookingId?: string;
  audience?: NotificationAudience;
  demo: true;
}
