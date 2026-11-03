import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Toaster, type ToastItem } from '@/components/ui/Toaster';
import type { Tone } from '@/components/ui/tone';

export interface NotifyInput {
  title: string;
  description?: string;
  tone?: Tone;
  /** Auto-dismiss delay; 0 keeps the toast until dismissed. */
  durationMs?: number;
}

interface NotificationContextValue {
  notify: (input: NotifyInput) => string;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const MAX_VISIBLE = 3;
let counter = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(({ title, description, tone = 'info', durationMs = 5000 }: NotifyInput) => {
    const id = `toast-${++counter}`;
    setToasts((current) => [...current, { id, title, description, tone, durationMs }].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used within NotificationProvider');
  return ctx;
}
