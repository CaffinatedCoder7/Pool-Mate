import type { LocationSuggestion } from '@/types/domain';

/**
 * Curated public Jaipur landmarks for the demo (no private addresses).
 * Coordinates are approximate. `womenOnlyCoverage: false` marks outer areas
 * where the demo fleet has no eligible Women-Only vehicle — used for the
 * deterministic "Women-Only no match" scenario.
 */
export const jaipurLocations: LocationSuggestion[] = [
  { id: 'mnit', label: 'MNIT Jaipur, Main Gate', secondaryLabel: 'JLN Marg, Malviya Nagar', position: { lat: 26.864, lng: 75.8108 }, kind: 'CAMPUS', womenOnlyCoverage: true },
  { id: 'uni-raj', label: 'University of Rajasthan', secondaryLabel: 'JLN Marg, Gandhi Nagar', position: { lat: 26.888, lng: 75.819 }, kind: 'CAMPUS', womenOnlyCoverage: true },
  { id: 'jaipur-jn', label: 'Jaipur Junction Railway Station', secondaryLabel: 'Station Road', position: { lat: 26.9196, lng: 75.7878 }, kind: 'TRANSIT', womenOnlyCoverage: true },
  { id: 'sindhi-camp', label: 'Sindhi Camp Bus Stand', secondaryLabel: 'Station Road', position: { lat: 26.9236, lng: 75.801 }, kind: 'TRANSIT', womenOnlyCoverage: true },
  { id: 'airport', label: 'Jaipur International Airport, T2', secondaryLabel: 'Sanganer', position: { lat: 26.8242, lng: 75.8122 }, kind: 'TRANSIT', womenOnlyCoverage: true },
  { id: 'mansarovar-metro', label: 'Mansarovar Metro Station', secondaryLabel: 'New Sanganer Road', position: { lat: 26.879, lng: 75.7495 }, kind: 'TRANSIT', womenOnlyCoverage: true },
  { id: 'badi-chaupar', label: 'Badi Chaupar Metro Station', secondaryLabel: 'Walled City', position: { lat: 26.9255, lng: 75.8275 }, kind: 'TRANSIT', womenOnlyCoverage: true },
  { id: 'hawa-mahal', label: 'Hawa Mahal', secondaryLabel: 'Badi Chaupar, Walled City', position: { lat: 26.9239, lng: 75.8267 }, kind: 'LANDMARK', womenOnlyCoverage: true },
  { id: 'statue-circle', label: 'Statue Circle', secondaryLabel: 'C-Scheme', position: { lat: 26.905, lng: 75.804 }, kind: 'LANDMARK', womenOnlyCoverage: true },
  { id: 'sms-hospital', label: 'SMS Hospital', secondaryLabel: 'JLN Marg', position: { lat: 26.9046, lng: 75.8152 }, kind: 'LANDMARK', womenOnlyCoverage: true },
  { id: 'wtp', label: 'World Trade Park', secondaryLabel: 'JLN Marg, Malviya Nagar', position: { lat: 26.8536, lng: 75.8047 }, kind: 'LANDMARK', womenOnlyCoverage: true },
  { id: 'jawahar-circle', label: 'Jawahar Circle', secondaryLabel: 'Tonk Road', position: { lat: 26.841, lng: 75.804 }, kind: 'LANDMARK', womenOnlyCoverage: true },
  { id: 'vaishali', label: 'Amrapali Circle, Vaishali Nagar', secondaryLabel: 'Vaishali Nagar', position: { lat: 26.9115, lng: 75.743 }, kind: 'RESIDENTIAL', womenOnlyCoverage: true },
  { id: 'raja-park', label: 'Raja Park Main Market', secondaryLabel: 'Raja Park', position: { lat: 26.896, lng: 75.832 }, kind: 'RESIDENTIAL', womenOnlyCoverage: true },
  { id: 'sitapura', label: 'Sitapura Industrial Area', secondaryLabel: 'Tonk Road', position: { lat: 26.7811, lng: 75.846 }, kind: 'OFFICE', womenOnlyCoverage: true },
  { id: 'mwc', label: 'Mahindra World City', secondaryLabel: 'Ajmer Road (outer area)', position: { lat: 26.79, lng: 75.65 }, kind: 'OFFICE', womenOnlyCoverage: false },
  { id: 'manipal', label: 'Manipal University Jaipur', secondaryLabel: 'Dehmi Kalan (outer area)', position: { lat: 26.8435, lng: 75.5655 }, kind: 'CAMPUS', womenOnlyCoverage: false },
];

/** Shown before the user types. */
export const popularLocationIds = ['mnit', 'jaipur-jn', 'airport', 'wtp', 'hawa-mahal', 'vaishali'];

export function findLocation(id: string): LocationSuggestion | undefined {
  return jaipurLocations.find((l) => l.id === id);
}
