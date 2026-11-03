import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { activeBookingForDriver, bookingsForDriver, offersForDriver } from '@/lib/driver';
import { rideService } from '@/services';
import { DEFAULT_DRIVER_ID } from '@/services/auth/mockAuthService';
import type { DriverAvailability, DriverDaySummary, DriverProfile } from '@/types/domain';

/**
 * Driver view of the shared data. Bookings and join requests are derived from
 * BookingContext — the same records the rider sees — so a driver decision is
 * reflected on both sides without a second copy of trip state. Only the
 * driver's own profile, availability and day figures are fetched separately.
 */
export function useDriver() {
  const { session } = useAuth();
  const { bookings, loading: bookingsLoading, syncBookings } = useBooking();
  const driverId = session?.user.driverId ?? DEFAULT_DRIVER_ID;

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [summary, setSummary] = useState<DriverDaySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `bookings.length` and the stringified ids keep this in step with shared
  // state, so seat figures refresh after boarding, acceptance or completion.
  const bookingsFingerprint = bookings.map((b) => `${b.id}:${b.status}:${b.trip?.phase ?? ''}:${b.trip?.offer?.stage ?? ''}`).join('|');

  const load = useCallback(() => {
    let cancelled = false;
    setError(null);
    Promise.all([rideService.getDriverProfile(driverId), rideService.getDriverSummary(driverId)])
      .then(([nextProfile, nextSummary]) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setSummary(nextSummary);
      })
      .catch(() => !cancelled && setError('Could not load your driver profile.'));
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  useEffect(load, [load, bookingsFingerprint]);

  const setAvailability = useCallback(
    async (availability: DriverAvailability) => {
      // Availability affects new discovery only; active trips are untouched.
      setProfile(await rideService.setDriverAvailability(driverId, availability));
    },
    [driverId],
  );

  const driverBookings = useMemo(() => bookingsForDriver(bookings, driverId), [bookings, driverId]);
  const activeBooking = useMemo(() => activeBookingForDriver(bookings, driverId), [bookings, driverId]);
  const pendingOffers = useMemo(() => offersForDriver(bookings, driverId), [bookings, driverId]);

  return {
    driverId,
    profile,
    summary,
    error,
    loading: bookingsLoading || !profile,
    driverBookings,
    activeBooking,
    pendingOffers,
    setAvailability,
    refresh: syncBookings,
  };
}
