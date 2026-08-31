import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout/AppShell';
import { EmptyHosts, ErrorNotice } from '@/features/dashboard/DashboardPage';
import { HostCard } from '@/components/HostCard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/input';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { FilterChips } from '@/components/ui/tabs';
import { StatusDot } from '@/components/ui/badge';
import { useHostInventory } from '@/hooks/useHostInventory';
import { useHosts } from '@/hooks/useHosts';
import { hostDisplayName } from '@/lib/host-name';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type HostFilter = 'all' | 'online' | 'offline';

export function HostsPage() {
  useDocumentTitle('Hosts');

  const hostsQuery = useHosts();
  const hosts = useMemo(() => hostsQuery.data ?? [], [hostsQuery.data]);
  const inventory = useHostInventory(hosts);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HostFilter>('all');

  const counts = useMemo(
    () => ({
      online: hosts.filter((host) => host.status === 'ONLINE').length,
      offline: hosts.filter((host) => host.status !== 'ONLINE').length,
    }),
    [hosts],
  );

  const filtered = hosts.filter((host) => {
    if (filter === 'online' && host.status !== 'ONLINE') {
      return false;
    }
    if (filter === 'offline' && host.status === 'ONLINE') {
      return false;
    }
    const value = query.trim().toLowerCase();
    if (!value) {
      return true;
    }
    return (
      hostDisplayName(host).toLowerCase().includes(value) ||
      host.hostname.toLowerCase().includes(value) ||
      host.os.toLowerCase().includes(value) ||
      host.architecture.toLowerCase().includes(value) ||
      host.version.toLowerCase().includes(value)
    );
  });

  const refreshing = hostsQuery.isFetching || inventory.isFetching;

  return (
    <PageContainer>
      <PageHeader
        title="Hosts"
        description="Every Docker host with a registered DockSight agent."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void hostsQuery.refetch();
              inventory.refetchAll();
            }}
            disabled={refreshing}
          >
            <RefreshCw
              className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
              aria-hidden
            />
            Refresh
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search hostname, OS or Docker version…"
          className="w-full lg:max-w-sm"
        />
        <FilterChips
          value={filter}
          onChange={setFilter}
          items={[
            { key: 'all', label: 'All', count: hosts.length },
            {
              key: 'online',
              label: 'Online',
              count: counts.online,
              dot: <StatusDot tone="success" />,
            },
            {
              key: 'offline',
              label: 'Offline',
              count: counts.offline,
              dot: <StatusDot tone="danger" />,
            },
          ]}
        />
      </div>

      {hostsQuery.isLoading ? (
        <CardGridSkeleton count={6} />
      ) : hostsQuery.isError ? (
        <ErrorNotice error={hostsQuery.error} label="hosts" />
      ) : hosts.length === 0 ? (
        <EmptyHosts />
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration="search"
          title="No hosts match your filters"
          description="Try a different search term or clear the status filter."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((host) => {
            const entry = inventory.byHostId.get(host.id);
            return (
              <HostCard
                key={host.id}
                host={host}
                containerCount={entry?.total}
                runningCount={entry?.running}
                countsLoading={entry?.isLoading}
                onRefresh={() => inventory.refetchAll()}
              />
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
