import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface MapPlaceholderProps {
  title?: string;
  description?: string;
  /**
   * `fill` — edge-to-edge, fills its parent (map pages).
   * `inset` — rounded, bordered block with a fixed minimum height (inside cards).
   */
  variant?: 'fill' | 'inset';
  /** Overlay slot (e.g. future map controls or legend). */
  children?: ReactNode;
  className?: string;
}

/**
 * Blank, neutral stand-in for the interactive map.
 *
 * Intentionally contains no map library, tiles, markers, routes or GPS. A real
 * <RideMap> will replace this component behind the same layout slot, so it
 * reserves space up front to avoid layout shift later.
 */
export function MapPlaceholder({
  title = 'Map preview',
  description = 'The interactive map will appear here.',
  variant = 'fill',
  children,
  className,
}: MapPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`${title}. ${description}`}
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden bg-surface-sunken',
        variant === 'fill' ? 'min-h-[240px]' : 'min-h-[220px] rounded-lg border border-line',
        className,
      )}
    >
      <div className="flex flex-col items-center px-6 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface shadow-xs">
          <MapPin className="h-5 w-5 text-ink-tertiary" aria-hidden />
        </span>
        <p className="mt-3 text-body-sm font-medium text-ink-secondary">{title}</p>
        <p className="mt-0.5 max-w-xs text-caption text-ink-tertiary">{description}</p>
      </div>
      {children}
    </div>
  );
}
