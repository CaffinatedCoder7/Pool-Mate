import type { VehicleCapacity, VehicleOccupancy, VehicleStatus } from '@/types/domain';

export interface DemoVehicleFixture {
  vehicleId: string;
  driverId: string;
  driverLabel: string;
  vehicleModel: string;
  vehicleType: string;
  plate: string;
  rating: number;
  womenOnlyEligible: boolean;
  status: VehicleStatus;
  capacity: VehicleCapacity;
  /** Baseline seats used by other (sample) riders. Bookings made in the demo add to this. */
  occupancy: VehicleOccupancy;
}

/**
 * Fixed, clearly-labelled sample fleet so results are repeatable.
 * Pooling capacity = RC seats − driver seat − luggage-reserved seats.
 * Category is derived from seats in use (see lib/capacity.ts):
 * onboard > 0 → moving pool; reserved/held > 0 → waiting pool; else empty.
 *
 *   A Dzire    RC 5 −1 −0 = 4 pooling, 1 onboard + 1 reserved → 2 avail · moving
 *   B i20      RC 5 −1 −1 = 3 pooling, empty                  → 3 avail · empty  (Women-Only)
 *   C Innova   RC 7 −1 −0 = 6 pooling, 1 onboard              → 5 avail · moving (fits a group of 4)
 *   D Amaze    RC 5 −1 −0 = 4 pooling, 1 seat held            → 3 avail · waiting (Women-Only)
 *   E Nexon    RC 5 −1 −0 = 4 pooling, RC NOT verified        → solo only · empty
 *   F Ertiga   RC 7 −1 −1 = 5 pooling, empty                  → 5 avail · empty  (Women-Only)
 *   G Ciaz     RC 5 −1 −0 = 4 pooling, 2 reserved             → 2 avail · waiting
 *   H Marazzo  RC 7 −1 −1 = 5 pooling, 5 onboard, closed      → 0 avail · full, never eligible
 */
export const demoFleet: DemoVehicleFixture[] = [
  {
    vehicleId: 'veh-a', driverId: 'drv-01', driverLabel: 'Demo driver · Arjun', vehicleModel: 'Maruti Suzuki Dzire', vehicleType: 'Sedan', plate: 'RJ14 DM 0101', rating: 4.8,
    womenOnlyEligible: false, status: 'ACTIVE_POOLING',
    capacity: { rcSeatingCapacity: 5, driverSeats: 1, luggageReservedSeats: 0, rcVerified: true },
    occupancy: { onboardSeats: 1, reservedSeats: 1, activeSeatHolds: 0 },
  },
  {
    vehicleId: 'veh-b', driverId: 'drv-02', driverLabel: 'Demo driver · Meera', vehicleModel: 'Hyundai i20', vehicleType: 'Hatchback', plate: 'RJ14 DM 0102', rating: 4.9,
    womenOnlyEligible: true, status: 'IDLE',
    capacity: { rcSeatingCapacity: 5, driverSeats: 1, luggageReservedSeats: 1, rcVerified: true },
    occupancy: { onboardSeats: 0, reservedSeats: 0, activeSeatHolds: 0 },
  },
  {
    vehicleId: 'veh-c', driverId: 'drv-03', driverLabel: 'Demo driver · Rohit', vehicleModel: 'Toyota Innova Crysta', vehicleType: 'MPV', plate: 'RJ14 DM 0103', rating: 4.7,
    womenOnlyEligible: false, status: 'ACTIVE_POOLING',
    capacity: { rcSeatingCapacity: 7, driverSeats: 1, luggageReservedSeats: 0, rcVerified: true },
    occupancy: { onboardSeats: 1, reservedSeats: 0, activeSeatHolds: 0 },
  },
  {
    vehicleId: 'veh-d', driverId: 'drv-04', driverLabel: 'Demo driver · Kavya', vehicleModel: 'Honda Amaze', vehicleType: 'Sedan', plate: 'RJ14 DM 0104', rating: 4.9,
    womenOnlyEligible: true, status: 'EN_ROUTE',
    capacity: { rcSeatingCapacity: 5, driverSeats: 1, luggageReservedSeats: 0, rcVerified: true },
    occupancy: { onboardSeats: 0, reservedSeats: 0, activeSeatHolds: 1 },
  },
  {
    vehicleId: 'veh-e', driverId: 'drv-05', driverLabel: 'Demo driver · Imran', vehicleModel: 'Tata Nexon', vehicleType: 'Compact SUV', plate: 'RJ14 DM 0105', rating: 4.6,
    womenOnlyEligible: false, status: 'IDLE',
    capacity: { rcSeatingCapacity: 5, driverSeats: 1, luggageReservedSeats: 0, rcVerified: false },
    occupancy: { onboardSeats: 0, reservedSeats: 0, activeSeatHolds: 0 },
  },
  {
    vehicleId: 'veh-f', driverId: 'drv-06', driverLabel: 'Demo driver · Sunita', vehicleModel: 'Maruti Suzuki Ertiga', vehicleType: 'MPV', plate: 'RJ14 DM 0106', rating: 4.8,
    womenOnlyEligible: true, status: 'IDLE',
    capacity: { rcSeatingCapacity: 7, driverSeats: 1, luggageReservedSeats: 1, rcVerified: true },
    occupancy: { onboardSeats: 0, reservedSeats: 0, activeSeatHolds: 0 },
  },
  {
    vehicleId: 'veh-g', driverId: 'drv-07', driverLabel: 'Demo driver · Vikram', vehicleModel: 'Maruti Suzuki Ciaz', vehicleType: 'Sedan', plate: 'RJ14 DM 0107', rating: 4.5,
    womenOnlyEligible: false, status: 'IDLE',
    capacity: { rcSeatingCapacity: 5, driverSeats: 1, luggageReservedSeats: 0, rcVerified: true },
    occupancy: { onboardSeats: 0, reservedSeats: 2, activeSeatHolds: 0 },
  },
  {
    vehicleId: 'veh-h', driverId: 'drv-08', driverLabel: 'Demo driver · Pooja', vehicleModel: 'Mahindra Marazzo', vehicleType: 'MPV', plate: 'RJ14 DM 0108', rating: 4.7,
    womenOnlyEligible: true, status: 'POOLING_CLOSED',
    capacity: { rcSeatingCapacity: 7, driverSeats: 1, luggageReservedSeats: 1, rcVerified: true },
    occupancy: { onboardSeats: 5, reservedSeats: 0, activeSeatHolds: 0 },
  },
];
