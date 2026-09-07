import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  Activity,
  Boxes,
  ChevronRight,
  Container as ContainerIcon,
  Cpu,
  Gauge,
  HardDrive,
  LayoutDashboard,
  MemoryStick,
  Network,
  PlugZap,
  RefreshCw,
  ScrollText,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout/AppShell';
import { ContainerInspectDrawer } from '@/components/ContainerInspectDrawer';
import { ContainerLogsDrawer } from '@/components/ContainerLogsDrawer';
import { ContainerMetrics } from '@/components/ContainerMetrics';
import { ContainerTable, type ContainerRow } from '@/components/ContainerTable';
import { LogsViewer } from '@/components/LogsViewer';
import { OsIcon } from '@/components/OsIcon';
import { StatTile } from '@/components/StatTile';
import { StatusBadge } from '@/components/StatusBadge';
import { Meter, Sparkline } from '@/components/charts/Sparkline';
import { MockBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataList } from '@/components/ui/data-list';
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
} from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { ErrorNotice } from '@/features/dashboard/DashboardPage';
import {
  ImagesTable,
  NetworksTable,
  VolumesTable,
} from '@/features/inventory/InventoryTables';
import { useContainerCommands } from '@/hooks/useContainerCommands';
import { useContainers } from '@/hooks/useContainers';
import { useHostMetrics } from '@/hooks/useHostMetrics';
import { useHosts } from '@/hooks/useHosts';
import { useIsAdmin } from '@/stores/auth';
import {
  formatBytes,
  formatDateTime,
  formatRelativeTime,
  osLabel,
} from '@/lib/format';
import { hostDisplayName } from '@/lib/host-name';
import type { HostResources } from '@/lib/metrics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type TabKey =
  | 'overview'
  | 'containers'
  | 'images'
  | 'networks'
  | 'volumes'
  | 'logs'
  | 'metrics';

const TAB_KEYS: TabKey[] = [
  'overview',
  'containers',
  'images',
  'networks',
  'volumes',
  'logs',
  'metrics',
];

