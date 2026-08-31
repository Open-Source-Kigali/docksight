import { useQueries } from '@tanstack/react-query';
import { containersQueryKey } from '@/hooks/useContainers';
import { fetchHostContainers } from '@/services/hosts';
import { hostInventoryLabel } from '@/lib/host-name';
import type { Container, Host } from '@/types/api';

export type HostInventoryEntry = {
  hostId: string;
  containers: Container[];
  total: number;
  running: number;
  isLoading: boolean;
  isError: boolean;
};

/**
 * Container inventory for every host, so host cards can show real
 * total/running counts. One request per host — the server fans these out to
 * each agent over the WebSocket, so this polls slower than the single-host view.
 */
export function useHostInventory(hosts: Host[]) {
  const results = useQueries({
    queries: hosts.map((host) => ({
      queryKey: containersQueryKey(host.id),
      queryFn: () => fetchHostContainers(host.id),
      refetchInterval: 30_000,
      retry: 0,
    })),
  });

  const byHostId = new Map<string, HostInventoryEntry>();
  hosts.forEach((host, index) => {
    const result = results[index];
    const containers = result?.data?.containers ?? [];
    byHostId.set(host.id, {
      hostId: host.id,
      containers,
      total: containers.length,
      running: containers.filter((container) => isRunningState(container.state))
        .length,
      isLoading: result?.isLoading ?? false,
      isError: result?.isError ?? false,
    });
  });

  const all = hosts.flatMap((host, index) =>
    (results[index]?.data?.containers ?? []).map((container) => ({
      ...container,
      hostId: host.id,
      hostname: hostInventoryLabel(host),
    })),
  );

  return {
    byHostId,
    all,
    isLoading: results.some((result) => result.isLoading),
    isFetching: results.some((result) => result.isFetching),
    refetchAll: () => {
      results.forEach((result) => void result.refetch());
    },
  };
}

export function isRunningState(state: string | undefined): boolean {
  return (state ?? '').toLowerCase() === 'running';
}

export type ContainerWithHost = Container & {
  hostId: string;
  hostname: string;
};
