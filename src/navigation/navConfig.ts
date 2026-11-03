import { Car, History, House, LayoutGrid, Search, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import { paths } from '@/routes/paths';
import type { UserRole } from '@/types/domain';

export interface NavItem {
  label: string;
  /** Shorter label for the mobile tab bar, if different. */
  shortLabel?: string;
  to: string;
  icon: LucideIcon;
  /** Match the path exactly (used for role home routes). */
  end?: boolean;
}

/** Rider and driver navigation are kept separate so driver tools never mix into rider booking. */
export const navByRole: Record<UserRole, NavItem[]> = {
  RIDER: [
    { label: 'Home', to: paths.rider.home, icon: House, end: true },
    { label: 'Book a ride', shortLabel: 'Book', to: paths.rider.book, icon: Search },
    { label: 'Trips', to: paths.rider.trips, icon: History },
    { label: 'Safety', to: paths.rider.safety, icon: ShieldCheck },
    { label: 'Profile', to: paths.rider.profile, icon: UserRound },
  ],
  DRIVER: [
    { label: 'Dashboard', shortLabel: 'Drive', to: paths.driver.home, icon: LayoutGrid, end: true },
    { label: 'Trips', to: paths.driver.trips, icon: History },
    { label: 'Vehicle', to: paths.driver.vehicle, icon: Car },
    { label: 'Safety', to: paths.driver.safety, icon: ShieldCheck },
    { label: 'Profile', to: paths.driver.profile, icon: UserRound },
  ],
};

export const roleLabels: Record<UserRole, string> = {
  RIDER: 'Rider',
  DRIVER: 'Driver',
};
