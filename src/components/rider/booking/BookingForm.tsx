import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpDown, CalendarClock, Circle, MapPin, ShieldCheck, User, Users, Zap } from 'lucide-react';
import { Button, Card, ConfirmDialog, IconButton, Notice, SegmentedControl, Switch, TextField } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { useFareEstimate } from '@/hooks/useFareEstimate';
import {
  SCHEDULE_MAX_DAYS,
  defaultScheduleSlot,
  draftToSearchInput,
  hasErrors,
  toDateInput,
  validateDraft,
} from '@/lib/booking';
import type { BookingMode, PoolPreference } from '@/types/domain';
import { FareSummary } from '../FareSummary';
import { LocationField } from '../LocationField';
import { PassengerStepper } from '../PassengerStepper';

/** Step 1–4: locations, passengers, booking mode, ride preference (+ Women-Only). */
export function BookingForm({ onContinue }: { onContinue: () => void }) {
  const { draft, updateDraft, seatLimits } = useBooking();
  const [showErrors, setShowErrors] = useState(false);
  const [confirmWomenOff, setConfirmWomenOff] = useState(false);

  const errors = validateDraft(draft, seatLimits);
  const seatMax = seatLimits?.[draft.poolPreference];
  const visible = showErrors ? errors : {};

  // Estimate ignores the schedule, so changing the time does not refetch.
  const { pickup, destination, poolPreference, seats, womenOnly } = draft;
  const estimateInput = useMemo(
    () =>
      pickup && destination && pickup.id !== destination.id
        ? draftToSearchInput({ ...draft, bookingMode: 'INSTANT' })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickup, destination, poolPreference, seats, womenOnly],
  );
  const { estimate, loading, error: estimateError, retry } = useFareEstimate(estimateInput);

  const today = new Date();
  const maxDate = new Date(today.getTime() + SCHEDULE_MAX_DAYS * 86400000);

  function setMode(mode: BookingMode) {
    if (mode === 'SCHEDULED' && !draft.scheduledDate) {
      const slot = defaultScheduleSlot();
      updateDraft({ bookingMode: mode, scheduledDate: slot.date, scheduledTime: slot.time });
    } else {
      updateDraft({ bookingMode: mode });
    }
  }

  // The requested group size is kept as-is; eligibility is checked per vehicle.
  function setPreference(pref: PoolPreference) {
    updateDraft({ poolPreference: pref });
  }

  function submit() {
    setShowErrors(true);
    if (!hasErrors(errors)) onContinue();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-micro uppercase text-ink-tertiary">Book a ride</p>
        <h1 className="mt-1.5 text-title">Where to?</h1>
      </div>

      {/* 1. Locations */}
      <div className="relative space-y-3">
        <LocationField
          label="Pickup"
          leadingIcon={Circle}
          placeholder="Search a pickup point"
          value={draft.pickup}
          onChange={(v) => updateDraft({ pickup: v })}
          excludeId={draft.destination?.id}
          error={visible.pickup}
        />
        <LocationField
          label="Destination"
          leadingIcon={MapPin}
          placeholder="Search a destination"
          value={draft.destination}
          onChange={(v) => updateDraft({ destination: v })}
          excludeId={draft.pickup?.id}
          error={visible.destination}
        />
        <IconButton
          icon={ArrowUpDown}
          label="Swap pickup and destination"
          variant="secondary"
          size="sm"
          className="absolute -top-1 right-0 h-7 w-7 bg-surface"
          disabled={!draft.pickup && !draft.destination}
          onClick={() => updateDraft({ pickup: draft.destination, destination: draft.pickup })}
        />
      </div>

      {/* 2. Passengers */}
      <PassengerStepper
        value={draft.seats}
        max={seatMax ?? draft.seats}
        onChange={(seats) => updateDraft({ seats })}
        hint={
          seatMax
            ? `Up to ${seatMax}, based on ${draft.poolPreference === 'POOL_ENABLED' ? 'verified pooling' : 'vehicle'} capacity. Seats are checked per vehicle.`
            : 'Loading demo fleet capacity…'
        }
        // Over-limit is shown immediately (e.g. after switching to Pool), not only on submit.
        error={visible.seats ?? (seatMax !== undefined && draft.seats > seatMax ? errors.seats : undefined)}
      />

      {/* 3. Booking mode */}
      <fieldset className="space-y-2.5">
        <legend className="mb-2.5 text-body font-medium text-ink">When</legend>
        <SegmentedControl<BookingMode>
          label="Booking mode"
          fullWidth
          value={draft.bookingMode}
          onChange={setMode}
          options={[
            { value: 'INSTANT', label: 'Instant', icon: Zap },
            { value: 'SCHEDULED', label: 'Scheduled', icon: CalendarClock },
          ]}
        />
        {draft.bookingMode === 'INSTANT' ? (
          <p className="text-caption text-ink-secondary">Leaves as soon as a driver is assigned. No waiting for co-riders.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Date"
                type="date"
                min={toDateInput(today)}
                max={toDateInput(maxDate)}
                value={draft.scheduledDate}
                onChange={(e) => updateDraft({ scheduledDate: e.target.value })}
              />
              <TextField
                label="Time"
                type="time"
                step={300}
                value={draft.scheduledTime}
                onChange={(e) => updateDraft({ scheduledTime: e.target.value })}
              />
            </div>
            {visible.schedule ? (
              <Notice tone="error">{visible.schedule}</Notice>
            ) : (
              <p className="text-caption text-ink-secondary">At least 30 minutes from now, up to 7 days ahead.</p>
            )}
          </div>
        )}
      </fieldset>

      {/* 4. Ride preference — independent of booking mode */}
      <fieldset className="space-y-2.5">
        <legend className="mb-2.5 text-body font-medium text-ink">Ride preference</legend>
        <SegmentedControl<PoolPreference>
          label="Ride preference"
          fullWidth
          value={draft.poolPreference}
          onChange={setPreference}
          options={[
            { value: 'SOLO', label: 'Solo', icon: User },
            { value: 'POOL_ENABLED', label: 'Pool-enabled', icon: Users },
          ]}
        />
        <p className="text-caption text-ink-secondary">
          {draft.poolPreference === 'SOLO'
            ? 'A normal individual ride. No co-riders join.'
            : 'Your ride starts right away. A compatible passenger may join along your remaining route, for a lower fare.'}
        </p>
      </fieldset>

      <Card padding="sm" className={draft.womenOnly ? 'border-ink' : undefined}>
        <Switch
          label="Women-Only ride"
          description="Only eligible women drivers and co-riders. Stays on through booking and the trip — we never switch you to a mixed ride."
          checked={draft.womenOnly}
          onCheckedChange={(next) => (next ? updateDraft({ womenOnly: true }) : setConfirmWomenOff(true))}
        />
        {draft.womenOnly && (
          <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-caption font-medium text-ink">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Women-Only requested · Demo verification
          </p>
        )}
      </Card>

      {/* Estimate */}
      {estimateError ? (
        <Notice
          tone="error"
          title="Could not estimate this trip"
          action={
            <Button size="sm" variant="secondary" onClick={retry}>
              Try again
            </Button>
          }
        >
          {estimateError}
        </Notice>
      ) : estimateInput ? (
        <FareSummary estimate={estimate} loading={loading} />
      ) : (
        <p className="rounded-lg border border-dashed border-line-strong p-4 text-body-sm text-ink-secondary">
          Choose pickup and destination to see an estimated fare and journey time.
        </p>
      )}

      <Button size="lg" fullWidth rightIcon={ArrowRight} onClick={submit}>
        See ride options
      </Button>

      <ConfirmDialog
        open={confirmWomenOff}
        title="Turn off Women-Only?"
        description="Your search criteria will change: drivers and co-riders of any gender may be matched. You can turn it back on before confirming."
        confirmLabel="Turn off Women-Only"
        cancelLabel="Keep Women-Only"
        onCancel={() => setConfirmWomenOff(false)}
        onConfirm={() => {
          updateDraft({ womenOnly: false });
          setConfirmWomenOff(false);
        }}
      />
    </div>
  );
}
