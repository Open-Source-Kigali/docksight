import type { HostMetricsResponse } from '@/types/api';

/**
 * View model for host utilisation. The API returns null CPU/memory until the
 * agent's first `metrics.host` push, so `hasData` gates rendering and the
 * numeric fields stay zero rather than nullable — call sites can do arithmetic
 * without a null check, and show a placeholder when `hasData` is false.
 */
export type HostResources = {
  hasData: boolean;
  cpuPercent: number;
  cpuCores: number;
  loadAvg: [number, number, number] | null;
  memoryPercent: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  memoryAvailableBytes: number;
  /** When the agent sampled the host. */
  collectedAt: string | null;
  /** Recent readings, oldest first; empty unless collected by useHostMetrics. */
  cpuSeries: number[];
  memorySeries: number[];
};

export const EMPTY_HOST_RESOURCES: HostResources = {
  hasData: false,
  cpuPercent: 0,
  cpuCores: 0,
  loadAvg: null,
  memoryPercent: 0,
  memoryUsedBytes: 0,
  memoryTotalBytes: 0,
  memoryAvailableBytes: 0,
  collectedAt: null,
  cpuSeries: [],
  memorySeries: [],
};

export function toHostResources(
  metrics: HostMetricsResponse | null | undefined,
): HostResources {
  if (!metrics?.cpu || !metrics.memory) {
    return EMPTY_HOST_RESOURCES;
  }

  return {
    hasData: true,
    cpuPercent: metrics.cpu.usagePercent,
    cpuCores: metrics.cpu.cores,
    loadAvg: metrics.cpu.loadAvg,
    memoryPercent: metrics.memory.usagePercent,
    memoryUsedBytes: metrics.memory.usedBytes,
    memoryTotalBytes: metrics.memory.totalBytes,
    memoryAvailableBytes: metrics.memory.availableBytes,
    collectedAt: metrics.collectedAt,
    cpuSeries: [],
    memorySeries: [],
  };
}

/**
 * A sample is stale once the agent has missed roughly two push intervals —
 * usually because it disconnected without the socket closing cleanly.
 */
export const STALE_METRICS_MS = 45_000;

export function isStale(collectedAt: string | null, now = Date.now()): boolean {
  if (!collectedAt) {
    return true;
  }
  const at = new Date(collectedAt).valueOf();
  return Number.isNaN(at) || now - at > STALE_METRICS_MS;
}
