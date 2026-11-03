import { Outlet } from 'react-router-dom';
import { useActiveRole } from '@/hooks/useActiveRole';
import { navByRole } from '@/navigation/navConfig';
import { MobileNav } from './MobileNav';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';

/**
 * Shared authenticated layout: top bar, desktop side nav, mobile bottom nav.
 *
 * The shell fills the viewport and clips, and `main` is the only vertical
 * scroll container. `min-h-0` on the middle row lets that scroller shrink
 * below its content instead of stretching the shell and spilling out into a
 * second, document-level scrollbar.
 */
export function AppShell() {
  const role = useActiveRole();
  const items = navByRole[role];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-canvas">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <TopBar role={role} />
      <div className="flex min-h-0 flex-1">
        <SideNav items={items} role={role} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto focus:outline-none">
          <Outlet />
        </main>
      </div>
      <MobileNav items={items} role={role} />
    </div>
  );
}
