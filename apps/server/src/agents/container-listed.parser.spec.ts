import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContainerListedPayload } from '@docksight/protocol';
import {
  parseContainerListedPayload,
  parseContainerPort,
  parseContainerSummary,
} from './container-listed.parser';

const fixturePath = join(
  __dirname,
  '../../../../packages/protocol/fixtures/container.listed.json',
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
  type: string;
  payload: ContainerListedPayload;
};

describe('parseContainerListedPayload', () => {
  it('accepts the protocol fixture unchanged', () => {
    const result = parseContainerListedPayload(fixture.payload);

    expect(result.dropped).toBe(0);
    expect(result.containers).toEqual(fixture.payload.containers);
  });

  it('normalises the Docker SDK port casing sent by agents released before the contract was aligned', () => {
    const legacy = {
      containers: [
        {
          id: 'abc',
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
    };

    const result = parseContainerListedPayload(legacy);

    expect(result.dropped).toBe(0);
    expect(result.containers[0].ports).toEqual([
      { private: 80, public: '8080', protocol: 'tcp', ip: '0.0.0.0' },
      { private: 443, public: '', protocol: 'tcp' },
    ]);
  });

  it('drops entries that are not container summaries and counts them', () => {
    const result = parseContainerListedPayload({
      containers: [
        null,
        'not-a-container',
        {
          id: 'no-created',
          name: 'x',
          image: 'y',
          status: 's',
          state: 'exited',
        },
        {
          id: '',
          name: 'empty-id',
          image: 'y',
          status: 's',
          state: 'exited',
          created: 1,
        },
        {
          id: 'ok',
          name: 'kept',
          image: 'y',
          status: 's',
          state: 'exited',
          created: 1,
        },
      ],
    });

    expect(result.dropped).toBe(4);
    expect(result.containers.map((c) => c.id)).toEqual(['ok']);
  });

  it('treats a missing or malformed ports field as no ports, not as a broken container', () => {
    const base = {
      id: 'ok',
      name: 'kept',
      image: 'y',
      status: 's',
      state: 'running',
      created: 1,
    };

    expect(parseContainerSummary(base)?.ports).toEqual([]);
    expect(parseContainerSummary({ ...base, ports: 'nope' })?.ports).toEqual(
      [],
    );
    expect(
      parseContainerSummary({
        ...base,
        ports: [
          { private: 80, public: '8080', protocol: 'tcp' },
          { bogus: true },
        ],
      })?.ports,
    ).toEqual([{ private: 80, public: '8080', protocol: 'tcp' }]);
  });

  it('yields an empty list for payloads that are not objects with a containers array', () => {
    for (const payload of [
      null,
      undefined,
      42,
      'x',
      [],
      {},
      { containers: {} },
    ]) {
      expect(parseContainerListedPayload(payload)).toEqual({
        containers: [],
        dropped: 0,
      });
    }
  });
});

describe('parseContainerPort', () => {
  it('keeps ip only when present and non-empty', () => {
    expect(
      parseContainerPort({ private: 1, public: '', protocol: 'udp', ip: '' }),
    ).toEqual({ private: 1, public: '', protocol: 'udp' });
    expect(
      parseContainerPort({ private: 1, public: '', protocol: 'udp', ip: '::' }),
    ).toEqual({ private: 1, public: '', protocol: 'udp', ip: '::' });
  });

  it('rejects mappings with the right keys but the wrong types', () => {
    expect(
      parseContainerPort({ private: '80', public: '8080', protocol: 'tcp' }),
    ).toBeNull();
    expect(
      parseContainerPort({ private: 80, public: 8080, protocol: 'tcp' }),
    ).toBeNull();
    expect(parseContainerPort({ PrivatePort: '80', Type: 'tcp' })).toBeNull();
    expect(parseContainerPort([])).toBeNull();
  });
});
