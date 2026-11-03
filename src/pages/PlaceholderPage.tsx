import type { LucideIcon } from 'lucide-react';
import { Page, PageHeader } from '@/components/layout/Page';
import { Card, EmptyState } from '@/components/ui';

interface PlaceholderPageProps {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  /** What this screen will contain once built. */
  upcoming: string;
}

/** Routed stand-in for screens scheduled in later implementation chunks. */
export function PlaceholderPage({ title, eyebrow, description, icon, upcoming }: PlaceholderPageProps) {
  return (
    <Page>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Card padding="none">
        <EmptyState icon={icon} title="Coming in a later build phase" description={upcoming} />
      </Card>
    </Page>
  );
}
