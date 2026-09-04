import { useQuery } from '@tanstack/react-query'
import { fetchHostContainers } from '@/services/hosts'

export function containersQueryKey(hostId: string) {
  return ['hosts', hostId, 'containers'] as const
}

export function useContainers(hostId: string | undefined) {
  return useQuery({
    queryKey: containersQueryKey(hostId ?? ''),
    queryFn: () => fetchHostContainers(hostId!),
    enabled: Boolean(hostId),
    refetchInterval: 2_000,
  })
}
