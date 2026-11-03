import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Standard scrollable content page with consistent gutters and max width. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-page px-4 py-6 sm:px-6 lg:px-10 lg:py-10', className)}>{children}</div>;
}

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-micro uppercase text-ink-tertiary">{eyebrow}</p>}
        <h1 className="text-title sm:text-title-lg">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-body text-ink-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
