import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/domain';

/**
 * The URL is the source of truth for the active mode: /driver/* is driver
 * mode, /rider/* is rider mode. Role-agnostic pages fall back to the last role.
 */
export function useActiveRole(): UserRole {
  const { pathname } = useLocation();
  const { session } = useAuth();
  if (pathname.startsWith('/driver')) return 'DRIVER';
  if (pathname.startsWith('/rider')) return 'RIDER';
  return session?.lastRole ?? 'RIDER';
}
