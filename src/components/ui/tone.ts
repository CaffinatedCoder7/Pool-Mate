import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';

/**
 * Status tones. The palette is monochrome, so tones differ by icon, label and
 * border weight — never by colour alone.
 */
export type Tone = 'info' | 'success' | 'warning' | 'error';

export const toneIcons: Record<Tone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export const toneLabels: Record<Tone, string> = {
  info: 'Information',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
};
