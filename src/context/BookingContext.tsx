import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { defaultDraft, SELECTION_INVALIDATING_FIELDS, type BookingDraft } from '@/lib/booking';
import { storage } from '@/lib/storage';
import { rideService } from '@/services';
import type { DemoTripVariant, OfferDecision } from '@/services/ride/RideService';
import type {
  Booking,
  PoolOfferOutcome,
  PoolOfferScenario,
  RideSearchInput,
  RiderNotification,
  SeatLimits,
  VehicleOption,
} from '@/types/domain';
import { useNotify } from './NotificationContext';

const DRAFT_KEY = 'poolmate.booking-draft.v1';
const ACTIVE_KEY = 'poolmate.active-booking.v1';

interface BookingContextValue {
  draft: BookingDraft;
  updateDraft: (patch: Partial<BookingDraft>) => void;
  resetDraft: () => void;

  /** Passenger limits derived from the fleet; null while loading. */
  seatLimits: SeatLimits | null;

  /**
   * Vehicle the rider picked in discovery. Held in memory for its details;
   * `draft.selectedVehicleId` persists the intent across reloads.
   */
  selectedVehicle: VehicleOption | null;
  selectVehicle: (vehicle: VehicleOption | null) => void;

  bookings: Booking[];
  loading: boolean;
  loadError: string | null;
  reload: () => void;
  /**
   * Re-reads bookings without a loading flash. Each read reconciles offer
   * expiry in the service, so this is how the UI picks up a lapsed offer.
   */
  syncBookings: () => Promise<void>;
  getBooking: (id: string) => Booking | undefined;

  /** Booking currently shown in the booking flow (searching → confirmation). */
  activeBookingId: string | null;
  setActiveBookingId: (id: string | null) => void;

  requestRide: (input: RideSearchInput, requestedVehicleId?: string) => Promise<Booking>;
  cancelBooking: (id: string) => Promise<Booking>;

  // Active trip
  arriveAtPickup: (id: string) => Promise<Booking>;
  boardTrip: (id: string) => Promise<Booking>;
  completeStop: (id: string, stopId: string) => Promise<Booking>;
  completeTrip: (id: string) => Promise<Booking>;

  // Pool join offers
  simulatePoolOffer: (bookingId: string, scenario: PoolOfferScenario) => Promise<PoolOfferOutcome>;
  /** Marks an offer as shown to the driver (→ DRIVER_PENDING). */
  markOfferDisplayed: (offerId: string) => Promise<void>;
  /**
   * The driver's decision — the only approval in the pooling workflow.
   * `actingDriverId` authorises the caller against the vehicle's driver.
   */
  driverRespondToOffer: (offerId: string, decision: OfferDecision, actingDriverId?: string) => Promise<Booking>;
  expireOffer: (offerId: string) => Promise<Booking>;

  // Demo utilities
  seedDemoTrip: (variant: DemoTripVariant) => Promise<Booking>;
  resetDemoData: () => Promise<void>;

  notifications: RiderNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
}

const BookingContext = createContext<BookingContextValue | null>(null);

/**
 * Single source of truth for rider booking state. All changes go through
 * `rideService`; the UI only updates after the (mock) service responds.
 */
