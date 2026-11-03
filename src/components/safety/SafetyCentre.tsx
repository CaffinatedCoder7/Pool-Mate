import { useEffect, useState } from 'react';
import { ClipboardList, Phone, Send, Share2, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DemoBadge,
  Dialog,
  EmptyState,
  Notice,
  SegmentedControl,
  TextField,
} from '@/components/ui';
import { useNotify } from '@/context/NotificationContext';
import { formatRelativeTime } from '@/lib/format';
import { safetyService } from '@/services';
import type { Booking, EmergencyContact, SafetyReport, SafetyReportCategory, UserRole } from '@/types/domain';

const categories: Array<{ value: SafetyReportCategory; label: string }> = [
  { value: 'PASSENGER', label: 'Passenger' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'ROUTE', label: 'Route' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'OTHER', label: 'Other' },
];

const categoryLabels = Object.fromEntries(categories.map((c) => [c.value, c.label])) as Record<SafetyReportCategory, string>;

interface SafetyCentreProps {
  role: UserRole;
  /** Trip used for the share preview and attached to reports, if any. */
  activeBooking?: Booking;
}

/**
 * Shared safety centre for both roles. Every action is a local demo: no
 * emergency service, contact or operator is contacted, and nothing is sent.
 */
export function SafetyCentre({ role, activeBooking }: SafetyCentreProps) {
  const { notify } = useNotify();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [confirmSos, setConfirmSos] = useState(false);
  const [sosPending, setSosPending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [category, setCategory] = useState<SafetyReportCategory>('SAFETY');
  const [message, setMessage] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportPending, setReportPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void safetyService.listEmergencyContacts().then((c) => !cancelled && setContacts(c));
    void safetyService.listReports().then((r) => !cancelled && setReports(r));
    return () => {
      cancelled = true;
    };
  }, []);

  async function raiseSos() {
    setSosPending(true);
    try {
      const report = await safetyService.recordSosDrill(role, activeBooking?.id);
      setReports((all) => [report, ...all]);
      setConfirmSos(false);
      notify({
        title: 'Demo SOS recorded',
        description: 'Nothing was sent. No emergency service or contact was notified.',
        tone: 'warning',
        durationMs: 8000,
      });
    } catch {
      notify({ title: 'Could not record the demo SOS', tone: 'error' });
    } finally {
      setSosPending(false);
    }
  }

  async function submitReport() {
    if (!message.trim()) {
      setReportError('Please describe what happened.');
      return;
    }
    setReportPending(true);
    setReportError(null);
    try {
      const report = await safetyService.submitReport({ category, message, role, bookingId: activeBooking?.id });
      setReports((all) => [report, ...all]);
      setMessage('');
      notify({ title: 'Demo report saved', description: 'Stored in this browser only — nobody was contacted.', tone: 'success' });
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Could not save the report.');
    } finally {
      setReportPending(false);
    }
  }

  const shareFields = activeBooking
    ? [
        { label: 'Trip reference', value: activeBooking.reference },
        { label: 'Pickup', value: activeBooking.input.pickupLabel },
        { label: 'Destination', value: activeBooking.input.destinationLabel },
        { label: 'Vehicle', value: `${activeBooking.driver?.vehicleModel ?? '—'} · ${activeBooking.driver?.plate ?? '—'}` },
        { label: 'Driver', value: activeBooking.driver?.driverLabel ?? '—' },
        { label: 'ETA', value: activeBooking.trip ? `~${activeBooking.trip.etaMinutes} min` : '—' },
      ]
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-heading">
                <ShieldAlert className="h-[18px] w-[18px]" aria-hidden />
                Emergency SOS
              </h2>
              <p className="mt-1 text-body-sm text-ink-secondary">
                In the real product this shares your live trip and location with your emergency contacts.
              </p>
            </div>
            <DemoBadge />
          </div>

          <Button
            className="mt-4 border-2 border-ink font-semibold uppercase tracking-wide"
            size="lg"
            fullWidth
            leftIcon={ShieldAlert}
            onClick={() => setConfirmSos(true)}
          >
            SOS — Emergency help
          </Button>

          <Notice className="mt-3" tone="warning" title="This prototype cannot call for help">
            No police, ambulance, PoolMate operator or emergency contact is notified. The action is recorded locally so you can see it
            happened.
          </Notice>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 text-heading">
              <ClipboardList className="h-[18px] w-[18px]" aria-hidden />
              Report an issue
            </h2>
            <DemoBadge />
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-2 text-body-sm font-medium">Category</p>
              <SegmentedControl<SafetyReportCategory>
                label="Report category"
                size="sm"
                className="flex-wrap"
                value={category}
                onChange={setCategory}
                options={categories}
              />
            </div>
            <TextField
              label="What happened?"
              placeholder="Describe the issue for this demo report"
              value={message}
              error={reportError ?? undefined}
              onChange={(e) => {
                setMessage(e.target.value);
                setReportError(null);
              }}
            />
            {activeBooking && <p className="text-caption text-ink-tertiary">Attached to trip {activeBooking.reference}.</p>}
            <Button leftIcon={Send} loading={reportPending} onClick={submitReport}>
              Save demo report
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-heading">Demo reports</h2>
            {reports.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await safetyService.clearReports();
                  setReports([]);
                  notify({ title: 'Demo reports cleared', tone: 'info' });
                }}
              >
                Clear
              </Button>
            )}
          </div>
          {reports.length === 0 ? (
            <EmptyState className="py-6" icon={ClipboardList} title="No demo reports yet" description="Anything you save appears here." />
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {reports.map((report) => (
                <li key={report.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <Badge>{categoryLabels[report.category]}</Badge>
                    <span className="shrink-0 text-caption text-ink-tertiary">{formatRelativeTime(report.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-body-sm text-ink">{report.message}</p>
                  <p className="mt-0.5 text-caption text-ink-tertiary">
                    Filed as {report.role === 'DRIVER' ? 'driver' : 'rider'}
                    {report.bookingId ? ' · linked to a trip' : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 text-heading">
              <Phone className="h-[18px] w-[18px]" aria-hidden />
              Emergency contacts
            </h2>
            <DemoBadge />
          </div>
          <ul className="mt-3 divide-y divide-line">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium">{contact.name}</p>
                  <p className="text-caption text-ink-tertiary">{contact.relationship}</p>
                </div>
                <span className="shrink-0 font-mono text-caption text-ink-secondary">{contact.phoneMasked}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-caption text-ink-tertiary">
            Sample contacts with masked numbers. No call or message can be placed from this prototype.
          </p>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 text-heading">
              <Share2 className="h-[18px] w-[18px]" aria-hidden />
              Share trip
            </h2>
            <DemoBadge />
          </div>
          <p className="mt-1 text-body-sm text-ink-secondary">
            {activeBooking ? 'See exactly what would be shared with a contact.' : 'Available while a trip is under way.'}
          </p>
          <Button className="mt-3" variant="secondary" fullWidth disabled={!activeBooking} onClick={() => setShareOpen(true)}>
            Preview what would be shared
          </Button>
          {!activeBooking && <p className="mt-2 text-caption text-ink-tertiary">No active trip right now.</p>}
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-heading">
            <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
            Safety in this build
          </h2>
          <ul className="mt-3 space-y-2 text-body-sm text-ink-secondary">
            <li>SOS, sharing and reports are simulated and stay in this browser.</li>
            <li>Women-Only requirements are enforced through booking, discovery and pooling.</li>
            <li>Passenger identities and precise locations are never exposed to the other party.</li>
          </ul>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmSos}
        pending={sosPending}
        title="Raise a demo SOS?"
        description={
          <>
            This is a <strong>prototype</strong>. No emergency service, contact or PoolMate operator will be alerted. The action is only
            recorded locally.
          </>
        }
        confirmLabel="Raise demo SOS"
        cancelLabel="Cancel"
        onCancel={() => setConfirmSos(false)}
        onConfirm={raiseSos}
      />

      <Dialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="What would be shared"
        description="Nothing is sent. This is a preview of the information a real trip share would contain."
        footer={
          <Button className="w-full sm:w-auto" onClick={() => setShareOpen(false)}>
            Close
          </Button>
        }
      >
        <dl className="space-y-3">
          {shareFields.map((field) => (
            <div key={field.label} className="flex justify-between gap-4 text-body-sm">
              <dt className="text-ink-secondary">{field.label}</dt>
              <dd className="text-right font-medium">{field.value}</dd>
            </div>
          ))}
        </dl>
        <Notice className="mt-4" tone="warning" title="Not sent to anyone">
          No contact received this. Trip sharing needs a backend that this prototype does not have.
        </Notice>
      </Dialog>
    </div>
  );
}
