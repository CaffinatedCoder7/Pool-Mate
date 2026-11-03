import { jaipurLocations, popularLocationIds } from '@/data/jaipurLocations';
import { delay } from '@/lib/delay';
import type { LocationSuggestion } from '@/types/domain';
import type { LocationService } from './LocationService';

/** Curated Jaipur fixtures only — no public geocoding endpoint is called. */
export const mockLocationService: LocationService = {
  async suggest(query: string) {
    await delay(120);
    const q = query.trim().toLowerCase();
    if (!q) {
      return popularLocationIds
        .map((id) => jaipurLocations.find((l) => l.id === id))
        .filter((l): l is LocationSuggestion => Boolean(l));
    }
    return jaipurLocations.filter(
      (l) => l.label.toLowerCase().includes(q) || l.secondaryLabel?.toLowerCase().includes(q),
    );
  },

  async getCurrentPosition() {
    // GPS is out of scope for this phase; pickup is chosen manually.
    throw new Error('Current location is not available in this prototype phase.');
  },
};
