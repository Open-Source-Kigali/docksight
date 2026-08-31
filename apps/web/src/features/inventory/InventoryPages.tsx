import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/AppShell';
import { HostSelect } from '@/components/HostSelect';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import { EmptyHosts, ErrorNotice } from '@/features/dashboard/DashboardPage';
import {
  ImagesTable,
  NetworksTable,
  VolumesTable,
} from '@/features/inventory/InventoryTables';
import { useHosts } from '@/hooks/useHosts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** Shared shell: pick a host, render that host's (mock) inventory table. */
function HostScopedPage({
  title,
  description,
  render,
}: {
  title: string;
  description: string;
  render: (hostId: string) => ReactNode;
}) {
  useDocumentTitle(title);
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

  return (
    <PageContainer>
      <PageHeader
        title={title}
        description={description}
        actions={
          hosts.length > 0 ? (
            <HostSelect hosts={hosts} value={hostId} onChange={setHostId} />
          ) : null
        }
      />

      {hostsQuery.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : hostsQuery.isError ? (
        <ErrorNotice error={hostsQuery.error} label="hosts" />
      ) : hosts.length === 0 ? (
        <EmptyHosts />
      ) : hostId ? (
        render(hostId)
      ) : null}
    </PageContainer>
  );
}

export function ImagesPage() {
  return (
    <HostScopedPage
      title="Images"
      description="Docker images available on the selected host."
      render={(hostId) => <ImagesTable hostId={hostId} />}
    />
  );
}

export function NetworksPage() {
  return (
    <HostScopedPage
      title="Networks"
      description="Docker networks defined on the selected host."
      render={(hostId) => <NetworksTable hostId={hostId} />}
    />
  );
}

export function VolumesPage() {
  return (
    <HostScopedPage
      title="Volumes"
      description="Docker volumes provisioned on the selected host."
      render={(hostId) => <VolumesTable hostId={hostId} />}
    />
  );
}
