import { Link } from 'react-router-dom';
import { DemoBadge } from '@/components/ui';
import { roleHome } from '@/routes/paths';
import type { UserRole } from '@/types/domain';
import { Logo } from './Logo';
import { RoleSwitch } from './RoleSwitch';
import { UserMenu } from './UserMenu';

export function TopBar({ role }: { role: UserRole }) {
  return (
    <header className="z-30 flex h-topbar shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link to={roleHome[role]} aria-label="PoolMate home" className="rounded-md">
          <Logo compact />
        </Link>
        <DemoBadge label="Prototype" className="hidden md:inline-flex" />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <RoleSwitch role={role} />
        <UserMenu role={role} />
      </div>
    </header>
  );
}
