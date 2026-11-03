import type { ReactNode } from 'react';
import { MapPlaceholder } from '@/components/map/MapPlaceholder';

interface MapPageLayoutProps {
  /** Search/results/trip panel content. */
  panel: ReactNode;
  /** Accessible name for the panel region. */
  panelLabel: string;
  /** Map slot; defaults to the blank placeholder until the real map lands. */
  map?: ReactNode;
}

/**
 * Map + panel layout.
 * - Mobile: map on top, panel as a bottom sheet overlapping the map edge.
 * - Tablet (md): side-by-side split with a narrower panel.
 * - Desktop (lg): fixed-width panel on the left, map fills the rest.
 */
export function MapPageLayout({ panel, panelLabel, map }: MapPageLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className="h-[40vh] shrink-0 md:order-2 md:h-auto md:min-w-0 md:flex-1">{map ?? <MapPlaceholder />}</div>

      <section
        aria-label={panelLabel}
        className="relative z-10 -mt-5 flex min-h-0 flex-1 flex-col rounded-t-sheet border-t border-line bg-surface shadow-sheet md:order-1 md:mt-0 md:w-[22rem] md:flex-none md:rounded-none md:border-r md:border-t-0 md:shadow-none lg:w-panel"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6 lg:px-6">{panel}</div>
      </section>
    </div>
  );
}
