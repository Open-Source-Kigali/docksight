import type { ContainerPort, ContainerSummary } from '@docksight/protocol';

export type ParsedContainerListed = {
  /** Containers that matched the contract, in the order the agent sent them. */
  containers: ContainerSummary[];
  /** Entries that were not container summaries and were left out. */
  dropped: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * One port mapping. Accepts the protocol shape, and the Docker SDK casing that
 * agents released before the contract was aligned still send, so a platform
 * can be upgraded ahead of its agents without losing port information.
 */
export function parseContainerPort(value: unknown): ContainerPort | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    isFiniteNumber(value.private) &&
    isString(value.public) &&
    isString(value.protocol)
  ) {
    const port: ContainerPort = {
      private: value.private,
      public: value.public,
      protocol: value.protocol,
    };
    if (isString(value.ip) && value.ip !== '') {
      port.ip = value.ip;
    }
    return port;
  }

  // Legacy: `container.Port` from the Docker SDK, as forwarded by agents
  // before the protocol was aligned. `PublicPort` is a number and omitted
  // when the port is not published.
  if (isFiniteNumber(value.PrivatePort) && isString(value.Type)) {
    const publicPort = value.PublicPort;
    const port: ContainerPort = {
      private: value.PrivatePort,
      public:
        isFiniteNumber(publicPort) && publicPort !== 0
          ? String(publicPort)
          : isString(publicPort)
            ? publicPort
            : '',
      protocol: value.Type,
    };
    if (isString(value.IP) && value.IP !== '') {
      port.ip = value.IP;
    }
    return port;
  }

  return null;
}

/**
 * One container summary. Identity fields and `created` are required; a port
 * entry that cannot be read is left out rather than hiding the container.
 */
export function parseContainerSummary(value: unknown): ContainerSummary | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id, name, image, status, state, created, ports } = value;
  if (
    !isString(id) ||
    id === '' ||
    !isString(name) ||
    !isString(image) ||
    !isString(status) ||
    !isString(state) ||
    !isFiniteNumber(created)
  ) {
    return null;
  }

  const parsedPorts: ContainerPort[] = [];
  if (Array.isArray(ports)) {
    for (const entry of ports) {
      const port = parseContainerPort(entry);
      if (port) {
        parsedPorts.push(port);
      }
    }
  }

  return { id, name, image, status, state, ports: parsedPorts, created };
}

/**
 * Validates a `container.listed` payload instead of trusting the agent's
 * bytes. Anything that is not an object with a `containers` array yields an
 * empty list; malformed entries are counted so the gateway can log them.
 */
export function parseContainerListedPayload(
  payload: unknown,
): ParsedContainerListed {
  if (!isRecord(payload) || !Array.isArray(payload.containers)) {
    return { containers: [], dropped: 0 };
  }

  const containers: ContainerSummary[] = [];
  let dropped = 0;
  for (const entry of payload.containers) {
    const container = parseContainerSummary(entry);
    if (container) {
      containers.push(container);
    } else {
      dropped += 1;
    }
  }
  return { containers, dropped };
}
