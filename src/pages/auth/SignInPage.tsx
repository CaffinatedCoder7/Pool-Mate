import { useState } from 'react';
import { ArrowRight, Car, UserRound, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { Button, Notice } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useNotify } from '@/context/NotificationContext';
import { cn } from '@/lib/cn';
import { roleHome } from '@/routes/paths';
import type { UserRole } from '@/types/domain';

const roleOptions: Array<{ value: UserRole; title: string; description: string; icon: LucideIcon }> = [
  { value: 'RIDER', title: 'Ride', description: 'Book an instant ride and pool when it fits.', icon: UserRound },
  { value: 'DRIVER', title: 'Drive', description: 'Go online and review pool offers on your route.', icon: Car },
];

export function SignInPage() {
  const { signIn } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('RIDER');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setPending(true);
    setError(null);
    try {
      await signIn(role);
      notify({ title: 'Signed in to demo', description: 'You are using sample data only.', tone: 'success' });
      navigate(roleHome[role], { replace: true });
    } catch {
      setError('We could not start the demo session. Please try again.');
      setPending(false);
    }
  }

  return (
    /* Outside the app shell, so this screen owns its own scrolling. */
    <div className="flex h-full flex-col overflow-y-auto bg-canvas">
      <header className="flex h-topbar items-center px-4 sm:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <h1 className="text-title-lg sm:text-display">Get moving.</h1>
          <p className="mt-3 text-body-lg text-ink-secondary">Intra-city rides that leave now — and pool when it makes sense.</p>

          <fieldset className="mt-8">
            <legend className="mb-3 text-body-sm font-medium text-ink">How do you want to continue?</legend>
            <div className="grid gap-3">
              {roleOptions.map(({ value, title, description, icon: Icon }) => {
                const selected = role === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-lg border bg-surface p-4 transition-colors duration-150',
                      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink has-[:focus-visible]:ring-offset-2',
                      selected ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-strong',
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={selected}
                      onChange={() => setRole(value)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
                        selected ? 'bg-ink text-ink-inverse' : 'bg-surface-muted text-ink',
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold text-ink">{title}</span>
                      <span className="block text-body-sm text-ink-secondary">{description}</span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                        selected ? 'border-ink' : 'border-line-strong',
                      )}
                    >
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <Notice tone="error" className="mt-4">
              {error}
            </Notice>
          )}

          <Button size="lg" fullWidth rightIcon={ArrowRight} loading={pending} onClick={handleContinue} className="mt-6">
            Continue to demo
          </Button>

          <Notice className="mt-6" title="Demo sign-in">
            No account is created and nothing leaves this browser. Drivers, fares and locations are sample data.
          </Notice>
        </div>
      </main>
    </div>
  );
}
