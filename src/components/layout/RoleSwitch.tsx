import { Car, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SegmentedControl } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { roleLabels } from '@/navigation/navConfig';
import { roleHome } from '@/routes/paths';
import type { UserRole } from '@/types/domain';

/** Rider/Driver mode switch. Switching navigates to that mode's home. */
export function RoleSwitch({ role }: { role: UserRole }) {
  const navigate = useNavigate();
  const { session, rememberRole } = useAuth();
  const roles = session?.user.roles ?? [];

  if (roles.length < 2) return null;

  return (
    <SegmentedControl<UserRole>
      label="Switch mode"
      size="sm"
      value={role}
      options={[
        { value: 'RIDER', label: roleLabels.RIDER, icon: UserRound },
        { value: 'DRIVER', label: roleLabels.DRIVER, icon: Car },
      ]}
      onChange={(next) => {
        if (next === role) return;
        rememberRole(next);
        navigate(roleHome[next]);
      }}
    />
  );
}
