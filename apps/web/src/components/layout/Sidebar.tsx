import { NavLink } from 'react-router-dom';
import {
  Boxes,
  Container,
  Gauge,
  HardDrive,
  LayoutDashboard,
  Moon,
  Network,
  Server,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { Badge, MockBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { initialsFor } from '@/lib/format';
import { APP_VERSION } from '@/lib/mock';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/lib/utils';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Screen has no backing endpoint yet. */
  mock?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/hosts', label: 'Hosts', icon: Server },
  { to: '/containers', label: 'Containers', icon: Container },
  { to: '/images', label: 'Images', icon: Boxes, mock: true },
  { to: '/networks', label: 'Networks', icon: Network, mock: true },
  { to: '/volumes', label: 'Volumes', icon: HardDrive, mock: true },
  { to: '/metrics', label: 'Metrics', icon: Gauge, mock: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {mobileOpen ? (
        <div
          className="animate-overlay-in fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-5">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <img
              src="/docksight.png"
              alt="DockSight"
              width={30}
              height={30}
              className="h-15 w-15"
            />
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Platform
          </p>
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-foreground',
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.mock ? <MockBadge /> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <SidebarFooter />
      </aside>
    </>
  );
}

function SidebarFooter() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="shrink-0 border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initialsFor(user?.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user?.email ?? 'Signed out'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.role === 'ADMIN' ? 'Administrator' : 'Viewer'}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">Theme</span>
        <button
          type="button"
          role="switch"
          aria-checked={theme === 'dark'}
          aria-label="Toggle dark theme"
          onClick={toggleTheme}
          className="relative inline-flex h-6 w-11 items-center rounded-full border border-border bg-secondary transition-colors"
        >
          <span
            className={cn(
              'flex h-4.5 w-4.5 items-center justify-center rounded-full bg-card shadow-sm transition-transform duration-200',
              theme === 'dark' ? 'translate-x-6' : 'translate-x-1',
            )}
          >
            {theme === 'dark' ? (
              <Moon className="h-2.5 w-2.5 text-primary" aria-hidden />
            ) : (
              <Sun className="h-2.5 w-2.5 text-warning" aria-hidden />
            )}
          </span>
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between px-3">
        <span className="text-[11px] text-muted-foreground">Version</span>
        <Badge tone="neutral" className="font-mono text-[11px]">
          {APP_VERSION}
        </Badge>
      </div>
    </div>
  );
}
