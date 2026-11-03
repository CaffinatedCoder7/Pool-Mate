import { nowMs } from '@/lib/clock';
import type { PoolOfferStage } from '@/types/domain';

/**
 * Pool-join offer helpers: lifecycle predicates and the illustrative demo
 * maths for route/fare impact. Deterministic per offer seed so screenshots
 * and walkthroughs repeat exactly. This is NOT route insertion — the backend
 * will own feasibility and pricing.
 */

/** Stages where the joining passenger's seats are held on the vehicle. */
const OPEN_STAGES: PoolOfferStage[] = ['OFFER_CREATED', 'OFFER_DISPLAYED', 'DRIVER_PENDING'];

/** True while the offer is undecided — exactly when a seat hold applies. */
export const isOfferOpen = (stage: PoolOfferStage) => OPEN_STAGES.includes(stage);

/** True once the offer succeeded and the route/seats were applied. */
export const isOfferAccepted = (stage: PoolOfferStage) => stage === 'DRIVER_ACCEPTED' || stage === 'ROUTE_UPDATED';

export const OFFER_TTL_SECONDS = 90;

export const stageLabels: Record<PoolOfferStage, string> = {
  OFFER_CREATED: 'Request created',
  OFFER_DISPLAYED: 'Shown to the driver',
  DRIVER_PENDING: 'Awaiting driver decision',
  DRIVER_ACCEPTED: 'Driver accepted',
  DRIVER_DECLINED: 'Driver declined',
  OFFER_EXPIRED: 'Request expired',
  ROUTE_UPDATED: 'Route updated',
};

/**
 * Lifecycle stages missing before `target`, so the log always reads in order
 * even when the driver decides before the UI has marked the offer displayed.
 */
export function missingStagesBefore(current: PoolOfferStage): PoolOfferStage[] {
  if (current === 'OFFER_CREATED') return ['OFFER_DISPLAYED', 'DRIVER_PENDING'];
  if (current === 'OFFER_DISPLAYED') return ['DRIVER_PENDING'];
  return [];
}

export interface OfferQuote {
  extraDistanceKm: number;
  extraDurationMinutes: number;
  existingRiderDelayMinutes: number;
  revisedEtaMinutes: number;
  revisedFare: number;
  driverExtraEarnings: number;
}

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Illustrative impact of inserting a co-rider into the remaining route.
 * The host rider's fare drops because the trip is shared; the driver earns
 * more from the extra passenger.
 */
export function buildOfferQuote(seed: string, hostFare: number, hostEtaMinutes: number, requestedSeats: number): OfferQuote {
  const h = hash(seed);
  const extraDistanceKm = Math.round((0.8 + (h % 19) / 10) * 10) / 10;
  const extraDurationMinutes = 3 + (h % 5);
  const existingRiderDelayMinutes = Math.min(extraDurationMinutes, 1 + (h % 3));
  const revisedFare = Math.max(40, Math.round(hostFare * (1 - (0.14 + 0.04 * requestedSeats))));
  const joiningFare = Math.round(hostFare * (0.45 + 0.12 * requestedSeats));
  const driverExtraEarnings = Math.max(15, Math.round(joiningFare - (hostFare - revisedFare) * 0.4));

  return {
    extraDistanceKm,
    extraDurationMinutes,
    existingRiderDelayMinutes,
    revisedEtaMinutes: hostEtaMinutes + existingRiderDelayMinutes,
    revisedFare,
    driverExtraEarnings,
  };
}

/** Seconds left before an open offer expires (0 once elapsed). */
export function secondsUntil(expiresAt: string, now = nowMs()): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
}

/**
 * Whether an offer's absolute deadline has passed. The service decides what
 * to do about it; the UI only ever displays remaining time.
 */
export function isPastDeadline(expiresAt: string, at = nowMs()): boolean {
  const deadline = new Date(expiresAt).getTime();
  return Number.isFinite(deadline) && deadline <= at;
}
