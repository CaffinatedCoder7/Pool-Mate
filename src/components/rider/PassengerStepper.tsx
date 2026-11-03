import { Minus, Plus } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { IconButton } from '@/components/ui';

interface PassengerStepperProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
  hint?: string;
  error?: string;
}

export function PassengerStepper({ value, onChange, max, hint, error }: PassengerStepperProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p id="passengers-label" className="text-body font-medium text-ink">
            Passengers
          </p>
          {hint && <p className="mt-0.5 text-caption text-ink-secondary">{hint}</p>}
        </div>
        <div role="group" aria-labelledby="passengers-label" className="flex items-center gap-3">
          <IconButton icon={Minus} label="Remove a passenger" variant="secondary" size="sm" disabled={value <= 1} onClick={() => onChange(value - 1)} />
          <span className="w-6 text-center text-heading tabular-nums" aria-live="polite">
            {value}
          </span>
          <IconButton icon={Plus} label="Add a passenger" variant="secondary" size="sm" disabled={value >= max} onClick={() => onChange(value + 1)} />
        </div>
      </div>
      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-caption font-medium text-ink">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
