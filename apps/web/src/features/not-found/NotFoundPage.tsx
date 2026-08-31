import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageContainer, PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';

/**
 * Catch-all for unmatched routes. Keeps the bad URL in the address bar and
 * history so the user can see what failed, and offers a way back.
 */
export function NotFoundPage() {
  const location = useLocation();
  const path = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    const previous = document.title;
    document.title = 'Page not found · DockSight';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <PageContainer className="max-w-2xl">
      <PageHeader
        title="Page not found"
        description={
          <>
            No page matches{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-foreground">
              {path}
            </code>
            . Check the URL or return to the dashboard.
          </>
        }
      />
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </PageContainer>
  );
}
