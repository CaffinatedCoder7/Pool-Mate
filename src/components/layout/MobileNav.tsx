import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { roleLabels, type NavItem } from '@/navigation/navConfig';
import type { UserRole } from '@/types/domain';

/** Bottom tab bar for mobile and tablet (below lg). */
export function MobileNav({ items, role }: { items: NavItem[]; role: UserRole }) {
  return (
    <nav aria-label={`${roleLabels[role]} navigation`} className="z-30 shrink-0 border-t border-line bg-surface pb-safe lg:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ label, shortLabel, to, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors',
                  isActive ? 'text-ink' : 'text-ink-tertiary hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span aria-hidden className={cn('absolute inset-x-5 top-0 h-0.5 rounded-b bg-ink', !isActive && 'invisible')} />
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 2} aria-hidden />
                  <span className={cn(isActive && 'font-semibold')}>{shortLabel ?? label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
