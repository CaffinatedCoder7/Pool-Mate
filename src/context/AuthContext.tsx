import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '@/services';
import type { Session, UserRole } from '@/types/domain';

type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  signIn: (role: UserRole) => Promise<Session>;
  signOut: () => Promise<void>;
  rememberRole: (role: UserRole) => void;
  /** Demo-only: switch which fleet driver this account drives as. */
  setDriverIdentity: (driverId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Mock authentication state. All data comes through `authService`. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    authService
      .getSession()
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setStatus(s ? 'signed-in' : 'signed-out');
      })
      .catch(() => {
        if (!cancelled) setStatus('signed-out');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (role: UserRole) => {
    const s = await authService.signIn(role);
    setSession(s);
    setStatus('signed-in');
    return s;
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
    setStatus('signed-out');
  }, []);

  const rememberRole = useCallback((role: UserRole) => {
    authService
      .setLastRole(role)
      .then(setSession)
      .catch(() => {
        // Non-critical: only affects which home "/" redirects to.
      });
  }, []);

  const setDriverIdentity = useCallback(async (driverId: string) => {
    setSession(await authService.setDriverIdentity(driverId));
  }, []);

  const value = useMemo(
    () => ({ status, session, signIn, signOut, rememberRole, setDriverIdentity }),
    [status, session, signIn, signOut, rememberRole, setDriverIdentity],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
