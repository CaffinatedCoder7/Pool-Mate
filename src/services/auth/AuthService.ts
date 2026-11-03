import type { Session, UserRole } from '@/types/domain';

/**
 * Authentication boundary. The mock implementation stores a demo session in
 * the browser; a FastAPI adapter will implement the same interface later.
 */
export interface AuthService {
  getSession(): Promise<Session | null>;
  signIn(role: UserRole): Promise<Session>;
  signOut(): Promise<void>;
  setLastRole(role: UserRole): Promise<Session>;
  /**
   * Demo-only: choose which fleet driver this account drives as, so the
   * driver experience can be shown from more than one vehicle.
   */
  setDriverIdentity(driverId: string): Promise<Session>;
}
