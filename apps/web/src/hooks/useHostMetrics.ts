import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHostMetrics } from '@/services/hosts';
import { toHostResources, type HostResources } from '@/lib/metrics';

/** Matches the agent's push interval; polling faster just re-renders the same sample. */
export const HOST_METRICS_POLL_MS = 10_000;

/** Points kept for the sparklines — 24 samples ≈ 4 minutes at the poll interval. */
const HISTORY_LENGTH = 24;

export function hostMetricsQueryKey(hostId: string) {
  return ['hosts', hostId, 'metrics'] as const;
}

type Sample = { collectedAt: string; cpu: number; memory: number };

/**
 * Latest host CPU/memory plus a short client-side history for the sparklines.
 *
 * The server keeps only the most recent sample, so the series is accumulated
 * here from successive polls: it starts empty and fills in as the page stays
 * open. It resets when the host changes.
 */
export function useHostMetrics(hostId: string | undefined) {
  const query = useQuery({
    queryKey: hostMetricsQueryKey(hostId ?? ''),
    queryFn: () => fetchHostMetrics(hostId!),
    enabled: Boolean(hostId),
    refetchInterval: HOST_METRICS_POLL_MS,
  });

  const [history, setHistory] = useState<Sample[]>([]);
  const hostRef = useRef(hostId);

  if (hostRef.current !== hostId) {
    hostRef.current = hostId;
    // Render-phase reset so a host switch never charts the previous host's
    // samples for one frame.
    if (history.length > 0) {
      setHistory([]);
    }
  }

  const data = query.data;
  useEffect(() => {
    if (!data?.cpu || !data.memory || !data.collectedAt) {
      return;
    }
    const sample: Sample = {
      collectedAt: data.collectedAt,
      cpu: data.cpu.usagePercent,
      memory: data.memory.usagePercent,
    };
    setHistory((previous) => {
      // The agent samples on its own clock; a poll that lands between pushes
      // returns the sample we already charted.
      if (previous[previous.length - 1]?.collectedAt === sample.collectedAt) {
        return previous;
      }
      return [...previous, sample].slice(-HISTORY_LENGTH);
    });
  }, [data]);

  const resources: HostResources = {
    ...toHostResources(query.data),
    cpuSeries: history.map((entry) => entry.cpu),
    memorySeries: history.map((entry) => entry.memory),
  };

  return { query, resources };
}
