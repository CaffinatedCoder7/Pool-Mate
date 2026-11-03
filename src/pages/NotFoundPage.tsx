import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '@/components/layout/Page';
import { Button, EmptyState } from '@/components/ui';
import { paths } from '@/routes/paths';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Page>
      <EmptyState
        className="py-20"
        icon={Compass}
        title="Page not found"
        description="This address doesn't lead anywhere in PoolMate."
        action={<Button onClick={() => navigate(paths.root)}>Back to home</Button>}
      />
    </Page>
  );
}
