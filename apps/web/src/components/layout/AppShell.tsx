import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { RouteErrorBoundary } from '@/components/ErrorBoundary';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setMobileNavOpen(true)} />
        {/* Page-level boundary: sidebar and topbar stay usable after a render error. */}
        <main className="flex-1">
          <RouteErrorBoundary>{children}</RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6 lg:mb-8', className)}>
      {breadcrumb ? <div className="mb-2">{breadcrumb}</div> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-section font-semibold tracking-tight lg:text-page">
            {title}
          </h1>
          {description ? (
            <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-heading font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
