import type { Booking, BookingMode, BookingStatus, LocationSuggestion, PoolPreference, RideSearchInput, SeatLimits } from '@/types/domain';

/** Editable booking form state, shared by the dashboard and the booking flow. */
export interface BookingDraft {
  pickup: LocationSuggestion | null;
  destination: LocationSuggestion | null;
  seats: number;
  bookingMode: BookingMode;
  poolPreference: PoolPreference;
  womenOnly: boolean;
  /** Local `YYYY-MM-DD` and `HH:MM` (native input values). */
  scheduledDate: string;
  scheduledTime: string;
  /** Vehicle chosen during discovery; cleared whenever the request changes. */
  selectedVehicleId: string | null;
}

export const defaultDraft: BookingDraft = {
  pickup: null,
  destination: null,
  seats: 1,
  bookingMode: 'INSTANT',
  poolPreference: 'SOLO',
  womenOnly: false,
  scheduledDate: '',
  scheduledTime: '',
  selectedVehicleId: null,
};

/**
 * Changing any of these invalidates a chosen vehicle, because eligibility and
 * seat availability are derived from them.
 */
export const SELECTION_INVALIDATING_FIELDS: Array<keyof BookingDraft> = [
  'pickup',
  'destination',
  'seats',
  'poolPreference',
  'womenOnly',
  'bookingMode',
];

// No fixed global passenger limit: the maximum comes from the vehicle fleet
// (RideService.getSeatLimits) and real availability is checked per vehicle.
export const SCHEDULE_MIN_LEAD_MINUTES = 30;
export const SCHEDULE_MAX_DAYS = 7;

export type DraftField = 'pickup' | 'destination' | 'seats' | 'schedule';
export type DraftErrors = Partial<Record<DraftField, string>>;

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function scheduledDateFromDraft(draft: BookingDraft): Date | null {
  if (!draft.scheduledDate || !draft.scheduledTime) return null;
  const date = new Date(`${draft.scheduledDate}T${draft.scheduledTime}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Next sensible slot: one hour from now, rounded up to 15 minutes. */
export function defaultScheduleSlot(now = new Date()): { date: string; time: string } {
  const slot = new Date(now.getTime() + 60 * 60000);
  slot.setMinutes(Math.ceil(slot.getMinutes() / 15) * 15, 0, 0);
  return { date: toDateInput(slot), time: toTimeInput(slot) };
}

/** `limits` is null while the fleet limits are loading; the seat check is then skipped. */
export function validateDraft(draft: BookingDraft, limits: SeatLimits | null, now = new Date()): DraftErrors {
  const errors: DraftErrors = {};

  if (!draft.pickup) errors.pickup = 'Choose a pickup location from the suggestions.';
  if (!draft.destination) errors.destination = 'Choose a destination from the suggestions.';
  else if (draft.pickup && draft.pickup.id === draft.destination.id)
    errors.destination = 'Destination must be different from pickup.';

  if (draft.seats < 1) errors.seats = 'At least one passenger is required.';
  else if (limits && draft.seats > limits[draft.poolPreference]) {
    errors.seats = seatLimitMessage(draft.poolPreference, limits[draft.poolPreference]);
  }

  if (draft.bookingMode === 'SCHEDULED') {
    const when = scheduledDateFromDraft(draft);
    if (!when) errors.schedule = 'Choose a date and time for your scheduled ride.';
    else if (when.getTime() < now.getTime() + SCHEDULE_MIN_LEAD_MINUTES * 60000)
      errors.schedule = `Scheduled rides must be at least ${SCHEDULE_MIN_LEAD_MINUTES} minutes from now.`;
    else if (when.getTime() > now.getTime() + SCHEDULE_MAX_DAYS * 86400000)
      errors.schedule = `Scheduled rides can be booked up to ${SCHEDULE_MAX_DAYS} days ahead.`;
  }

  return errors;
}

export function seatLimitMessage(pref: PoolPreference, max: number): string {
  return pref === 'POOL_ENABLED'
    ? `The largest verified pooling vehicle in the demo fleet has ${max} passenger seats.`
    : `The largest vehicle in the demo fleet has ${max} passenger seats.`;
}

export const hasErrors = (errors: DraftErrors) => Object.keys(errors).length > 0;

/** Null until both locations are chosen. Only call for submission after validation. */
export function draftToSearchInput(draft: BookingDraft): RideSearchInput | null {
  if (!draft.pickup || !draft.destination) return null;
  return {
    pickup: draft.pickup.position,
    pickupLabel: draft.pickup.label,
    pickupId: draft.pickup.id,
    destination: draft.destination.position,
    destinationLabel: draft.destination.label,
    destinationId: draft.destination.id,
    bookingMode: draft.bookingMode,
    poolPreference: draft.poolPreference,
    womenOnly: draft.womenOnly,
    seats: draft.seats,
    scheduledAt: draft.bookingMode === 'SCHEDULED' ? scheduledDateFromDraft(draft)?.toISOString() : undefined,
  };
}

export const ACTIVE_STATUSES: BookingStatus[] = ['SEARCHING', 'DRIVER_ASSIGNED', 'SCHEDULED'];
export const isActive = (b: Booking) => ACTIVE_STATUSES.includes(b.status);
export const isCancellable = isActive;
/** The time a booking is "for": scheduled time, otherwise when it was requested. */
export const bookingTime = (b: Booking) => b.input.scheduledAt ?? b.createdAt;
