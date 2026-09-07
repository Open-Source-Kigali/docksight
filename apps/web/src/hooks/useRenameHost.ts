import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ToastProvider';
import { hostsQueryKey } from '@/hooks/useHosts';
import { renameHost } from '@/services/hosts';
import type { Host } from '@/types/api';

export function useRenameHost() {
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      hostId,
      displayName,
    }: {
      hostId: string;
      displayName: string;
    }) => renameHost(hostId, displayName),
    onSuccess: async (updated) => {
      queryClient.setQueryData<Host[]>(hostsQueryKey, (current) => {
        if (!current) {
          return current;
        }
        return current.map((host) =>
          host.id === updated.id ? { ...host, ...updated } : host,
        );
      });
      await queryClient.invalidateQueries({ queryKey: hostsQueryKey });
      toast.push({
        tone: 'success',
        title: 'Host renamed',
        description: updated.displayName ?? updated.hostname,
      });
    },
  });
}
