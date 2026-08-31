/**
 * ---------------------------------------------------------------------------
 * MOCK / PLACEHOLDER DATA — NOT SERVED BY THE API
 * ---------------------------------------------------------------------------
 * Everything in this file fills UI surfaces the DockSight backend does not
 * expose yet. Each consumer renders a `<MockBadge />` next to it so the mock is
 * always visible to the user.
 *
 * Real, API-backed data today:
 *   GET  /hosts                         -> host identity + status + lastSeen
 *                                          + latest host CPU / memory
 *   GET  /hosts/:id/metrics             -> latest host CPU / memory sample
 *   GET  /hosts/:id/containers          -> id, name, image, status, state
 *   GET  /containers/:id/inspect        -> full docker inspect projection
 *   POST /containers/:id/{start,stop,restart}
 *   SSE  /containers/:id/logs           -> live log entries
 *
 * Still mocked here (no endpoint, no agent message type yet):
 *   - container metric time series           (needs `container.stats`)
 *   - images / networks / volumes inventory  (needs `image.*`/`network.*`/`volume.*`)
 *   - env vars, entrypoint, network gateway + DNS in the inspect drawer
 *     (the agent's ContainerInspect projection omits these fields)
 *   - workspace, notifications and the signed-in user in the top bar
 *
 * Values are derived from a string hash, so a given id always renders the same
 * numbers — no flicker between re-renders, and no `Math.random()` in a view.
 */

