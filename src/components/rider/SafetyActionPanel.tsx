import { useState } from 'react';
import { ChevronRight, Phone, Share2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, ConfirmDialog, Notice } from '@/components/ui';
import { useNotify } from '@/context/NotificationContext';
import { paths } from '@/routes/paths';

/**
 * Safety shortcuts, including the SOS affordance. SOS is deliberately
 * unmistakable in the monochrome palette — solid inverse surface, bold label,
 * warning icon and an explicit confirmation step — and never relies on colour.
 */
export function SafetyActionPanel({ compact = false }: { compact?: boolean }) {
  const { notify } = useNotify();
  const [confirmSos, setConfirmSos] = useState(false);

  return (
    <section aria-labelledby="safety-heading" className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="safety-heading" className="flex items-center gap-2 text-body font-semibold">
          <ShieldCheck className="h-4 w-4 text-ink-secondary" aria-hidden />
          Safety
        </h2>
      </div>

      <Button
        className="mt-3 border-2 border-ink font-semibold uppercase tracking-wide"
        size="lg"
        fullWidth
        leftIcon={ShieldAlert}
        onClick={() => setConfirmSos(true)}
      >
        SOS — Emergency help
      </Button>
      <p className="mt-2 text-caption text-ink-tertiary">
        Demo only. This prototype cannot contact police, ambulance or any emergency service.
      </p>

      {!compact && (
        <div className="mt-3 space-y-1 border-t border-line pt-3">
          <Link to={paths.rider.safety} className="-mx-2 flex items-center gap-3 rounded-md p-2 hover:bg-surface-muted">
            <Phone className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden />
            <span className="flex-1 text-body-sm font-medium">Emergency contacts</span>
            <ChevronRight className="h-4 w-4 text-ink-tertiary" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => notify({ title: 'Trip sharing is not live yet', description: 'No trip details are sent to anyone in the demo.', tone: 'info' })}
            className="-mx-2 flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-surface-muted"
          >
            <Share2 className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden />
            <span className="flex-1 text-body-sm font-medium">Share trip status</span>
            <ChevronRight className="h-4 w-4 text-ink-tertiary" aria-hidden />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmSos}
        title="Raise a demo SOS?"
        description={
          <>
            This is a <strong>prototype</strong>. No emergency service, contact or PoolMate operator will be alerted. In the real
            product this would share your live trip and location with your emergency contacts.
          </>
        }
        confirmLabel="Raise demo SOS"
        cancelLabel="Cancel"
        onCancel={() => setConfirmSos(false)}
        onConfirm={() => {
          setConfirmSos(false);
          notify({
            title: 'Demo SOS recorded',
            description: 'Nothing was sent. No real emergency service was contacted.',
            tone: 'warning',
            durationMs: 8000,
          });
        }}
      />

      {compact && (
        <Notice className="mt-3" title="Prototype safety tools">
          SOS, trip sharing and emergency contacts are simulated in this build.
        </Notice>
      )}
    </section>
  );
}
