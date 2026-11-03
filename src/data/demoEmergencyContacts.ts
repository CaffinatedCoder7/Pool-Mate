import type { EmergencyContact } from '@/types/domain';

/**
 * Sample contacts only. Numbers are masked placeholders and are never dialled
 * or messaged — this prototype cannot contact anyone.
 */
export const demoEmergencyContacts: EmergencyContact[] = [
  { id: 'ec-1', name: 'Demo contact · Asha', relationship: 'Family', phoneMasked: '+91 ••••• ••210', demo: true },
  { id: 'ec-2', name: 'Demo contact · Vikram', relationship: 'Friend', phoneMasked: '+91 ••••• ••884', demo: true },
];
