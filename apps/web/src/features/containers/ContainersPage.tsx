import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout/AppShell';
import { ContainerInspectDrawer } from '@/components/ContainerInspectDrawer';
import { ContainerLogsDrawer } from '@/components/ContainerLogsDrawer';
import { ContainerTable, type ContainerRow } from '@/components/ContainerTable';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyHosts, ErrorNotice } from '@/features/dashboard/DashboardPage';
import { useContainerCommands } from '@/hooks/useContainerCommands';
import { useHostInventory } from '@/hooks/useHostInventory';
import { useHosts } from '@/hooks/useHosts';
import { useIsAdmin } from '@/stores/auth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function ContainersPage() {
  useDocumentTitle('Containers');

  const hostsQuery = useHosts();
  const hosts = hostsQuery.data ?? [];
  const inventory = useHostInventory(hosts);

  const [inspecting, setInspecting] = useState<ContainerRow | null>(null);
  const [viewingLogs, setViewingLogs] = useState<ContainerRow | null>(null);
  const commands = useContainerCommands(undefined, () =>
    inventory.refetchAll(),
  );
  const isAdmin = useIsAdmin();

  const refreshing = hostsQuery.isFetching || inventory.isFetching;

  return (
    <PageContainer>
      <PageHeader
        title="Containers"
        description="Every container reported by connected agents, across all hosts."
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

      {hostsQuery.isLoading || inventory.isLoading ? (
        <TableSkeleton rows={8} />
      ) : hostsQuery.isError ? (
        <ErrorNotice error={hostsQuery.error} label="containers" />
      ) : hosts.length === 0 ? (
        <EmptyHosts />
      ) : (
        <ContainerTable
          containers={inventory.all}
          showHostColumn
          canManage={isAdmin}
          busyKey={commands.busyKey}
          onAction={commands.run}
          onInspect={setInspecting}
          onViewLogs={setViewingLogs}
          emptyDescription="None of the connected hosts reported a container yet."
        />
      )}

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