export function HostDetailsPage() {
  const { hostId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const hostsQuery = useHosts();
  const host = hostsQuery.data?.find((entry) => entry.id === hostId);
  const hostLabel = host ? hostDisplayName(host) : undefined;
  useDocumentTitle(
    hostLabel ?? (hostsQuery.isLoading ? 'Host' : 'Host not found'),
  );
  const containersQuery = useContainers(hostId);
  const containers = containersQuery.data?.containers ?? [];
  const { resources } = useHostMetrics(hostId);

  const [inspecting, setInspecting] = useState<ContainerRow | null>(null);
  const [viewingLogs, setViewingLogs] = useState<ContainerRow | null>(null);
  const commands = useContainerCommands(hostId, () => {
    void containersQuery.refetch();
  });
  const isAdmin = useIsAdmin();

  const tabParam = searchParams.get('tab') as TabKey | null;
  const tab: TabKey =
    tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'overview';

  const runningCount = containers.filter(
    (container) => container.state?.toLowerCase() === 'running',
  ).length;

  const tabs: Array<TabItem<TabKey>> = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      key: 'containers',
      label: 'Containers',
      icon: ContainerIcon,
      count: containers.length,
    },
    { key: 'images', label: 'Images', icon: Boxes, badge: <MockBadge /> },
    { key: 'networks', label: 'Networks', icon: Network, badge: <MockBadge /> },
    { key: 'volumes', label: 'Volumes', icon: HardDrive, badge: <MockBadge /> },
    { key: 'logs', label: 'Logs', icon: ScrollText },
    { key: 'metrics', label: 'Metrics', icon: Gauge, badge: <MockBadge /> },
  ];

  if (hostsQuery.isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-28 w-full rounded-lg" />
        <div className="mt-6">
          <TableSkeleton />
        </div>
      </PageContainer>
    );
  }

  if (hostsQuery.isError) {
    return (
      <PageContainer>
        <ErrorNotice error={hostsQuery.error} label="hosts" />
      </PageContainer>
    );
  }

  if (!host) {
    return (
      <PageContainer>
        <EmptyState
          illustration="hosts"
          title="Host not found"
          description="This host is no longer registered with the DockSight server."
          action={
            <Button type="button" onClick={() => navigate('/hosts')}>
              Back to hosts
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const refreshing = hostsQuery.isFetching || containersQuery.isFetching;
  const label = hostDisplayName(host);

  return (
    <PageContainer>
      <PageHeader
        breadcrumb={
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link
              to="/hosts"
              className="transition-colors hover:text-foreground"
            >
              Hosts
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-foreground">{label}</span>
          </nav>
        }
        title={
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
              <OsIcon os={host.os} className="h-5 w-5" />
            </span>
            {label}
            <StatusBadge status={host.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[13px]">
            <span>{host.hostname}</span>
            <Dot />
            <span>{osLabel(host.os)}</span>
            <Dot />
            <span>{host.architecture}</span>
            <Dot />
            <span>Docker {host.version}</span>
            <Dot />
            <span title={formatDateTime(host.lastSeen)}>
              Last seen {formatRelativeTime(host.lastSeen)}
            </span>
          </span>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void hostsQuery.refetch();
                void containersQuery.refetch();
              }}
              disabled={refreshing}
            >
              <RefreshCw
                className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                aria-hidden
              />
              Refresh
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled
              title="No agent-disconnect endpoint on the server yet"
            >
              <PlugZap className="h-4 w-4" aria-hidden />
              Disconnect
            </Button>
          </>
        }
      />

      <Tabs
        items={tabs}
        value={tab}
        onChange={(next) => setSearchParams({ tab: next }, { replace: true })}
        className="mb-6"
      />

      {tab === 'overview' ? (
        <OverviewTab
          host={host}
          containerCount={containers.length}
          runningCount={runningCount}
          resources={resources}
          updatedAt={containersQuery.data?.updatedAt ?? null}
          onOpenContainers={() =>
            setSearchParams({ tab: 'containers' }, { replace: true })
          }
        />
      ) : null}

      {tab === 'containers' ? (
        containersQuery.isLoading ? (
          <TableSkeleton />
        ) : containersQuery.isError ? (
          <ErrorNotice error={containersQuery.error} label="containers" />
        ) : (
          <ContainerTable
            containers={containers}
            canManage={isAdmin}
            busyKey={commands.busyKey}
            onAction={commands.run}
            onInspect={setInspecting}
            onViewLogs={setViewingLogs}
            emptyDescription={`${label} has no containers. Anything the Docker daemon reports will appear here within 20 seconds.`}
          />
        )
      ) : null}

      {tab === 'images' ? <ImagesTable hostId={host.id} /> : null}
      {tab === 'networks' ? <NetworksTable hostId={host.id} /> : null}
      {tab === 'volumes' ? <VolumesTable hostId={host.id} /> : null}

      {tab === 'logs' ? (
        <LogsTab hostId={host.id} containers={containers} />
      ) : null}

      {tab === 'metrics' ? (
        <MetricsTab
          hostId={host.id}
          containers={containers}
          resources={resources}
        />
      ) : null}

      {inspecting ? (
        <ContainerInspectDrawer
          hostId={host.id}
          container={inspecting}
          canManage={isAdmin}
          busyKey={commands.busyKey}
          onAction={commands.run}
          onViewLogs={(container) => {
            setInspecting(null);
            setViewingLogs(container);
          }}
          onClose={() => setInspecting(null)}
        />
      ) : null}

      {viewingLogs ? (
        <ContainerLogsDrawer
          hostId={host.id}
          container={viewingLogs}
          onClose={() => setViewingLogs(null)}
        />
      ) : null}
    </PageContainer>
  );
}

function OverviewTab({
  host,
  containerCount,
  runningCount,
  resources,
  updatedAt,
  onOpenContainers,
}: {
  host: NonNullable<ReturnType<typeof useHosts>['data']>[number];
  containerCount: number;
  runningCount: number;
  resources: HostResources;
  updatedAt: string | null;
  onOpenContainers: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Containers"
          value={containerCount}
          hint={`${runningCount} running`}
          icon={ContainerIcon}
        />
        <StatTile
          label="Running"
          value={runningCount}
          hint={`${containerCount - runningCount} stopped or exited`}
          icon={Activity}
          tone="success"
        />
        <StatTile
          label="CPU"
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
          label="Memory"
          value={
            resources.hasData ? formatBytes(resources.memoryUsedBytes) : '—'
          }
          hint={
            resources.hasData
              ? `of ${formatBytes(resources.memoryTotalBytes)}`
              : 'Awaiting agent sample'
          }
          icon={MemoryStick}
          chart={<Sparkline values={resources.memorySeries} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Host details</CardTitle>
          </CardHeader>
          <CardContent>
            <DataList
              items={[
                { label: 'Display name', value: hostDisplayName(host) },
                { label: 'Hostname', value: host.hostname },
                {
                  label: 'Agent UUID',
                  value: host.uuid,
                  mono: true,
                  copy: host.uuid,
                },
                { label: 'Operating system', value: osLabel(host.os) },
                { label: 'Architecture', value: host.architecture, mono: true },
                { label: 'Docker version', value: host.version, mono: true },
                {
                  label: 'Connection',
                  value: <StatusBadge status={host.status} />,
                },
                { label: 'Last seen', value: formatDateTime(host.lastSeen) },
                {
                  label: 'Inventory updated',
                  value: updatedAt ? formatRelativeTime(updatedAt) : 'Not yet',
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {resources.hasData ? (
              <>
                <Meter
                  label={`CPU · ${resources.cpuCores} cores`}
                  value={resources.cpuPercent}
                />
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Memory
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatBytes(resources.memoryUsedBytes)} /{' '}
                      {formatBytes(resources.memoryTotalBytes)}
                    </span>
                  </div>
                  <Meter value={resources.memoryPercent} />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {resources.loadAvg
                    ? `Load average ${resources.loadAvg.map((entry) => entry.toFixed(2)).join(' · ')} — `
                    : ''}
                  sampled {formatRelativeTime(resources.collectedAt)}.
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                No sample yet. A connected agent pushes{' '}
                <code className="font-mono">metrics.host</code> every 10
                seconds.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onOpenContainers}
            >
              <ContainerIcon className="h-3.5 w-3.5" aria-hidden />
              View containers
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LogsTab({
  hostId,
  containers,
}: {
  hostId: string;
  containers: ContainerRow[];
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  useEffect(() => {
    if (containers.length === 0) {
      setSelectedId(undefined);
      return;
    }
    if (!selectedId || !containers.some((entry) => entry.id === selectedId)) {
      const running = containers.find(
        (entry) => entry.state?.toLowerCase() === 'running',
      );
      setSelectedId((running ?? containers[0]).id);
    }
  }, [containers, selectedId]);

  const selected = useMemo(
    () => containers.find((entry) => entry.id === selectedId),
    [containers, selectedId],
  );

  if (containers.length === 0) {
    return (
      <EmptyState
        illustration="logs"
        title="No containers to stream"
        description="Log streaming attaches to a running container on this host."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Dropdown
          align="start"
          trigger={({ toggle, ...aria }) => (
            <button
              type="button"
              onClick={toggle}
              {...aria}
              className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <ContainerIcon
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <span className="max-w-[16rem] truncate">
                {selected?.name.replace(/^\//, '') ?? 'Select container'}
              </span>
            </button>
          )}
        >
          {({ close }) => (
            <>
              <DropdownLabel>Containers</DropdownLabel>
              <div className="max-h-72 overflow-y-auto">
                {containers.map((entry) => (
                  <DropdownItem
                    key={entry.id}
                    onSelect={() => {
                      setSelectedId(entry.id);
                      close();
                    }}
                  >
                    {entry.name.replace(/^\//, '')}
                  </DropdownItem>
                ))}
              </div>
            </>
          )}
        </Dropdown>
        <p className="text-xs text-muted-foreground">
          Live stream over{' '}
          <code className="font-mono">GET /containers/:id/logs</code> (SSE).
        </p>
      </div>

      {selected ? (
        <LogsViewer
          key={selected.id}
          hostId={hostId}
          containerId={selected.id}
          containerName={selected.name}
          className="h-[32rem]"
          fill
        />
      ) : null}
    </div>
  );
}

function MetricsTab({
  containers,
  resources,
}: {
  hostId: string;
  containers: ContainerRow[];
  resources: HostResources;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  // The container list arrives after first render, so fall back to the first
  // row until the user picks one.
  const selected =
    containers.find((entry) => entry.id === selectedId) ?? containers[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Host CPU</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold tabular-nums">
              {resources.hasData ? `${Math.round(resources.cpuPercent)}%` : '—'}
            </p>
            <Sparkline values={resources.cpuSeries} height={56} />
            <p className="text-xs text-muted-foreground">
              {resources.hasData
                ? `${resources.cpuCores} cores · sampled ${formatRelativeTime(resources.collectedAt)}`
                : 'Awaiting the first agent sample'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Host memory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold tabular-nums">
              {resources.hasData
                ? `${Math.round(resources.memoryPercent)}%`
                : '—'}
            </p>
            <Sparkline
              values={resources.memorySeries}
              height={56}
              color="var(--series-2)"
            />
            <p className="text-xs text-muted-foreground">
              {resources.hasData
                ? `${formatBytes(resources.memoryUsedBytes)} of ${formatBytes(resources.memoryTotalBytes)}`
                : 'Awaiting the first agent sample'}
            </p>
          </CardContent>
        </Card>
      </div>

      {containers.length === 0 ? (
        <EmptyState
          illustration="containers"
          title="No containers to chart"
          description="Container metrics are per-container; this host reports none."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown
              align="start"
              trigger={({ toggle, ...aria }) => (
                <button
                  type="button"
                  onClick={toggle}
                  {...aria}
                  className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <ContainerIcon
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="max-w-[16rem] truncate">
                    {selected?.name.replace(/^\//, '') ?? 'Select container'}
                  </span>
                </button>
              )}
            >
              {({ close }) => (
                <>
                  <DropdownLabel>Containers</DropdownLabel>
                  <div className="max-h-72 overflow-y-auto">
                    {containers.map((entry) => (
                      <DropdownItem
                        key={entry.id}
                        onSelect={() => {
                          setSelectedId(entry.id);
                          close();
                        }}
                      >
                        {entry.name.replace(/^\//, '')}
                      </DropdownItem>
                    ))}
                  </div>
                </>
              )}
            </Dropdown>
          </div>

          {selected ? (
            <ContainerMetrics
              containerId={selected.id}
              containerName={selected.name.replace(/^\//, '')}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function Dot() {
  return <span className="text-border">·</span>;
}
