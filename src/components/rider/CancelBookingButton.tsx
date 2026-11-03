import { useState } from 'react';
import { Button, ConfirmDialog, type ButtonProps } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';
import { useNotify } from '@/context/NotificationContext';
import type { Booking } from '@/types/domain';

interface CancelBookingButtonProps extends Pick<ButtonProps, 'variant' | 'size' | 'fullWidth' | 'className'> {
  booking: Booking;
  label?: string;
  onCancelled?: () => void;
}

/** Cancel with an explicit confirmation step; UI updates only after the service succeeds. */
export function CancelBookingButton({ booking, label = 'Cancel ride', onCancelled, variant = 'secondary', ...buttonProps }: CancelBookingButtonProps) {
  const { cancelBooking } = useBooking();
  const { notify } = useNotify();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const searching = booking.status === 'SEARCHING';

  async function confirm() {
    setPending(true);
    try {
      await cancelBooking(booking.id);
      notify({ title: searching ? 'Request cancelled' : 'Ride cancelled', description: 'No cancellation fee in the demo.', tone: 'success' });
      setOpen(false);
      onCancelled?.();
    } catch (e) {
      notify({ title: 'Could not cancel', description: e instanceof Error ? e.message : 'Please try again.', tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} {...buttonProps}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        pending={pending}
        title={searching ? 'Cancel this request?' : 'Cancel this ride?'}
        description={`${booking.input.pickupLabel} → ${booking.input.destinationLabel}. ${
          searching ? 'We will stop searching for a demo driver.' : 'Your demo driver will be released.'
        }`}
        confirmLabel={searching ? 'Cancel request' : 'Cancel ride'}
        cancelLabel="Keep ride"
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
