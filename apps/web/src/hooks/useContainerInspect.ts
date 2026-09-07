import { useQuery } from '@tanstack/react-query';
import { inspectContainer } from '@/services/hosts';

export function containerInspectQueryKey(hostId: string, containerId: string) {
  return ['hosts', hostId, 'containers', containerId, 'inspect'] as const;
}

export function useContainerInspect(
  hostId: string | undefined,
  containerId: string | undefined,
) {
  return useQuery({
    queryKey: containerInspectQueryKey(hostId ?? '', containerId ?? ''),
    queryFn: () => inspectContainer(containerId!, hostId!),
    enabled: Boolean(hostId && containerId),
    staleTime: 5_000,
  });
}
