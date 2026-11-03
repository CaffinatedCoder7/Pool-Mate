import type { UserRole } from '@/types/domain';

/** Single source of truth for route paths. */
export const paths = {
  root: '/',
  signIn: '/sign-in',

  rider: {
    home: '/rider',
    book: '/rider/book',
    trips: '/rider/trips',
    tripPattern: '/rider/trips/:bookingId',
    trip: (bookingId: string) => `/rider/trips/${bookingId}`,
    history: '/rider/trips?tab=past',
    demo: '/rider/demo',
    safety: '/rider/safety',
    profile: '/rider/profile',
  },

  driver: {
    home: '/driver',
    trips: '/driver/trips',
    vehicle: '/driver/vehicle',
    safety: '/driver/safety',
    profile: '/driver/profile',
  },
} as const;

export const roleHome: Record<UserRole, string> = {
  RIDER: paths.rider.home,
  DRIVER: paths.driver.home,
};

export const roleProfile: Record<UserRole, string> = {
  RIDER: paths.rider.profile,
  DRIVER: paths.driver.profile,
};
