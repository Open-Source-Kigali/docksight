import { useEffect, useMemo, useState } from 'react';
import { Cpu, MemoryStick } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout/AppShell';
import { ContainerMetrics } from '@/components/ContainerMetrics';
import { HostSelect } from '@/components/HostSelect';
import { StatTile } from '@/components/StatTile';
import { Sparkline } from '@/components/charts/Sparkline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MockBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { EmptyHosts, ErrorNotice } from '@/features/dashboard/DashboardPage';
import { useContainers } from '@/hooks/useContainers';
import { useHostMetrics, HOST_METRICS_POLL_MS } from '@/hooks/useHostMetrics';
import { useHosts } from '@/hooks/useHosts';
import { formatBytes } from '@/lib/format';
import { mockContainerMetrics } from '@/lib/mock';
import { cn } from '@/lib/utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function MetricsPage() {
  useDocumentTitle('Metrics');

  const hostsQuery = useHosts();
  const hosts = useMemo(() => hostsQuery.data ?? [], [hostsQuery.data]);
  const [hostId, setHostId] = useState<string | undefined>();

  useEffect(() => {
    if (hosts.length === 0) {
      setHostId(undefined);
      return;
    }
    if (!hostId || !hosts.some((host) => host.id === hostId)) {
      setHostId(hosts[0].id);
    }
  }, [hosts, hostId]);

  const containersQuery = useContainers(hostId);
  const containers = containersQuery.data?.containers ?? [];
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(
    null,
  );

  const selected =
    containers.find((entry) => entry.id === selectedContainerId) ??
    containers[0] ??
    null;

  const { resources } = useHostMetrics(hostId);

  return (
    <PageContainer>
      <PageHeader
        title="Metrics"
        description="Resource usage per host and per container."
        actions={
          hosts.length > 0 ? (
            <HostSelect hosts={hosts} value={hostId} onChange={setHostId} />
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/5 px-4 py-2.5 text-sm text-warning">
        <MockBadge label="Mock" />
        <span>
          Host CPU and memory are live over{' '}
          <code className="font-mono">metrics.host</code>. Per-container charts
          are still placeholder data — the agent protocol has no{' '}
          <code className="font-mono">container.stats</code> message yet.
        </span>
      </div>

      {hostsQuery.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : hostsQuery.isError ? (
        <ErrorNotice error={hostsQuery.error} label="hosts" />
      ) : hosts.length === 0 ? (
        <EmptyHosts />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Host CPU"
              value={
                resources.hasData ? `${Math.round(resources.cpuPercent)}%` : '—'
              }
              hint={
                resources.hasData
                  ? `${resources.cpuCores} cores`
                  : 'Awaiting agent sample'
              }
              icon={Cpu}
              chart={<Sparkline values={resources.cpuSeries} />}
            />
            <StatTile
              label="Host memory"
              value={
                resources.hasData
                  ? `${Math.round(resources.memoryPercent)}%`
                  : '—'
              }
              hint={
                resources.hasData
                  ? `${formatBytes(resources.memoryUsedBytes)} of ${formatBytes(resources.memoryTotalBytes)}`
                  : 'Awaiting agent sample'
              }
              icon={MemoryStick}
              chart={
                <Sparkline
                  values={resources.memorySeries}
                  color="var(--series-2)"
                />
              }
            />
            <StatTile
              label="Containers"
              value={containers.length}
              hint={`${containers.filter((entry) => entry.state === 'running').length} running`}
            />
            <StatTile
              label="Sampling"
              value={`${HOST_METRICS_POLL_MS / 1000}s`}
              hint="Agent push interval"
            />
          </div>

          {containers.length === 0 ? (
            <EmptyState
              illustration="containers"
              title="No containers on this host"
              description="Container metrics are charted per container."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-sm">Containers</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[28rem] space-y-1 overflow-y-auto p-2">
                  {containers.map((entry) => {
                    const active = entry.id === selected?.id;
                    const metrics = mockContainerMetrics(entry.id, 12);
                    return (
                      <Button
                        key={entry.id}
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedContainerId(entry.id)}
                        className={cn(
                          'h-auto w-full justify-start gap-2 px-2.5 py-2 text-left',
                          active && 'bg-primary/10 text-primary',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {entry.name.replace(/^\//, '')}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {Math.round(metrics.cpuPercent)}% CPU ·{' '}
                            {formatBytes(metrics.memoryUsedBytes)}
                          </span>
                        </span>
                        <span className="w-14 shrink-0">
                          <Sparkline
                            values={metrics.cpuSeries}
                            height={18}
                            color={
                              active
                                ? 'var(--primary)'
                                : 'var(--muted-foreground)'
                            }
                          />
                        </span>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              {selected ? (
                <ContainerMetrics
                  containerId={selected.id}
                  containerName={selected.name.replace(/^\//, '')}
                />
              ) : null}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
