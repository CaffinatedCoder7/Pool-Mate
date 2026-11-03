import type { EmergencyContact, SafetyReport, SafetyReportCategory, UserRole } from '@/types/domain';

export interface SubmitReportInput {
  category: SafetyReportCategory;
  message: string;
  role: UserRole;
  bookingId?: string;
}

/**
 * Safety boundary. Everything here is a local demo: no emergency service,
 * contact or operator is ever reached, and nothing leaves the browser.
 */
export interface SafetyService {
  listEmergencyContacts(): Promise<EmergencyContact[]>;
  listReports(role?: UserRole): Promise<SafetyReport[]>;
  submitReport(input: SubmitReportInput): Promise<SafetyReport>;
  /** Records a demo SOS as a report so the action leaves a visible trace. */
  recordSosDrill(role: UserRole, bookingId?: string): Promise<SafetyReport>;
  clearReports(): Promise<void>;
}
