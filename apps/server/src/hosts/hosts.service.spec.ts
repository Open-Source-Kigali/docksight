import { ConflictException, NotFoundException } from '@nestjs/common';
import { AgentsService } from '../agents/agents.service';
import { ContainerInventoryService } from '../agents/container-inventory.service';
import { HostMetricsService } from '../metrics/host-metrics.service';
import { HostsService } from './hosts.service';
import type { Agent } from '../../generated/prisma/client';

describe('HostsService', () => {
  const lastSeen = new Date('2026-08-24T10:00:00.000Z');

  function makeAgent(overrides: Partial<Agent> = {}): Agent {
    return {
      id: 'host-1',
      uuid: 'uuid-1',
      hostname: 'ip-10-0-0-1',
      displayName: null,
      os: 'linux',
      architecture: 'x64',
      version: '1.0.0',
      status: 'ONLINE',
      lastSeen,
      createdAt: lastSeen,
      updatedAt: lastSeen,
      ...overrides,
    };
  }

  function makeService(agents: Partial<AgentsService>) {
    return new HostsService(
      agents as AgentsService,
      { rememberHost: jest.fn() } as unknown as ContainerInventoryService,
      {
        rememberHost: jest.fn(),
        getByHostId: jest.fn().mockReturnValue(null),
      } as unknown as HostMetricsService,
    );
  }

  it('falls back to hostname when no display name is set', async () => {
    const service = makeService({
      findAll: jest.fn().mockResolvedValue([makeAgent()]),
    });

    const [host] = await service.listHosts();

    expect(host.hostname).toBe('ip-10-0-0-1');
    expect(host.displayName).toBe('ip-10-0-0-1');
  });

  it('returns the stored display name when set', async () => {
    const service = makeService({
      findAll: jest
        .fn()
        .mockResolvedValue([makeAgent({ displayName: 'prod-web-1' })]),
    });

    const [host] = await service.listHosts();

    expect(host.hostname).toBe('ip-10-0-0-1');
    expect(host.displayName).toBe('prod-web-1');
  });

  it('persists a new display name', async () => {
    const updated = makeAgent({ displayName: 'prod-web-1' });
    const updateDisplayName = jest.fn().mockResolvedValue(updated);
    const service = makeService({ updateDisplayName });

    const host = await service.updateDisplayName('host-1', 'prod-web-1');

    expect(updateDisplayName).toHaveBeenCalledWith('host-1', 'prod-web-1');
    expect(host?.displayName).toBe('prod-web-1');
    expect(host?.hostname).toBe('ip-10-0-0-1');
  });

  it('returns null when the host does not exist', async () => {
    const service = makeService({
      updateDisplayName: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.updateDisplayName('missing', 'prod-web-1'),
    ).resolves.toBeNull();
  });

  describe('deleteHost', () => {
    it('throws NotFoundException if host does not exist', async () => {
      const service = makeService({
        findById: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteHost('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if host is ONLINE', async () => {
      const service = makeService({
        findById: jest.fn().mockResolvedValue(makeAgent({ status: 'ONLINE' })),
      });

      await expect(service.deleteHost('host-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException if host is OFFLINE but lastSeen is < 7 days ago', async () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const service = makeService({
        findById: jest.fn().mockResolvedValue(
          makeAgent({ status: 'OFFLINE', lastSeen: fourDaysAgo }),
        ),
      });

      await expect(service.deleteHost('host-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('deletes the host if OFFLINE and lastSeen is > 7 days ago', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      const deleteMock = jest.fn();

      const service = makeService({
        findById: jest.fn().mockResolvedValue(
          makeAgent({ status: 'OFFLINE', lastSeen: eightDaysAgo }),
        ),
        delete: deleteMock,
      });

      await service.deleteHost('host-1');
      expect(deleteMock).toHaveBeenCalledWith('host-1');
    });

    it('falls back to createdAt if lastSeen is null and deletes if > 7 days ago', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      const deleteMock = jest.fn();

      const service = makeService({
        findById: jest.fn().mockResolvedValue(
          makeAgent({ status: 'OFFLINE', lastSeen: null, createdAt: eightDaysAgo }),
        ),
        delete: deleteMock,
      });

      await service.deleteHost('host-1');
      expect(deleteMock).toHaveBeenCalledWith('host-1');
    });
  });
});
