import { useQuery } from '@tanstack/react-query';
import { fetchHosts } from '@/services/hosts';

export const hostsQueryKey = ['hosts'] as const;

export function useHosts() {
  return useQuery({
    queryKey: hostsQueryKey,
    queryFn: fetchHosts,
    refetchInterval: 15_000,
  });
}
