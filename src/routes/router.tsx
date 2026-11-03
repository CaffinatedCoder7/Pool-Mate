import { UserRound } from 'lucide-react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SignInPage } from '@/pages/auth/SignInPage';
import { DriverDashboardPage } from '@/pages/driver/DriverDashboardPage';
import { DriverProfilePage } from '@/pages/driver/DriverProfilePage';
import { DriverSafetyPage } from '@/pages/driver/DriverSafetyPage';
import { DriverTripsPage } from '@/pages/driver/DriverTripsPage';
import { DriverVehiclePage } from '@/pages/driver/DriverVehiclePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { BookRidePage } from '@/pages/rider/BookRidePage';
import { DemoCentrePage } from '@/pages/rider/DemoCentrePage';
import { RiderHomePage } from '@/pages/rider/RiderHomePage';
import { RiderSafetyPage } from '@/pages/rider/RiderSafetyPage';
import { RiderTripsPage } from '@/pages/rider/RiderTripsPage';
import { TripDetailPage } from '@/pages/rider/TripDetailPage';
import { HomeRedirect, RedirectIfAuthenticated, RequireAuth } from './guards';
import { paths } from './paths';

export const router = createBrowserRouter(
  [
    {
      element: <RedirectIfAuthenticated />,
      children: [{ path: paths.signIn, element: <SignInPage /> }],
    },
    {
      path: paths.root,
      element: <RequireAuth />,
      children: [
        {
          element: <AppShell />,
          children: [
            { index: true, element: <HomeRedirect /> },

            // ── Rider ───────────────────────────────────────────────
            { path: paths.rider.home, element: <RiderHomePage /> },
            { path: paths.rider.book, element: <BookRidePage /> },
            { path: paths.rider.trips, element: <RiderTripsPage /> },
            { path: paths.rider.tripPattern, element: <TripDetailPage /> },
            { path: paths.rider.demo, element: <DemoCentrePage /> },
            { path: paths.rider.safety, element: <RiderSafetyPage /> },
            {
              path: paths.rider.profile,
              element: (
                <PlaceholderPage
                  eyebrow="Rider"
                  title="Profile"
                  icon={UserRound}
                  description="Demo identity and ride preferences."
                  upcoming="Demo profile, Women-Only eligibility (demo verification) and default ride preferences."
                />
              ),
            },

            // ── Driver ──────────────────────────────────────────────
            { path: paths.driver.home, element: <DriverDashboardPage /> },
            { path: paths.driver.trips, element: <DriverTripsPage /> },
            { path: paths.driver.vehicle, element: <DriverVehiclePage /> },
            { path: paths.driver.safety, element: <DriverSafetyPage /> },
            { path: paths.driver.profile, element: <DriverProfilePage /> },

            // ── Shared ──────────────────────────────────────────────
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);
