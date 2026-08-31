import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

/**
 * Route gate for everything behind a session.
 *
 * This is a UX control, not a security one — the API rejects unauthenticated
 * requests regardless of what the router renders. Its job is to avoid showing
 * a dashboard that would only fill with 401s.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const location = useLocation();

  useEffect(() => {
    if (status === 'loading') {
      void bootstrap();
    }
  }, [status, bootstrap]);

  if (status === 'loading') {
    return <SessionSplash />;
  }

  if (status === 'setup-required') {
    return <Navigate to="/setup" replace />;
  }

  if (status === 'unauthenticated') {
    // Remember the destination so login can return the user to it.
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
}

function SessionSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <img
          src="/docksight.png"
          alt="DockSight"
          width={72}
          height={72}
          className="h-48 w-48"
        />
      </div>
      <p className="text-sm text-muted-foreground">Restoring session…</p>
    </div>
  );
}
