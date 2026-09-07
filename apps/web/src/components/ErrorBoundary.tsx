import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/features/dashboard/DashboardPage';

type ErrorBoundaryProps = {
  children: ReactNode;
  /** When this value changes, a previously caught error is cleared. */
  resetKey?: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Catches render errors so one bad page does not unmount the whole tree.
 * Class component on purpose: getDerivedStateFromError / componentDidCatch
 * are not available on function components.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the stack reachable while developing; production stays quiet.
    if (import.meta.env.DEV) {
      console.error('Render error caught by ErrorBoundary', error, info);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-10">
          <ErrorNotice error={this.state.error} label="this page" />
          <p className="text-sm text-muted-foreground">
            Something went wrong while rendering. You can try again, reload the
            app, or return to the dashboard.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={this.handleRetry}>
              Try again
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={this.handleReload}
            >
              Reload
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Resets the boundary when the route changes so navigating away from a
 * broken page clears the fallback instead of trapping the user on it.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}${location.hash}`;
  return <ErrorBoundary resetKey={resetKey}>{children}</ErrorBoundary>;
}
