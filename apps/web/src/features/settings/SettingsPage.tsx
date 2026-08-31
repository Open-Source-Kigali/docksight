import { LogOut, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataList } from '@/components/ui/data-list';
import { APP_VERSION } from '@/lib/mock';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/lib/utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  return raw?.trim() ? raw.replace(/\/$/, '') : 'http://localhost:3000/api';
}

export function SettingsPage() {
  useDocumentTitle('Settings');

  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title="Settings"
        description="Appearance and connection settings for this DockSight console."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The theme is stored in this browser under{' '}
              <code className="font-mono text-xs">docksight.theme</code>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['light', 'dark'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  aria-pressed={theme === option}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                    theme === option
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/40 hover:bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      option === 'dark'
                        ? 'bg-slate-900 text-slate-100'
                        : 'bg-amber-50 text-amber-500',
                    )}
                  >
                    {option === 'dark' ? (
                      <Moon className="h-4 w-4" aria-hidden />
                    ) : (
                      <Sun className="h-4 w-4" aria-hidden />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-medium capitalize">
                      {option}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {option === 'dark'
                        ? 'Low-light control room'
                        : 'Default DockSight surface'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <DataList
              items={[
                {
                  label: 'API base URL',
                  value: apiBaseUrl(),
                  mono: true,
                  copy: apiBaseUrl(),
                  span: true,
                },
                { label: 'Console version', value: APP_VERSION, mono: true },
                {
                  label: 'Host polling',
                  value: 'Every 15s (hosts) · 20s (containers)',
                },
                {
                  label: 'Log transport',
                  value: 'Server-sent events',
                },
              ]}
            />
            <p className="mt-4 text-xs text-muted-foreground">
              Change the API URL with the{' '}
              <code className="font-mono">VITE_API_URL</code> environment
              variable and rebuild.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataList
              items={[
                { label: 'Email', value: user?.email ?? '—' },
                {
                  label: 'Role',
                  value: (
                    <Badge
                      tone={user?.role === 'ADMIN' ? 'primary' : 'neutral'}
                    >
                      {user?.role ?? 'UNKNOWN'}
                    </Badge>
                  ),
                },
                { label: 'User ID', value: user?.id ?? '—', mono: true },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              {user?.role === 'ADMIN'
                ? 'Administrators can start, stop and restart containers.'
                : 'Viewers have read-only access; container actions require the ADMIN role.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                signOut();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
