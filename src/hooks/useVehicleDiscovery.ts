import { useCallback, useEffect, useState } from 'react';
import { rideService } from '@/services';
import type { RideSearchInput, VehicleDiscoveryResult } from '@/types/domain';

/** Loads demo vehicles that can serve the request, with loading/error/retry. */
export function useVehicleDiscovery(input: RideSearchInput | null) {
  const [result, setResult] = useState<VehicleDiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = input ? JSON.stringify(input) : '';

  useEffect(() => {
    if (!input) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    rideService
      .discoverVehicles(input)
      .then((r) => !cancelled && setResult(r))
      .catch(() => !cancelled && setError('Could not load vehicles for this request.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // `key` captures the input's value; its object identity changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { result, loading, error, retry };
}
