import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ToastProvider'
import { hostsQueryKey } from '@/hooks/useHosts'
import { ApiError } from '@/services/api'
import { deleteHost } from '@/services/hosts'
import type { Host } from '@/types/api'

export function useDeleteHost() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (host: Host) => deleteHost(host.id),
    onSuccess: async (_result, host) => {
      await queryClient.invalidateQueries({ queryKey: hostsQueryKey })
      toast.push({
        tone: 'success',
        title: 'Host deleted',
        description: host.hostname,
      })
    },
  })

  async function run(host: Host) {
    try {
      await mutation.mutateAsync(host)
    } catch (error) {
      toast.push({
        tone: 'error',
        title: 'Could not delete host',
        description:
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'Failed to delete host',
      })
    }
  }

  return { run, isPending: mutation.isPending }
}
