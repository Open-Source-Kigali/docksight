import { useMutation, useQueryClient } from '@tanstack/react-query';
import { containersQueryKey } from '@/hooks/useContainers';
import { runContainerAction } from '@/services/hosts';
import type { ContainerAction, ContainerActionResult } from '@/types/api';

type ContainerActionVariables = {
  containerId: string;
  hostId: string;
  action: ContainerAction;
  containerName?: string;
  /** Only meaningful for `remove`: kill a running container first. */
  force?: boolean;
};

export function useContainerAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      containerId,
      hostId,
      action,
      force = false,
    }: ContainerActionVariables): Promise<ContainerActionResult> =>
      runContainerAction(containerId, hostId, action, force),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: containersQueryKey(variables.hostId),
      });
    },
  });
}
