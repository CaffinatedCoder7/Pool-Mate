import { useEffect, useId, useRef, useState } from 'react';
import { FlaskConical, LogOut, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotify } from '@/context/NotificationContext';
import { cn } from '@/lib/cn';
import { paths, roleProfile } from '@/routes/paths';
import type { UserRole } from '@/types/domain';

const itemClass =
  'flex h-10 w-full items-center gap-3 rounded px-3 text-left text-body-sm font-medium text-ink hover:bg-surface-muted focus-visible:bg-surface-muted';

export function UserMenu({ role }: { role: UserRole }) {
  const { session, signOut } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const name = session?.user.displayName ?? 'Guest';
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    notify({ title: 'Signed out', description: 'Your demo session has ended.', tone: 'success' });
    navigate(paths.signIn, { replace: true });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface-muted text-caption font-semibold text-ink transition-colors hover:bg-surface-sunken"
      >
        {initials}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-11 z-40 w-60 rounded-lg border border-line bg-surface p-1.5 shadow-lg"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-body-sm font-semibold text-ink">{name}</p>
            <p className="text-caption text-ink-tertiary">Demo account · no real identity</p>
          </div>
          <div className="my-1 h-px bg-line" aria-hidden />
          <Link role="menuitem" to={roleProfile[role]} className={itemClass} onClick={() => setOpen(false)}>
            <UserRound className="h-4 w-4 text-ink-secondary" aria-hidden />
            Profile
          </Link>
          <Link role="menuitem" to={paths.rider.demo} className={itemClass} onClick={() => setOpen(false)}>
            <FlaskConical className="h-4 w-4 text-ink-secondary" aria-hidden />
            Demo centre
          </Link>
          <div className="my-1 h-px bg-line" aria-hidden />
          <button role="menuitem" type="button" className={cn(itemClass)} onClick={handleSignOut}>
            <LogOut className="h-4 w-4 text-ink-secondary" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
