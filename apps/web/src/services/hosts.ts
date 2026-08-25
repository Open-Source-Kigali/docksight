import { apiClient } from '@/services/api'
import type {
  ContainerAction,
  ContainerActionResult,
  ContainerInspectResult,
  Host,
  HostContainersResponse,
  HostMetricsResponse,
} from '@/types/api'

export function fetchHosts(): Promise<Host[]> {
  return apiClient.get<Host[]>('/hosts')
}

export function fetchHostMetrics(hostId: string): Promise<HostMetricsResponse> {
  return apiClient.get<HostMetricsResponse>(`/hosts/${hostId}/metrics`)
}

export function fetchHostContainers(
  hostId: string,
): Promise<HostContainersResponse> {
  return apiClient.get<HostContainersResponse>(`/hosts/${hostId}/containers`)
}

export function runContainerAction(
  containerId: string,
  hostId: string,
  action: ContainerAction,
): Promise<ContainerActionResult> {
  return apiClient.post<ContainerActionResult>(
    `/containers/${encodeURIComponent(containerId)}/${action}`,
    { hostId },
  )
}

export function inspectContainer(
  containerId: string,
  hostId: string,
): Promise<ContainerInspectResult> {
  return apiClient.get<ContainerInspectResult>(
    `/containers/${encodeURIComponent(containerId)}/inspect?hostId=${encodeURIComponent(hostId)}`,
  )
}

export function deleteHost(hostId: string): Promise<void> {
  return apiClient.delete(`/hosts/${encodeURIComponent(hostId)}`)
}