export function BookingProvider({ children }: { children: ReactNode }) {
  const { notify } = useNotify();
  const [draft, setDraft] = useState<BookingDraft>(() => ({ ...defaultDraft, ...storage.get<BookingDraft>(DRAFT_KEY) }));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<RiderNotification[]>([]);
  const [activeBookingId, setActiveId] = useState<string | null>(() => storage.get<string>(ACTIVE_KEY));
  const [seatLimits, setSeatLimits] = useState<SeatLimits | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);
  const resolving = useRef(new Set<string>());

  useEffect(() => {
    rideService.getSeatLimits().then(setSeatLimits).catch(() => undefined);
  }, []);

  useEffect(() => storage.set(DRAFT_KEY, draft), [draft]);

  const setActiveBookingId = useCallback((id: string | null) => {
    setActiveId(id);
    if (id) storage.set(ACTIVE_KEY, id);
    else storage.remove(ACTIVE_KEY);
  }, []);

  const upsert = useCallback((booking: Booking) => {
    setBookings((all) => {
      const exists = all.some((b) => b.id === booking.id);
      return exists ? all.map((b) => (b.id === booking.id ? booking : b)) : [booking, ...all];
    });
  }, []);

  const refreshNotifications = useCallback(() => {
    rideService.listNotifications().then(setNotifications).catch(() => undefined);
  }, []);

  const syncBookings = useCallback(async () => {
    try {
      setBookings(await rideService.listBookings());
      refreshNotifications();
    } catch {
      // Quiet: this is a background refresh, and `reload` surfaces real errors.
    }
  }, [refreshNotifications]);

  // Expiry is owned by the service, so simply returning to the tab is enough
  // to see a request that lapsed while the app was in the background.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncBookings();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [syncBookings]);

  /** Runs the simulated search for a SEARCHING booking exactly once. */
  const resolve = useCallback(
    (id: string) => {
      if (resolving.current.has(id)) return;
      resolving.current.add(id);
      rideService
        .resolveBooking(id)
        .then((result) => {
          upsert(result);
          refreshNotifications();
          if (result.status === 'DRIVER_ASSIGNED') notify({ title: 'Driver assigned (demo)', tone: 'success' });
          if (result.status === 'SCHEDULED') notify({ title: 'Scheduled ride confirmed (demo)', tone: 'success' });
        })
        .catch(() => notify({ title: 'Search interrupted', description: 'Please try booking again.', tone: 'error' }))
        .finally(() => resolving.current.delete(id));
    },
    [upsert, refreshNotifications, notify],
  );

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    rideService
      .listBookings()
      .then((list) => {
        setBookings(list);
        // Resume searches interrupted by a page reload.
        list.filter((b) => b.status === 'SEARCHING').forEach((b) => resolve(b.id));
      })
      .catch(() => setLoadError('Could not load your trips.'))
      .finally(() => setLoading(false));
    refreshNotifications();
  }, [resolve, refreshNotifications]);

  useEffect(reload, [reload]);

  const requestRide = useCallback(
    async (input: RideSearchInput, requestedVehicleId?: string) => {
      const booking = await rideService.createBooking(input, requestedVehicleId);
      upsert(booking);
      resolve(booking.id);
      return booking;
    },
    [upsert, resolve],
  );

  const cancelBooking = useCallback(
    async (id: string) => {
      const booking = await rideService.cancelBooking(id);
      upsert(booking);
      refreshNotifications();
      return booking;
    },
    [upsert, refreshNotifications],
  );

  const markAllRead = useCallback(async () => {
    setNotifications(await rideService.markNotificationsRead());
  }, []);

  /** Applies a service call that returns the updated booking. */
  const apply = useCallback(
    async (call: Promise<Booking>) => {
      const booking = await call;
      upsert(booking);
      refreshNotifications();
      return booking;
    },
    [upsert, refreshNotifications],
  );

  const simulatePoolOffer = useCallback(
    async (bookingId: string, scenario: PoolOfferScenario) => {
      const outcome = await rideService.simulatePoolOffer(bookingId, scenario);
      if (outcome.ok) upsert(outcome.booking);
      refreshNotifications();
      return outcome;
    },
    [upsert, refreshNotifications],
  );

  const markOfferDisplayed = useCallback(
    async (offerId: string) => {
      // Lifecycle bookkeeping only — failures must not disturb the trip screen.
      await rideService
        .markOfferDisplayed(offerId)
        .then(upsert)
        .catch(() => undefined);
    },
    [upsert],
  );

  const resetDemoData = useCallback(async () => {
    await rideService.resetDemoData();
    setSelectedVehicle(null);
    setDraft(defaultDraft);
    setActiveBookingId(null);
    reload();
  }, [reload, setActiveBookingId]);

  const selectVehicle = useCallback((vehicle: VehicleOption | null) => {
    setSelectedVehicle(vehicle);
    setDraft((d) => ({ ...d, selectedVehicleId: vehicle?.vehicleId ?? null }));
  }, []);

  const updateDraft = useCallback((patch: Partial<BookingDraft>) => {
    // Changing the request invalidates any vehicle chosen for the old one.
    const invalidates = SELECTION_INVALIDATING_FIELDS.some((field) => field in patch);
    if (invalidates) setSelectedVehicle(null);
    setDraft((d) => ({ ...d, ...patch, ...(invalidates ? { selectedVehicleId: null } : {}) }));
  }, []);

  const value = useMemo<BookingContextValue>(
    () => ({
      draft,
      updateDraft,
      resetDraft: () => {
        setDraft(defaultDraft);
        setSelectedVehicle(null);
      },
      seatLimits,
      selectedVehicle,
      selectVehicle,
      bookings,
      loading,
      loadError,
      reload,
      syncBookings,
      getBooking: (id) => bookings.find((b) => b.id === id),
      activeBookingId,
      setActiveBookingId,
      requestRide,
      cancelBooking,
      arriveAtPickup: (id) => apply(rideService.arriveAtPickup(id)),
      boardTrip: (id) => apply(rideService.boardTrip(id)),
      completeStop: (id, stopId) => apply(rideService.completeStop(id, stopId)),
      completeTrip: (id) => apply(rideService.completeTrip(id)),
      simulatePoolOffer,
      markOfferDisplayed,
      driverRespondToOffer: (offerId, decision, actingDriverId) =>
        apply(rideService.driverRespondToPoolOffer(offerId, decision, actingDriverId)),
      expireOffer: (offerId) => apply(rideService.expirePoolOffer(offerId)),
      seedDemoTrip: (variant) => apply(rideService.seedDemoActiveTrip(variant)),
      resetDemoData,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markAllRead,
    }),
    [
      draft,
      updateDraft,
      seatLimits,
      selectedVehicle,
      selectVehicle,
      bookings,
      loading,
      loadError,
      reload,
      syncBookings,
      activeBookingId,
      setActiveBookingId,
      requestRide,
      cancelBooking,
      apply,
      simulatePoolOffer,
      markOfferDisplayed,
      resetDemoData,
      notifications,
      markAllRead,
    ],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
