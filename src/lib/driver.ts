import { isOfferOpen } from '@/lib/pooling';
import type { Booking, DriverOfferView } from '@/types/domain';

/**
 * Driver scoping rules, in one place so the service and the UI cannot drift.
 * A driver only ever sees bookings and join requests for the vehicle they are
 * associated with.
 */

/** Bookings assigned to this driver, newest first. */
export function bookingsForDriver(bookings: Booking[], driverId: string): Booking[] {
  return bookings.filter((b) => b.driver?.driverId === driverId);
}

/** The driver's trip that is currently assigned or under way, if any. */
export function activeBookingForDriver(bookings: Booking[], driverId: string): Booking | undefined {
  return bookingsForDriver(bookings, driverId).find((b) => b.status === 'DRIVER_ASSIGNED' && b.trip);
}

/**
 * Join requests still awaiting this driver's decision. Expired requests are
 * excluded because the service reconciles their stage on every read.
 */
export function offersForDriver(bookings: Booking[], driverId: string): DriverOfferView[] {
  return bookingsForDriver(bookings, driverId)
    .filter((b) => b.status === 'DRIVER_ASSIGNED' && b.trip?.offer && isOfferOpen(b.trip.offer.stage))
    .map((b) => ({
      offer: b.trip!.offer!,
      booking: b,
      driverId,
      vehicleId: b.driver!.vehicleId ?? '',
    }));
}

/** Whether a driver is the one responsible for a booking's vehicle. */
export function driverOwnsBooking(booking: Booking, driverId: string): boolean {
  return booking.driver?.driverId === driverId;
}
