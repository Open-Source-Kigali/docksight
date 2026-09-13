import { useMutation, useQueryClient } from '@tanstack/react-query'
import { containersQueryKey } from '@/hooks/useContainers'
import { runContainerAction } from '@/services/hosts'
import type { ContainerAction, ContainerActionResult } from '@/types/api'
import { containerInspectQueryKey } from '@/hooks/useContainerInspect'

type ContainerActionVariables = {
  containerId: string
  hostId: string
  action: ContainerAction
  containerName?: string
  /** Only meaningful for `remove`: kill a running container first. */
  force?: boolean
}

export function useContainerAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      containerId,
      hostId,
      action,
      force = false,
    }: ContainerActionVariables): Promise<ContainerActionResult> =>
      runContainerAction(containerId, hostId, action, force),
    onSuccess: async (result, variables) => {
      if (variables.action === 'remove' && result.ok) {
        queryClient.removeQueries({
          queryKey: containerInspectQueryKey(
            variables.hostId,
            variables.containerId,
          ),
        })
      }
      await queryClient.invalidateQueries({
        queryKey: containersQueryKey(variables.hostId),
      })


    },


  })
}
