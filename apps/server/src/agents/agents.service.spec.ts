import type { AgentRegisterPayload } from '@docksight/protocol';
import { AgentsService } from './agents.service';
import { PrismaService } from '../common/database/prisma.service';

describe('AgentsService', () => {
  const payload: AgentRegisterPayload = {
    uuid: 'agent-uuid',
    hostname: 'ip-10-0-0-1',
    os: 'linux',
    architecture: 'x64',
    version: '1.0.0',
  };

  it('does not overwrite displayName on re-registration', async () => {
    const upsert = jest.fn().mockResolvedValue({
      id: 'host-1',
      uuid: payload.uuid,
      hostname: payload.hostname,
      status: 'ONLINE',
    });
    const service = new AgentsService({
      agent: { upsert },
    } as unknown as PrismaService);

    await service.register(payload);

    const call = upsert.mock.calls[0] as unknown as [
      { update: Record<string, unknown> },
    ];
    expect(call[0].update).not.toHaveProperty('displayName');
  });

  it('updates displayName for an existing host', async () => {
    const existing = { id: 'host-1', hostname: 'ip-10-0-0-1' };
    const updated = { ...existing, displayName: 'prod-web-1' };
    const prisma = {
      agent: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(updated),
      },
    };
    const service = new AgentsService(prisma as unknown as PrismaService);

    await expect(
      service.updateDisplayName('host-1', 'prod-web-1'),
    ).resolves.toEqual(updated);
    expect(prisma.agent.update).toHaveBeenCalledWith({
      where: { id: 'host-1' },
      data: { displayName: 'prod-web-1' },
    });
  });

  it('returns null when updating a missing host', async () => {
    const prisma = {
      agent: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const service = new AgentsService(prisma as unknown as PrismaService);

    await expect(
      service.updateDisplayName('missing', 'prod-web-1'),
    ).resolves.toBeNull();
    expect(prisma.agent.update).not.toHaveBeenCalled();
  });
});