export const MOCK_NOTE = 'Mock data — no API endpoint yet';

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0..1 sequence for a seed. */
function pseudoRandom(seed: string): () => number {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

function between(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

/**
 * Random walk that ends exactly on `current` — it is generated backwards from
 * the "now" sample and reversed, so the headline number and the right edge of
 * the chart always agree.
 */
function walk(
  rand: () => number,
  current: number,
  points: number,
  volatility: number,
  min: number,
  max: number,
): number[] {
  const series: number[] = [current];
  let value = current;
  for (let i = 1; i < points; i += 1) {
    value += between(rand, -volatility, volatility);
    value = Math.min(max, Math.max(min, value));
    series.push(value);
  }
  return series.reverse();
}

/* -------------------------------------------------------------------------- */
/* Container metrics                                                          */
/* -------------------------------------------------------------------------- */

export type MockContainerMetrics = {
  cpuPercent: number;
  cpuSeries: number[];
  memoryPercent: number;
  memoryUsedBytes: number;
  memoryLimitBytes: number;
  memorySeries: number[];
  networkInSeries: number[];
  networkOutSeries: number[];
  networkInBytes: number;
  networkOutBytes: number;
  diskReadSeries: number[];
  diskWriteSeries: number[];
  diskReadBytes: number;
  diskWriteBytes: number;
};

export function mockContainerMetrics(
  containerId: string,
  points = 40,
): MockContainerMetrics {
  const rand = pseudoRandom(`metrics:${containerId}`);
  const cpuPercent = between(rand, 1, 64);
  const memoryLimitBytes = 512 * 1024 ** 2 * Math.ceil(between(rand, 1, 8));
  const memoryPercent = between(rand, 12, 79);
  const networkIn = between(rand, 40, 900) * 1024;
  const networkOut = between(rand, 20, 600) * 1024;
  const diskRead = between(rand, 5, 220) * 1024;
  const diskWrite = between(rand, 2, 140) * 1024;

  return {
    cpuPercent,
    cpuSeries: walk(rand, cpuPercent, points, 9, 0, 100),
    memoryPercent,
    memoryUsedBytes: (memoryLimitBytes * memoryPercent) / 100,
    memoryLimitBytes,
    memorySeries: walk(rand, memoryPercent, points, 3, 1, 99),
    networkInSeries: walk(
      rand,
      networkIn,
      points,
      networkIn * 0.4,
      0,
      Infinity,
    ),
    networkOutSeries: walk(
      rand,
      networkOut,
      points,
      networkOut * 0.4,
      0,
      Infinity,
    ),
    networkInBytes: networkIn,
    networkOutBytes: networkOut,
    diskReadSeries: walk(rand, diskRead, points, diskRead * 0.5, 0, Infinity),
    diskWriteSeries: walk(
      rand,
      diskWrite,
      points,
      diskWrite * 0.5,
      0,
      Infinity,
    ),
    diskReadBytes: diskRead,
    diskWriteBytes: diskWrite,
  };
}

/* -------------------------------------------------------------------------- */
/* Inspect drawer gaps                                                        */
/* -------------------------------------------------------------------------- */

export type MockEnvVar = { key: string; value: string; masked?: boolean };

export function mockEnvVars(containerId: string): MockEnvVar[] {
  const rand = pseudoRandom(`env:${containerId}`);
  return [
    { key: 'PATH', value: '/usr/local/sbin:/usr/local/bin:/usr/bin:/bin' },
    { key: 'NODE_ENV', value: rand() > 0.5 ? 'production' : 'staging' },
    { key: 'PORT', value: String(Math.floor(between(rand, 3000, 9000))) },
    { key: 'LOG_LEVEL', value: rand() > 0.6 ? 'debug' : 'info' },
    {
      key: 'DATABASE_URL',
      value: 'postgres://••••••••@db:5432/app',
      masked: true,
    },
    { key: 'TZ', value: 'UTC' },
  ];
}

export function mockNetworkDetails(networkName: string): {
  gateway: string;
  dns: string[];
} {
  const rand = pseudoRandom(`net:${networkName}`);
  const octet = Math.floor(between(rand, 17, 32));
  return {
    gateway: `172.${octet}.0.1`,
    dns: ['127.0.0.11'],
  };
}

/* -------------------------------------------------------------------------- */
/* Images / Networks / Volumes inventories                                    */
/* -------------------------------------------------------------------------- */

export type MockImage = {
  id: string;
  repository: string;
  tag: string;
  sizeBytes: number;
  created: string;
  containers: number;
};

export type MockNetwork = {
  id: string;
  name: string;
  driver: string;
  scope: string;
  subnet: string;
  gateway: string;
  attached: number;
};

export type MockVolume = {
  name: string;
  driver: string;
  mountpoint: string;
  sizeBytes: number;
  created: string;
  inUse: boolean;
};

const IMAGE_REPOS = [
  'nginx',
  'postgres',
  'redis',
  'node',
  'grafana/grafana',
  'traefik',
  'rabbitmq',
  'ghcr.io/docksight/agent',
];

export function mockImages(hostId: string): MockImage[] {
  const rand = pseudoRandom(`images:${hostId}`);
  return IMAGE_REPOS.map((repository, index) => ({
    id: `sha256:${hash(`${hostId}${repository}`).toString(16).padStart(8, '0').repeat(8)}`,
    repository,
    tag: ['latest', '1.27-alpine', '16', '7.2', '22-slim'][index % 5],
    sizeBytes: between(rand, 12, 1100) * 1024 ** 2,
    created: daysAgo(Math.floor(between(rand, 1, 240))),
    containers: Math.floor(between(rand, 0, 4)),
  }));
}

export function mockNetworks(hostId: string): MockNetwork[] {
  const rand = pseudoRandom(`networks:${hostId}`);
  const names = ['bridge', 'host', 'none', 'docksight_default', 'edge-proxy'];
  return names.map((name, index) => ({
    id: hash(`${hostId}${name}`).toString(16).padStart(12, '0'),
    name,
    driver: name === 'host' ? 'host' : name === 'none' ? 'null' : 'bridge',
    scope: 'local',
    subnet:
      name === 'host' || name === 'none' ? '—' : `172.${17 + index}.0.0/16`,
    gateway: name === 'host' || name === 'none' ? '—' : `172.${17 + index}.0.1`,
    attached: Math.floor(between(rand, 0, 6)),
  }));
}

export function mockVolumes(hostId: string): MockVolume[] {
  const rand = pseudoRandom(`volumes:${hostId}`);
  const names = [
    'pgdata',
    'redis-data',
    'grafana-storage',
    'app-uploads',
    'letsencrypt',
  ];
  return names.map((name) => ({
    name,
    driver: 'local',
    mountpoint: `/var/lib/docker/volumes/${name}/_data`,
    sizeBytes: between(rand, 4, 8600) * 1024 ** 2,
    created: daysAgo(Math.floor(between(rand, 1, 400))),
    inUse: rand() > 0.25,
  }));
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/* -------------------------------------------------------------------------- */
/* Shell chrome                                                               */
/* -------------------------------------------------------------------------- */

export const MOCK_WORKSPACE = {
  name: 'Acme Platform',
  plan: 'Self-hosted',
  workspaces: ['Acme Platform', 'Staging', 'Personal'],
};

export const MOCK_USER = {
  name: 'Sam Rukundo',
  email: 'srukundo02@gmail.com',
  role: 'Owner',
  initials: 'SR',
};

export const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    tone: 'danger' as const,
    title: 'Agent disconnected',
    body: 'build-runner-02 stopped sending heartbeats.',
    at: '12 min ago',
  },
  {
    id: 'n2',
    tone: 'warning' as const,
    title: 'Container restarting',
    body: 'api-gateway has restarted 3 times in 10 minutes.',
    at: '48 min ago',
  },
  {
    id: 'n3',
    tone: 'success' as const,
    title: 'Agent connected',
    body: 'edge-eu-west registered with Docker 27.3.1.',
    at: '2 h ago',
  },
];

export const APP_VERSION = 'v0.0.1';
