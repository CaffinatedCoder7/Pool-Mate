import type {
  IneligibilityReason,
  RideCategory,
  RideSearchInput,
  SeatSnapshot,
  VehicleCapacity,
  VehicleOccupancy,
  VehicleStatus,
} from '@/types/domain';

/**
 * Vehicle-centric seat rules. Pure functions — the future backend enforces the
 * real rules; these only drive the demo simulation and UI.
 *
 * Seats, never bookings, are the unit: a booking for 3 passengers consumes 3
 * seats, and a seat hold is counted once (never alongside a reservation).
 */

export function poolingCapacity(c: VehicleCapacity): number {
  return Math.max(0, c.rcSeatingCapacity - c.driverSeats - c.luggageReservedSeats);
}

/**
 * Seat snapshot for a vehicle. `exclusive` marks a vehicle currently booked as
 * a solo ride: nobody else may join, so no seats are available.
 */
export function seatSnapshot(capacity: VehicleCapacity, occupancy: VehicleOccupancy, exclusive = false): SeatSnapshot {
  const pooling = poolingCapacity(capacity);
  const used = occupancy.onboardSeats + occupancy.reservedSeats + occupancy.activeSeatHolds;
  return {
    ...capacity,
    ...occupancy,
    poolingCapacity: pooling,
    availableSeats: exclusive ? 0 : Math.max(0, pooling - used),
  };
}

/** Re-derives a snapshot after changing occupancy, keeping capacity fixed. */
export function withOccupancy(snapshot: SeatSnapshot, patch: Partial<VehicleOccupancy>, exclusive = false): SeatSnapshot {
  return seatSnapshot(
    snapshot,
    {
      onboardSeats: Math.max(0, patch.onboardSeats ?? snapshot.onboardSeats),
      reservedSeats: Math.max(0, patch.reservedSeats ?? snapshot.reservedSeats),
      activeSeatHolds: Math.max(0, patch.activeSeatHolds ?? snapshot.activeSeatHolds),
    },
    exclusive,
  );
}

/** Snapshot after reserving `seats` for a new booking (clamped to capacity). */
export function reserveSeats(snapshot: SeatSnapshot, seats: number, solo: boolean): SeatSnapshot {
  const reserved = Math.min(seats, snapshot.availableSeats);
  return {
    ...snapshot,
    reservedSeats: snapshot.reservedSeats + reserved,
    availableSeats: solo ? 0 : snapshot.availableSeats - reserved,
  };
}

/** Places a temporary hold while a join offer is open. */
export function holdSeats(snapshot: SeatSnapshot, seats: number): SeatSnapshot {
  const held = Math.min(seats, snapshot.availableSeats);
  return withOccupancy(snapshot, { activeSeatHolds: snapshot.activeSeatHolds + held });
}

/** Releases a hold on decline or expiry, restoring available capacity. */
export function releaseHold(snapshot: SeatSnapshot, seats: number): SeatSnapshot {
  return withOccupancy(snapshot, { activeSeatHolds: snapshot.activeSeatHolds - Math.min(seats, snapshot.activeSeatHolds) });
}

/** Converts a hold into a reservation — the hold is removed, not duplicated. */
export function convertHoldToReserved(snapshot: SeatSnapshot, seats: number): SeatSnapshot {
  const held = Math.min(seats, snapshot.activeSeatHolds);
  return withOccupancy(snapshot, {
    activeSeatHolds: snapshot.activeSeatHolds - held,
    reservedSeats: snapshot.reservedSeats + held,
  });
}

export const occupiedSeats = (s: SeatSnapshot) => s.onboardSeats + s.reservedSeats + s.activeSeatHolds;

/** Result grouping, derived from seats actually in use. */
export function categorizeVehicle(seats: SeatSnapshot): RideCategory {
  if (seats.onboardSeats > 0) return 'MOVING_POOL';
  if (seats.reservedSeats + seats.activeSeatHolds > 0) return 'WAITING_POOL';
  return 'EMPTY_VEHICLE';
}

type EligibilityInput = Pick<RideSearchInput, 'seats' | 'poolPreference' | 'womenOnly'>;
type EligibilityVehicle = { womenOnlyEligible: boolean; seats: SeatSnapshot; status?: VehicleStatus };

/**
 * Hard requirements for a request, in one place:
 * - Women-Only requires a Women-Only eligible vehicle.
 * - Pool-enabled requires a verified RC, an open pool, and enough AVAILABLE
 *   seats for the whole group.
 * - Solo takes the whole vehicle: it must be unoccupied and fit the group.
 *   Demo policy allows RC-pending vehicles for solo, never for pooling.
 */
export function vehicleIneligibilityReasons(vehicle: EligibilityVehicle, input: EligibilityInput): IneligibilityReason[] {
  const reasons: IneligibilityReason[] = [];
  const s = vehicle.seats;

  if (input.womenOnly && !vehicle.womenOnlyEligible) reasons.push('NOT_WOMEN_ONLY_ELIGIBLE');

  if (input.poolPreference === 'POOL_ENABLED') {
    if (!s.rcVerified) reasons.push('RC_UNVERIFIED');
    if (vehicle.status === 'POOLING_CLOSED') reasons.push('POOLING_CLOSED');
  } else if (occupiedSeats(s) > 0) {
    reasons.push('VEHICLE_OCCUPIED');
  }

  if (s.availableSeats < input.seats) reasons.push('INSUFFICIENT_SEATS');

  return reasons;
}

export function isVehicleEligible(vehicle: EligibilityVehicle, input: EligibilityInput): boolean {
  return vehicleIneligibilityReasons(vehicle, input).length === 0;
}

export const ineligibilityLabels: Record<IneligibilityReason, string> = {
  INSUFFICIENT_SEATS: 'Not enough available seats',
  RC_UNVERIFIED: 'RC not verified — cannot pool',
  POOLING_CLOSED: 'Pooling closed for this route',
  VEHICLE_OCCUPIED: 'Already carrying passengers — not available for solo',
  NOT_WOMEN_ONLY_ELIGIBLE: 'Not Women-Only eligible',
  NO_WOMEN_ONLY_COVERAGE: 'No Women-Only demo vehicle serves this pickup',
  DRIVER_OFFLINE: 'Driver is offline',
};
