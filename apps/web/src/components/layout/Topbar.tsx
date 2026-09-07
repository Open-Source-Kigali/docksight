import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Server,
  Settings,
  UserRound,
} from 'lucide-react';
import { Badge, MockBadge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from '@/components/ui/dropdown';
import { useHosts } from '@/hooks/useHosts';
import { hostDisplayName } from '@/lib/host-name';
import { MOCK_NOTIFICATIONS, MOCK_WORKSPACE } from '@/lib/mock';
import { initialsFor } from '@/lib/format';
import { statusTone } from '@/lib/status';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md sm:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </Button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <WorkspaceSwitcher />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}

/** Searches the live `/hosts` response; container search lives on each host. */
function GlobalSearch() {
  const navigate = useNavigate();
  const hostsQuery = useHosts();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return [];
    }
    return (hostsQuery.data ?? [])
      .filter(
        (host) =>
          hostDisplayName(host).toLowerCase().includes(value) ||
          host.hostname.toLowerCase().includes(value) ||
          host.os.toLowerCase().includes(value) ||
          host.uuid.toLowerCase().includes(value),
      )
      .slice(0, 6);
  }, [hostsQuery.data, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        placeholder="Search hosts…"
        aria-label="Search hosts"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
        ⌘K
      </kbd>

      {open && query.trim() ? (
        <div className="animate-pop-in absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No host matches “{query}”.
            </p>
          ) : (
            results.map((host) => (
              <button
                key={host.id}
                type="button"
                onClick={() => {
                  navigate(`/hosts/${host.id}`);
                  setQuery('');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent"
              >
                <Server className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {hostDisplayName(host)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {host.hostname} · {host.os} · {host.architecture}
                  </span>
                </span>
                <StatusDot tone={statusTone(host.status)} />
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceSwitcher() {
  const [current, setCurrent] = useState(MOCK_WORKSPACE.name);

  return (
    <Dropdown
      className="hidden sm:block"
      trigger={({ toggle, ...aria }) => (
        <button
          type="button"
          onClick={toggle}
          {...aria}
          className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
            {current.slice(0, 1)}
          </span>
          <span className="max-w-[9rem] truncate">{current}</span>
          <ChevronDown
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden
          />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Workspaces</DropdownLabel>
          {MOCK_WORKSPACE.workspaces.map((workspace) => (
            <DropdownItem
              key={workspace}
              icon={
                workspace === current ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <span className="block h-3.5 w-3.5" />
                )
              }
              onSelect={() => {
                setCurrent(workspace);
                close();
              }}
            >
              {workspace}
            </DropdownItem>
          ))}
          <DropdownSeparator />
          <div className="px-2.5 py-1.5">
            <MockBadge
              label="Mock workspaces"
              title="Multi-workspace support is not implemented on the server yet"
            />
          </div>
        </>
      )}
    </Dropdown>
  );
}

function NotificationsMenu() {
  return (
    <Dropdown
      menuClassName="w-80"
      trigger={({ toggle, ...aria }) => (
        <button
          type="button"
          onClick={toggle}
          {...aria}
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-4.5 w-4.5" aria-hidden />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-card bg-danger" />
        </button>
      )}
    >
      {() => (
        <>
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <DropdownLabel>Notifications</DropdownLabel>
            <MockBadge title="No notifications endpoint yet" />
          </div>
          <DropdownSeparator />
          <div className="max-h-80 overflow-y-auto">
            {MOCK_NOTIFICATIONS.map((notification) => (
              <div
                key={notification.id}
                className="flex gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-accent"
              >
                <StatusDot tone={notification.tone} className="mt-1.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.body}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {notification.at}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Dropdown>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <Dropdown
      trigger={({ toggle, open, ...aria }) => (
        <button
          type="button"
          onClick={toggle}
          {...aria}
          aria-label="Account menu"
          className={cn(
            'flex h-9 items-center gap-2 rounded-md pl-1 pr-2 transition-colors hover:bg-accent',
            open && 'bg-accent',
          )}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
            {initialsFor(user?.email)}
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden
          />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <Badge
              tone={user?.role === 'ADMIN' ? 'primary' : 'neutral'}
              className="mt-1.5"
            >
              {user?.role ?? 'UNKNOWN'}
            </Badge>
          </div>
          <DropdownSeparator />
          <DropdownItem icon={<UserRound className="h-4 w-4" />} disabled>
            Profile
          </DropdownItem>
          <DropdownItem
            icon={<Settings className="h-4 w-4" />}
            onSelect={() => {
              navigate('/settings');
              close();
            }}
          >
            Settings
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            icon={<LogOut className="h-4 w-4" />}
            destructive
            onSelect={() => {
              close();
              signOut();
              navigate('/login', { replace: true });
            }}
          >
            Sign out
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}
