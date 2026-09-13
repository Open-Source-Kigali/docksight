import type { ContainerPort, ContainerSummary } from '@docksight/protocol'

export type HostStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | string

export type HostCpuMetrics = {
  /** 0-100, averaged across all logical cores over the sample window. */
  usagePercent: number
  cores: number
  /** 1/5/15-minute load average; null on platforms without it. */
  loadAvg: [number, number, number] | null
}

export type HostMemoryMetrics = {
  totalBytes: number
  usedBytes: number
  availableBytes: number
  /** 0-100. */
  usagePercent: number
}

/**
 * `GET /hosts/:id/metrics`, and embedded in each `GET /hosts` row.
 * `cpu`/`memory` are null until the agent pushes its first `metrics.host`.
 */
export type HostMetricsResponse = {
  hostId: string
  cpu: HostCpuMetrics | null
  memory: HostMemoryMetrics | null
  collectedAt: string | null
}

export type Host = {
  id: string
  uuid: string
  hostname: string
  /** Operator label from the API; omitted or equal to hostname on older servers. */
  displayName?: string
  os: string
  architecture: string
  version: string
  status: HostStatus
  lastSeen: string | null
  metrics: HostMetricsResponse
}

/**
 * Containers come from the agent's `container.listed` message and are served
 * unchanged by `GET /hosts/:id/containers`, so the dashboard uses the protocol
 * types directly instead of keeping a third copy of the shape.
 */
export type Port = ContainerPort

export type Container = ContainerSummary

export type HostContainersResponse = {
  hostId: string
  containers: Container[]
  updatedAt: string | null
}

export type ContainerAction =
  | 'start'
  | 'stop'
  | 'restart'
  | 'remove'
  | 'pause'
  | 'unpause'

export type ContainerActionResult = {
  requestId: string
  action: ContainerAction
  containerId: string
  ok: boolean
  message: string
  error: string | null
}

export type { ContainerPort }

export type ContainerMount = {
  source: string
  target: string
  mode: string
}

export type ContainerStateDetails = {
  status: string
  running: boolean
  paused: boolean
  restarting: boolean
}

export type ContainerNetwork = {
  name: string
  ip: string
  gateway: string
  dns: string[]
}

export type ContainerInspect = {
  id: string
  shortId: string
  name: string
  image: string
  state: ContainerStateDetails
  created: string
  startedAt: string
  ports: ContainerPort[]
  mounts: ContainerMount[]
  networks: ContainerNetwork[]
  workingDir: string
  cmd: string[]
  restartPolicy: string
  entrypoint: string[]
  env:   string[]
}

export type ContainerInspectResult = {
  requestId: string
  container: ContainerInspect | null
  ok: boolean
  error: string | null
}

export type LogEntry = {
  timestamp: string
  stream: string
  message: string
}
