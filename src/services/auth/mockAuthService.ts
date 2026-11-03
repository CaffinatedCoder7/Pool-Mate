import { delay } from '@/lib/delay';
import { storage } from '@/lib/storage';
import type { DemoUser, Session, UserRole } from '@/types/domain';
import type { AuthService } from './AuthService';

const SESSION_KEY = 'poolmate.demo-session';

/** Drives the Innova, which the pooling walkthrough seeds its trip onto. */
export const DEFAULT_DRIVER_ID = 'drv-03';

const DEMO_USER: DemoUser = {
  id: 'demo-user-001',
  displayName: 'Demo User',
  roles: ['RIDER', 'DRIVER'],
  // Demo verification only — no real identity or gender check is performed.
  womenOnlyStatus: 'DEMO_VERIFIED',
  driverId: DEFAULT_DRIVER_ID,
  demo: true,
};

/** Demo-only sign-in. No account is created and nothing leaves the browser. */
export const mockAuthService: AuthService = {
  async getSession() {
    await delay(150);
    const session = storage.get<Session>(SESSION_KEY);
    if (!session) return null;
    // Sessions stored before driver association gain the default driver.
    if (!session.user.driverId) {
      const migrated: Session = { ...session, user: { ...session.user, driverId: DEFAULT_DRIVER_ID } };
      storage.set(SESSION_KEY, migrated);
      return migrated;
    }
    return session;
  },

  async signIn(role: UserRole) {
    await delay(400);
    const session: Session = { user: DEMO_USER, lastRole: role };
    storage.set(SESSION_KEY, session);
    return session;
  },

  async signOut() {
    await delay(150);
    storage.remove(SESSION_KEY);
  },

  async setLastRole(role: UserRole) {
    const current = storage.get<Session>(SESSION_KEY);
    if (!current) throw new Error('No active demo session');
    const session: Session = { ...current, lastRole: role };
    storage.set(SESSION_KEY, session);
    return session;
  },

  async setDriverIdentity(driverId: string) {
    await delay(150);
    const current = storage.get<Session>(SESSION_KEY);
    if (!current) throw new Error('No active demo session');
    const session: Session = { ...current, user: { ...current.user, driverId } };
    storage.set(SESSION_KEY, session);
    return session;
  },
};
