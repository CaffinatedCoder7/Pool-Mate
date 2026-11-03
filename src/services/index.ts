import type { AuthService } from './auth/AuthService';
import { mockAuthService } from './auth/mockAuthService';
import type { LocationService } from './location/LocationService';
import { mockLocationService } from './location/mockLocationService';
import type { RideService } from './ride/RideService';
import { mockRideService } from './ride/mockRideService';
import type { SafetyService } from './safety/SafetyService';
import { mockSafetyService } from './safety/mockSafetyService';

/**
 * Service registry — the single place where implementations are chosen.
 * Screens import services from here, never from mock files directly, so a
 * FastAPI adapter can be swapped in without touching components. Once real
 * adapters exist, choose between them here using `env.useMockServices`.
 */
export const authService: AuthService = mockAuthService;
export const locationService: LocationService = mockLocationService;
export const rideService: RideService = mockRideService;
export const safetyService: SafetyService = mockSafetyService;

export type { AuthService, LocationService, RideService, SafetyService };
