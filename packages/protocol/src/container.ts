import type { MessageEnvelope } from './envelope';

/**
 * Container message type constants (`domain.action`).
 */
export const CONTAINER_MESSAGE_TYPE = {
  CONTAINER_LIST: 'container.list',
  CONTAINER_LISTED: 'container.listed',
  CONTAINER_INSPECT: 'container.inspect',
  CONTAINER_INSPECTED: 'container.inspected',
  CONTAINER_START: 'container.start',
  CONTAINER_STOP: 'container.stop',
  CONTAINER_RESTART: 'container.restart',
  CONTAINER_RESULT: 'container.result',
  CONTAINER_REMOVE: 'container.remove',
} as const;

export type ContainerMessageType =
  (typeof CONTAINER_MESSAGE_TYPE)[keyof typeof CONTAINER_MESSAGE_TYPE];

export const CONTAINER_LIST = CONTAINER_MESSAGE_TYPE.CONTAINER_LIST;
export const CONTAINER_LISTED = CONTAINER_MESSAGE_TYPE.CONTAINER_LISTED;
export const CONTAINER_INSPECT = CONTAINER_MESSAGE_TYPE.CONTAINER_INSPECT;
export const CONTAINER_INSPECTED = CONTAINER_MESSAGE_TYPE.CONTAINER_INSPECTED;
export const CONTAINER_START = CONTAINER_MESSAGE_TYPE.CONTAINER_START;
export const CONTAINER_STOP = CONTAINER_MESSAGE_TYPE.CONTAINER_STOP;
export const CONTAINER_RESTART = CONTAINER_MESSAGE_TYPE.CONTAINER_RESTART;
export const CONTAINER_RESULT = CONTAINER_MESSAGE_TYPE.CONTAINER_RESULT;
export const CONTAINER_REMOVE = CONTAINER_MESSAGE_TYPE.CONTAINER_REMOVE;

/**
 * Payload for `container.list` (Server -> Agent).
 * Empty object for now; filters may be added later.
 */
export type ContainerListPayload =
  Record<string, never> | Record<string, unknown>;

/**
 * One container summary returned by discovery.
 */
export type ContainerSummary = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: ContainerPort;
  createdAt: string;
};

/**
 * Payload for `container.listed` (Agent -> Server).
 */
export type ContainerListedPayload = {
  containers: ContainerSummary[];
};

export type ContainerPort = {
  private: number;
  public: string;
  protocol: string;
};

export type ContainerMount = {
  source: string;
  target: string;
  mode: string;
};

export type ContainerState = {
  status: string;
  running: boolean;
  paused: boolean;
  restarting: boolean;
};

export type ContainerNetwork = {
  name: string;
  ip: string;
};

export type ContainerInspect = {
  id: string;
  shortId: string;
  name: string;
  image: string;
  state: ContainerState;
  created: string;
  startedAt: string;
  ports: ContainerPort[];
  mounts: ContainerMount[];
  networks: ContainerNetwork[];
  workingDir: string;
  cmd: string[];
  restartPolicy: string;
  entrypoint: string[];
  env: string[];
};

/**
 * Lifecycle actions that produce `container.result`.
 */
export type ContainerAction = 'start' | 'stop' | 'restart' | 'remove';

/**
 * Shared command payload for container operations (Server -> Agent).
 */
export type ContainerCommandPayload = {
  requestId: string;
  containerId: string;
};

/**
 * Payload for `container.remove` (Server -> Agent).

 */
export type ContainerRemovePayload = ContainerCommandPayload & {
  force?: boolean;
};

export type ContainerInspectPayload = ContainerCommandPayload;

export type ContainerInspectedPayload = {
  requestId: string;
  container: ContainerInspect | null;
  ok: boolean;
  error: string | null;
};

/**
 * Payload for `container.result` (Agent -> Server).
 */
export type ContainerResultPayload = {
  requestId: string;
  action: ContainerAction;
  containerId: string;
  ok: boolean;
  message: string;
  error: string | null;
};

export type ContainerListMessage = MessageEnvelope<
  typeof CONTAINER_LIST,
  ContainerListPayload
>;

export type ContainerListedMessage = MessageEnvelope<
  typeof CONTAINER_LISTED,
  ContainerListedPayload
>;

export type ContainerInspectMessage = MessageEnvelope<
  typeof CONTAINER_INSPECT,
  ContainerInspectPayload
>;

export type ContainerInspectedMessage = MessageEnvelope<
  typeof CONTAINER_INSPECTED,
  ContainerInspectedPayload
>;

export type ContainerStartMessage = MessageEnvelope<
  typeof CONTAINER_START,
  ContainerCommandPayload
>;

export type ContainerRemoveMessage = MessageEnvelope<
  typeof CONTAINER_REMOVE,
  ContainerRemovePayload
>;

export type ContainerStopMessage = MessageEnvelope<
  typeof CONTAINER_STOP,
  ContainerCommandPayload
>;

export type ContainerRestartMessage = MessageEnvelope<
  typeof CONTAINER_RESTART,
  ContainerCommandPayload
>;

export type ContainerResultMessage = MessageEnvelope<
  typeof CONTAINER_RESULT,
  ContainerResultPayload
>;

export type ContainerMessage =
  | ContainerListMessage
  | ContainerListedMessage
  | ContainerInspectMessage
  | ContainerInspectedMessage
  | ContainerStartMessage
  | ContainerStopMessage
  | ContainerRestartMessage
  | ContainerResultMessage
  | ContainerRemoveMessage;
