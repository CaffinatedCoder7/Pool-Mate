import { useEffect, useRef, useState } from 'react';
import { MapPageLayout } from '@/components/layout/MapPageLayout';
import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { BookingForm } from '@/components/rider/booking/BookingForm';
import { BookingProgress } from '@/components/rider/booking/BookingProgress';
import { BookingResults } from '@/components/rider/booking/BookingResults';
import { BookingReview } from '@/components/rider/booking/BookingReview';
import { Skeleton } from '@/components/ui';
import { useBooking } from '@/context/BookingContext';

type Stage = 'form' | 'results' | 'review';

/**
 * Booking flow: trip details → choose a vehicle → review → searching →
 * driver assigned → confirmation.
 */
export function BookRidePage() {
  const { draft, resetDraft, loading, activeBookingId, setActiveBookingId, getBooking } = useBooking();
  const [stage, setStage] = useState<Stage>('form');
  const booking = activeBookingId ? getBooking(activeBookingId) : undefined;
  const checked = useRef(false);

  // On arrival, keep showing an in-progress search; drop finished bookings so the form appears.
  useEffect(() => {
    if (loading || checked.current) return;
    checked.current = true;
    if (activeBookingId && booking?.status !== 'SEARCHING') setActiveBookingId(null);
  }, [loading, activeBookingId, booking, setActiveBookingId]);

  const goToStage = (next: Stage) => {
    setActiveBookingId(null);
    setStage(next);
  };

  let panel;
  if (activeBookingId && loading) {
    panel = (
      <div className="space-y-3" aria-busy="true" aria-label="Loading booking">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (booking) {
    panel = (
      <BookingProgress
        booking={booking}
        onEdit={() => goToStage('form')}
        onChooseVehicle={() => goToStage('results')}
        onRetry={setActiveBookingId}
        onNewBooking={() => {
          resetDraft();
          goToStage('form');
        }}
      />
    );
  } else if (stage === 'review') {
    panel = <BookingReview onBack={() => setStage('form')} onChangeVehicle={() => setStage('results')} onRequested={setActiveBookingId} />;
  } else if (stage === 'results') {
    panel = <BookingResults onBack={() => setStage('form')} onContinue={() => setStage('review')} />;
  } else {
    panel = <BookingForm onContinue={() => setStage('results')} />;
  }

  const route = booking?.input ?? (draft.pickup && draft.destination ? { pickupLabel: draft.pickup.label, destinationLabel: draft.destination.label } : null);

  return (
    <MapPageLayout
      panelLabel="Ride booking"
      panel={panel}
      map={
        <MapPlaceholder
          title={route ? `${route.pickupLabel} → ${route.destinationLabel}` : 'Jaipur map'}
          description={route ? 'Route preview will appear here in a later phase.' : 'Choose pickup and destination using the search fields.'}
        />
      }
    />
  );
}
