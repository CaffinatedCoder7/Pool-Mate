import { haversineKm } from '@/lib/geo';
import type { FareEstimate, RideCategory, RideSearchInput } from '@/types/domain';

/**
 * Illustrative demo pricing — NOT a real fare model. Deterministic so
 * screenshots and tests are repeatable. The backend will own real pricing.
 */
const ROAD_FACTOR = 1.35; // straight line → approximate road distance
const BASE_FARE = 40;
const PER_KM = 13;
const AVG_SPEED_KMH = 22;
const PICKUP_BUFFER_MIN = 4;
/** Max extra time if a compatible co-rider joins a pool-enabled ride. */
export const POOL_MAX_DETOUR_MIN = 8;

export function estimateJourney(input: RideSearchInput): FareEstimate {
  const distanceKm = Math.max(1, Math.round(haversineKm(input.pickup, input.destination) * ROAD_FACTOR * 10) / 10);
  const soloFare = Math.round(BASE_FARE + PER_KM * distanceKm);
  const durationMinutes = Math.round((distanceKm / AVG_SPEED_KMH) * 60) + PICKUP_BUFFER_MIN;

  if (input.poolPreference === 'SOLO') {
    return { currency: 'INR', estimatedFare: soloFare, distanceKm, durationMinutes, isEstimate: true };
  }

  // Pool: discounted estimate, never above the solo fare (shown as the maximum).
  const pooled = Math.min(soloFare, Math.round(soloFare * (0.68 + 0.22 * (input.seats - 1))));
  return {
    currency: 'INR',
    estimatedFare: pooled,
    maximumFare: soloFare,
    distanceKm,
    durationMinutes,
    maxDurationMinutes: durationMinutes + POOL_MAX_DETOUR_MIN,
    isEstimate: true,
  };
}

export interface VehicleQuote {
  estimatedFare: number;
  maximumFare?: number;
  extraDelayMinutes?: number;
  extraDistanceKm?: number;
}

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Per-vehicle demo quote. Joining a vehicle that is already moving or waiting
 * adds a little distance and time; a pooled fare is capped at the solo price.
 */
export function vehicleQuote(input: RideSearchInput, vehicleId: string, category: RideCategory): VehicleQuote {
  const solo = estimateJourney({ ...input, poolPreference: 'SOLO' });
  if (input.poolPreference === 'SOLO') return { estimatedFare: solo.estimatedFare };

  const base = estimateJourney(input);
  const h = hash(vehicleId + (input.pickupId ?? '') + (input.destinationId ?? ''));

  if (category === 'EMPTY_VEHICLE') {
    // Starts empty: no detour yet, but it may pool later.
    return { estimatedFare: base.estimatedFare, maximumFare: solo.estimatedFare };
  }

  const movingDiscount = category === 'MOVING_POOL' ? 0.92 : 0.96;
  return {
    estimatedFare: Math.min(solo.estimatedFare, Math.round(base.estimatedFare * movingDiscount)),
    maximumFare: solo.estimatedFare,
    extraDelayMinutes: category === 'MOVING_POOL' ? 2 + (h % 4) : 3 + (h % 4),
    extraDistanceKm: Math.round((0.4 + (h % 13) / 10) * 10) / 10,
  };
}
