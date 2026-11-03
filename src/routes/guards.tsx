import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { paths, roleHome } from './paths';

function FullScreenLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-canvas text-ink-secondary">
      <Spinner className="h-5 w-5" label="Loading PoolMate" />
    </div>
  );
}

/** Blocks authenticated routes until a (mock) session exists. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'signed-out') return <Navigate to={paths.signIn} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Keeps signed-in users away from the sign-in screen. */
export function RedirectIfAuthenticated() {
  const { status, session } = useAuth();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'signed-in' && session) return <Navigate to={roleHome[session.lastRole]} replace />;
  return <Outlet />;
}

/** "/" lands on the home of the role the user last used. */
export function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={roleHome[session?.lastRole ?? 'RIDER']} replace />;
}
