/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ToastProvider'
import { hostsQueryKey } from '@/hooks/useHosts'
import { useDeleteHost } from '@/hooks/useDeleteHost'
import { ApiError } from '@/services/api'
import type { Host } from '@/types/api'

const mockDeleteHost = vi.hoisted(() => vi.fn())

vi.mock('@/services/hosts', () => ({
  deleteHost: mockDeleteHost,
}))

const host: Host = {
  id: 'host-1',
  uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  hostname: 'old-box',
  os: 'linux',
  architecture: 'amd64',
  version: '27.0.0',
  status: 'OFFLINE',
  lastSeen: '2026-01-01T00:00:00Z',
  canDelete: true,
  metrics: { hostId: 'host-1', cpu: null, memory: null, collectedAt: null },
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  queryClient.setQueryData(hostsQueryKey, [host])

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }

  return { queryClient, Wrapper }
}

describe('useDeleteHost', () => {
  beforeEach(() => {
    mockDeleteHost.mockReset()
  })

  it('refreshes host queries after a successful delete', async () => {
    mockDeleteHost.mockResolvedValueOnce(undefined)
    const { queryClient, Wrapper } = createWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteHost(), { wrapper: Wrapper })

    await result.current.run(host)

    expect(mockDeleteHost).toHaveBeenCalledWith('host-1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: hostsQueryKey })
  })

  it('keeps cached hosts when the API rejects the delete', async () => {
    mockDeleteHost.mockRejectedValueOnce(
      new ApiError('Host is still active', 409, null),
    )
    const { queryClient, Wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteHost(), { wrapper: Wrapper })

    await result.current.run(host)

    expect(queryClient.getQueryData(hostsQueryKey)).toEqual([host])
    await waitFor(() => {
      expect(document.body.textContent).toContain('Could not delete host')
    })
  })
})
