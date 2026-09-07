import { describe, expect, it } from 'vitest';
import type { HostMetricsResponse } from '@/types/api';
import {
  EMPTY_HOST_RESOURCES,
  isStale,
  STALE_METRICS_MS,
  toHostResources,
} from './metrics';

describe('metrics', () => {
  describe('toHostResources', () => {
    it('returns EMPTY_HOST_RESOURCES when metrics is null or undefined', () => {
      expect(toHostResources(null)).toEqual(EMPTY_HOST_RESOURCES);
      expect(toHostResources(undefined)).toEqual(EMPTY_HOST_RESOURCES);
    });

    it('returns EMPTY_HOST_RESOURCES when cpu or memory object is missing', () => {
      const missingMemory = {
        cpu: { usagePercent: 10, cores: 4, loadAvg: [1, 1, 1] },
        memory: null,
        collectedAt: '2026-01-01T00:00:00Z',
      } as unknown as HostMetricsResponse;

      const missingCpu = {
        cpu: null,
        memory: {
          usagePercent: 50,
          usedBytes: 100,
          totalBytes: 200,
          availableBytes: 100,
        },
        collectedAt: '2026-01-01T00:00:00Z',
      } as unknown as HostMetricsResponse;

      expect(toHostResources(missingMemory)).toEqual(EMPTY_HOST_RESOURCES);
      expect(toHostResources(missingCpu)).toEqual(EMPTY_HOST_RESOURCES);
    });

    it('correctly transforms a valid HostMetricsResponse', () => {
      const mockMetrics: HostMetricsResponse = {
        hostId: 'host-123',
        cpu: {
          usagePercent: 25.5,
          cores: 8,
          loadAvg: [1.5, 1.2, 0.9],
        },
        memory: {
          usagePercent: 60.2,
          usedBytes: 6442450944,
          totalBytes: 10737418240,
          availableBytes: 4294967296,
        },
        collectedAt: '2026-01-15T12:00:00Z',
      };

      const result = toHostResources(mockMetrics);

      expect(result).toEqual({
        hasData: true,
        cpuPercent: 25.5,
        cpuCores: 8,
        loadAvg: [1.5, 1.2, 0.9],
        memoryPercent: 60.2,
        memoryUsedBytes: 6442450944,
        memoryTotalBytes: 10737418240,
        memoryAvailableBytes: 4294967296,
        collectedAt: '2026-01-15T12:00:00Z',
        cpuSeries: [],
        memorySeries: [],
      });
    });
  });

  describe('isStale', () => {
    const BASE_TIME = new Date('2026-01-15T12:00:00.000Z').getTime();

    it('returns true when collectedAt is null, empty, or unparseable', () => {
      expect(isStale(null, BASE_TIME)).toBe(true);
      expect(isStale('', BASE_TIME)).toBe(true);
      expect(isStale('invalid-date', BASE_TIME)).toBe(true);
    });

    it('returns false for timestamps within the 45-second window', () => {
      const tenSecsAgo = new Date(BASE_TIME - 10_000).toISOString();
      expect(isStale(tenSecsAgo, BASE_TIME)).toBe(false);
    });

    it('evaluates exact boundary conditions around STALE_METRICS_MS', () => {
      // 44,999ms ago -> fresh
      const freshBoundary = new Date(
        BASE_TIME - (STALE_METRICS_MS - 1),
      ).toISOString();
      expect(isStale(freshBoundary, BASE_TIME)).toBe(false);

      // Exactly 45,000ms ago -> fresh (condition is > 45000)
      const exactBoundary = new Date(
        BASE_TIME - STALE_METRICS_MS,
      ).toISOString();
      expect(isStale(exactBoundary, BASE_TIME)).toBe(false);

      // 45,001ms ago -> stale
      const staleBoundary = new Date(
        BASE_TIME - (STALE_METRICS_MS + 1),
      ).toISOString();
      expect(isStale(staleBoundary, BASE_TIME)).toBe(true);
    });

    it('handles future timestamps gracefully without marking stale', () => {
      const futureTime = new Date(BASE_TIME + 5_000).toISOString();
      expect(isStale(futureTime, BASE_TIME)).toBe(false);
    });

    it('defaults to current time when "now" argument is omitted', () => {
      const recentIso = new Date().toISOString();
      expect(isStale(recentIso)).toBe(false);
    });
  });
});
