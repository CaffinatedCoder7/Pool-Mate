import { FlaskConical } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { roleLabels, type NavItem } from '@/navigation/navConfig';
import type { UserRole } from '@/types/domain';

/** Desktop navigation rail (lg and up). */
export function SideNav({ items, role }: { items: NavItem[]; role: UserRole }) {
  return (
    <nav
      aria-label={`${roleLabels[role]} navigation`}
      /* Scrolls within the rail on short viewports rather than overflowing the shell. */
      className="hidden min-h-0 w-sidenav shrink-0 flex-col overflow-y-auto border-r border-line bg-surface lg:flex"
    >
      <p className="px-6 pb-2 pt-6 text-micro uppercase text-ink-tertiary">{roleLabels[role]}</p>

      <ul className="flex flex-col gap-0.5 px-3">
        {items.map(({ label, to, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-body-sm font-medium transition-colors duration-150',
                  isActive ? 'bg-surface-muted text-ink' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.25 : 2} aria-hidden />
                  <span className={cn(isActive && 'font-semibold')}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-auto p-4">
        <div className="rounded-md border border-line bg-surface-muted p-3">
          <p className="flex items-center gap-1.5 text-caption font-semibold text-ink">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
            Demo environment
          </p>
          <p className="mt-1 text-caption text-ink-tertiary">Drivers, fares and locations are simulated sample data.</p>
        </div>
      </div>
    </nav>
  );
}
