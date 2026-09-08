import { Logger } from '@nestjs/common';
import { AgentsGateway } from './agents.gateway';
import type { AgentsService } from './agents.service';
import { ContainerInventoryService } from './container-inventory.service';
import type { HostMetricsService } from '../metrics/host-metrics.service';

type MessageSink = {
  agentUuid?: string;
  agentId?: string;
  send: jest.Mock;
};

/**
 * Drives the gateway's message handler directly, the way `handleConnection`
 * wires it to the socket, so no WebSocket server is needed.
 */
async function deliver(
  gateway: AgentsGateway,
  client: MessageSink,
  message: unknown,
) {
  const handleMessage = (
    gateway as unknown as {
      handleMessage: (client: MessageSink, data: Buffer) => Promise<void>;
    }
  ).handleMessage;
  await handleMessage.call(
    gateway,
    client,
    Buffer.from(JSON.stringify(message)),
  );
}

describe('AgentsGateway container.listed', () => {
  let inventory: ContainerInventoryService;
  let gateway: AgentsGateway;
  let client: MessageSink;

  beforeEach(() => {
    inventory = new ContainerInventoryService();
    inventory.rememberHost('host-1', 'uuid-1');
    gateway = new AgentsGateway(
      {} as AgentsService,
      inventory,
      {} as HostMetricsService,
    );
    client = { agentUuid: 'uuid-1', agentId: 'host-1', send: jest.fn() };
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores protocol-shaped summaries as sent', async () => {
    const containers = [
      {
        id: 'c1',
        name: 'api',
        image: 'docksight/api:1',
        status: 'Up 1 minute',
        state: 'running',
        ports: [
          { private: 3000, public: '3000', protocol: 'tcp', ip: '0.0.0.0' },
        ],
        created: 1756640400,
      },
    ];

    await deliver(gateway, client, {
      type: 'container.listed',
      payload: { containers },
    });

    expect(inventory.getByHostId('host-1')?.containers).toEqual(containers);
  });

  it('normalises legacy Docker SDK ports before they reach the inventory', async () => {
    await deliver(gateway, client, {
      type: 'container.listed',
      payload: {
        containers: [
          {
            id: 'c1',
            name: 'web',
            image: 'nginx:1.27',
            status: 'Up 5 minutes',
            state: 'running',
            created: 1756640400,
            ports: [
              { IP: '0.0.0.0', PrivatePort: 80, PublicPort: 8080, Type: 'tcp' },
              { PrivatePort: 443, Type: 'tcp' },
            ],
          },
        ],
      },
    });

    expect(inventory.getByHostId('host-1')?.containers[0].ports).toEqual([
      { private: 80, public: '8080', protocol: 'tcp', ip: '0.0.0.0' },
      { private: 443, public: '', protocol: 'tcp' },
    ]);
  });

  it('keeps well-formed containers, drops the rest and says so', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn');

    await deliver(gateway, client, {
      type: 'container.listed',
      payload: {
        containers: [
          {
            id: 'ok',
            name: 'a',
            image: 'b',
            status: 'c',
            state: 'exited',
            created: 1,
            ports: [],
          },
          {
            name: 'missing-id',
            image: 'b',
            status: 'c',
            state: 'exited',
            created: 1,
          },
          42,
        ],
      },
    });

    expect(
      inventory.getByHostId('host-1')?.containers.map((c) => c.id),
    ).toEqual(['ok']);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Ignored 2 malformed container summaries'),
    );
  });

  it('records an empty inventory when the payload has no containers array', async () => {
    await deliver(gateway, client, {
      type: 'container.listed',
      payload: { unexpected: true },
    });

    expect(inventory.getByHostId('host-1')?.containers).toEqual([]);
  });
});
