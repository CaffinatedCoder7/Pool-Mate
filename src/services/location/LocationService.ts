import type { LatLng, LocationSuggestion } from '@/types/domain';

export interface LocationService {
  suggest(query: string): Promise<LocationSuggestion[]>;
  getCurrentPosition(): Promise<LatLng>;
}
