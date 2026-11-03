import { demoEmergencyContacts } from '@/data/demoEmergencyContacts';
import { nowIso, nowMs } from '@/lib/clock';
import { delay } from '@/lib/delay';
import { storage } from '@/lib/storage';
import type { SafetyReport, UserRole } from '@/types/domain';
import type { SafetyService, SubmitReportInput } from './SafetyService';

const REPORTS_KEY = 'poolmate.demo-safety-reports.v1';
const MAX_REPORTS = 30;

const newId = () => `rep-${nowMs().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;

function readReports(): SafetyReport[] {
  return storage.get<SafetyReport[]>(REPORTS_KEY) ?? [];
}

function save(report: SafetyReport): SafetyReport {
  storage.set(REPORTS_KEY, [report, ...readReports()].slice(0, MAX_REPORTS));
  return report;
}

/** Demo safety records kept in this browser. Nothing is sent anywhere. */
export const mockSafetyService: SafetyService = {
  async listEmergencyContacts() {
    await delay(150);
    return demoEmergencyContacts;
  },

  async listReports(role?: UserRole) {
    await delay(150);
    const all = readReports();
    return role ? all.filter((r) => r.role === role) : all;
  },

  async submitReport({ category, message, role, bookingId }: SubmitReportInput) {
    await delay(500);
    const trimmed = message.trim();
    if (!trimmed) throw new Error('Please describe what happened.');
    return save({ id: newId(), category, message: trimmed, role, bookingId, createdAt: nowIso(), demo: true });
  },

  async recordSosDrill(role: UserRole, bookingId?: string) {
    await delay(400);
    return save({
      id: newId(),
      category: 'SAFETY',
      message: 'Demo SOS drill. No emergency service, contact or operator was notified.',
      role,
      bookingId,
      createdAt: nowIso(),
      demo: true,
    });
  },

  async clearReports() {
    await delay(150);
    storage.remove(REPORTS_KEY);
  },
};
