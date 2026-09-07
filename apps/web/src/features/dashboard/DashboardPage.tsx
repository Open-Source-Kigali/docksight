import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Boxes,
  Container as ContainerIcon,
  Cpu,
  RefreshCw,
  Server,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from '@/components/layout/AppShell';
import { ContainerInspectDrawer } from '@/components/ContainerInspectDrawer';
import { ContainerLogsDrawer } from '@/components/ContainerLogsDrawer';
import { ContainerTable, type ContainerRow } from '@/components/ContainerTable';
import { HostCard } from '@/components/HostCard';
import { StatTile } from '@/components/StatTile';
import { Button } from '@/components/ui/button';
import { CardGridSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useContainerCommands } from '@/hooks/useContainerCommands';
import { useHostInventory } from '@/hooks/useHostInventory';
import { useHosts } from '@/hooks/useHosts';
import { useIsAdmin } from '@/stores/auth';
import { toHostResources } from '@/lib/metrics';
import { ApiError } from '@/services/api';
import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function DashboardPage() {
  useDocumentTitle('Dashboard');

  const navigate = useNavigate();
  const hostsQuery = useHosts();
  const hosts = hostsQuery.data ?? [];
  const inventory = useHostInventory(hosts);

  const [inspecting, setInspecting] = useState<ContainerRow | null>(null);
  const [viewingLogs, setViewingLogs] = useState<ContainerRow | null>(null);
  const commands = useContainerCommands(undefined, () =>
    inventory.refetchAll(),
  );
  const isAdmin = useIsAdmin();

  const onlineHosts = hosts.filter((host) => host.status === 'ONLINE');
  const totalContainers = inventory.all.length;
  const runningContainers = inventory.all.filter(
    (container) => container.state?.toLowerCase() === 'running',
  ).length;

  // Averaged over hosts that have actually reported; a host whose agent is
  // offline would otherwise drag the fleet number toward zero.
  const reporting = hosts
    .map((host) => toHostResources(host.metrics))
    .filter((resources) => resources.hasData);
  const fleetCpu =
    reporting.length > 0
      ? reporting.reduce(
          (total, resources) => total + resources.cpuPercent,
          0,
        ) / reporting.length
      : 0;

  const refreshing = hostsQuery.isFetching || inventory.isFetching;

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Fleet overview for every Docker host with a connected DockSight agent."
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Hosts"
          value={hostsQuery.isLoading ? '—' : hosts.length}
          hint={`${onlineHosts.length} online · ${hosts.length - onlineHosts.length} offline`}
          icon={Server}
        />
        <StatTile
          label="Containers"
          value={inventory.isLoading ? '—' : totalContainers}
          hint="Across all connected hosts"
          icon={ContainerIcon}
        />
        <StatTile
          label="Running"
          value={inventory.isLoading ? '—' : runningContainers}
          hint={`${totalContainers - runningContainers} not running`}
          icon={Activity}
          tone="success"
        />
        <StatTile
          label="Avg. host CPU"
          value={reporting.length > 0 ? `${Math.round(fleetCpu)}%` : '—'}
          hint={
            reporting.length > 0
              ? `Across ${reporting.length} reporting host${reporting.length === 1 ? '' : 's'}`
              : 'No host is reporting metrics'
          }
          icon={Cpu}
        />
      </div>

      <section className="mb-8">
        <SectionHeader
          title="Hosts"
          description="Agent connection state, inventory and resource usage."
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hosts')}
            >
              View all
            </Button>
          }
        />

        {hostsQuery.isLoading ? (
          <CardGridSkeleton />
        ) : hostsQuery.isError ? (
          <ErrorNotice error={hostsQuery.error} label="hosts" />
        ) : hosts.length === 0 ? (
          <EmptyHosts />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {hosts.slice(0, 6).map((host) => {
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
      </section>

      <section>
        <SectionHeader
          title="Containers"
          description="Every container reported by the connected agents."
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/containers')}
            >
              Open containers
            </Button>
          }
        />

        {inventory.isLoading ? (
          <TableSkeleton />
        ) : hosts.length === 0 ? (
          <EmptyState
            illustration="containers"
            title="No containers to show"
            description="Connect an agent first — container inventory is pulled live from each host."
          />
        ) : (
          <ContainerTable
            containers={inventory.all}
            showHostColumn
            canManage={isAdmin}
            busyKey={commands.busyKey}
            onAction={commands.run}
            onInspect={setInspecting}
            onViewLogs={setViewingLogs}
          />
        )}
      </section>

      {inspecting?.hostId ? (
        <ContainerInspectDrawer
          hostId={inspecting.hostId}
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

      {viewingLogs?.hostId ? (
        <ContainerLogsDrawer
          hostId={viewingLogs.hostId}
          container={viewingLogs}
          onClose={() => setViewingLogs(null)}
        />
      ) : null}
    </PageContainer>
  );
}

export function EmptyHosts() {
  return (
    <EmptyState
      illustration="hosts"
      title="No hosts connected"
      description={
        <>
          Run the DockSight agent on a Docker host and point it at this server.
          Registered agents appear here automatically.
        </>
      }
      action={
        <code className="rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-foreground">
          docksight-agent --server ws://localhost:3000
        </code>
      }
    />
  );
}

export function ErrorNotice({
  error,
  label,
}: {
  error: unknown;
  label: string;
}) {
  const message =
    error instanceof ApiError || error instanceof Error
      ? error.message
      : `Failed to load ${label}`;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
      <Boxes className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">Could not load {label}</p>
        <p className="mt-0.5 opacity-90">{message}</p>
      </div>
    </div>
  );
}
