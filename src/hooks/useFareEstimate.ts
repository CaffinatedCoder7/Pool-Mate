import { useCallback, useEffect, useState } from 'react';
import { rideService } from '@/services';
import type { FareEstimate, RideSearchInput } from '@/types/domain';

/** Fetches a (demo) fare/duration estimate whenever the input changes. */
export function useFareEstimate(input: RideSearchInput | null) {
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = input ? JSON.stringify(input) : '';

  useEffect(() => {
    if (!input) {
      setEstimate(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    rideService
      .estimate(input)
      .then((e) => !cancelled && setEstimate(e))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not estimate this trip.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // `key` captures the input's value; the object identity may change each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { estimate, loading, error, retry };
}
