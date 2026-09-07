import type { MessageEnvelope } from './envelope';

/**
 * Metrics message type constants (`domain.action`).
 */
export const METRICS_MESSAGE_TYPE = {
  METRICS_HOST: 'metrics.host',
} as const;

export type MetricsMessageType =
  (typeof METRICS_MESSAGE_TYPE)[keyof typeof METRICS_MESSAGE_TYPE];

export const METRICS_HOST = METRICS_MESSAGE_TYPE.METRICS_HOST;

/**
 * Host processor utilisation for one sample window.
 */
export type HostCpuMetrics = {
  /** 0-100, averaged across all logical cores over the sample window. */
  usagePercent: number;
  cores: number;
  /** 1/5/15-minute load average; null on platforms without it. */
  loadAvg: [number, number, number] | null;
};

/**
 * Host physical memory utilisation.
 */
export type HostMemoryMetrics = {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  /** 0-100. */
  usagePercent: number;
};

/**
 * Payload for `metrics.host` (Agent → Server).
 *
 * Pushed on a fixed interval rather than requested: CPU percent is a delta
 * between two samples, so the agent owns the sampling cadence.
 */
export type HostMetricsPayload = {
  uuid: string;
  /** ISO-8601, taken on the agent. */
  collectedAt: string;
  cpu: HostCpuMetrics;
  memory: HostMemoryMetrics;
};

export type HostMetricsMessage = MessageEnvelope<
  typeof METRICS_HOST,
  HostMetricsPayload
>;

export type MetricsMessage = HostMetricsMessage;
