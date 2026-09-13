import type { MessageEnvelope } from './envelope'

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
  CONTAINER_PAUSE: 'container.pause',
  CONTAINER_UNPAUSE: 'container.unpause'
} as const

export type ContainerMessageType =
  (typeof CONTAINER_MESSAGE_TYPE)[keyof typeof CONTAINER_MESSAGE_TYPE]

export const CONTAINER_LIST = CONTAINER_MESSAGE_TYPE.CONTAINER_LIST
export const CONTAINER_LISTED = CONTAINER_MESSAGE_TYPE.CONTAINER_LISTED
export const CONTAINER_INSPECT = CONTAINER_MESSAGE_TYPE.CONTAINER_INSPECT
export const CONTAINER_INSPECTED = CONTAINER_MESSAGE_TYPE.CONTAINER_INSPECTED
export const CONTAINER_START = CONTAINER_MESSAGE_TYPE.CONTAINER_START
export const CONTAINER_STOP = CONTAINER_MESSAGE_TYPE.CONTAINER_STOP
export const CONTAINER_RESTART = CONTAINER_MESSAGE_TYPE.CONTAINER_RESTART
export const CONTAINER_RESULT = CONTAINER_MESSAGE_TYPE.CONTAINER_RESULT
export const CONTAINER_REMOVE = CONTAINER_MESSAGE_TYPE.CONTAINER_REMOVE
export const CONTAINER_PAUSE = CONTAINER_MESSAGE_TYPE.CONTAINER_PAUSE
export const CONTAINER_UNPAUSE = CONTAINER_MESSAGE_TYPE.CONTAINER_UNPAUSE

/**
 * Payload for `container.list` (Server -> Agent).
 * Empty object for now; filters may be added later.
 */
export type ContainerListPayload =
  | Record<string, never>
  | Record<string, unknown>

/**
 * One container summary returned by discovery (`container.listed`).
 *
 * This is the wire format the Go agent emits (`ContainerSummary` in
 * `apps/agent/internal/communication/client.go`) and the shape the server
 * serves unchanged from `GET /hosts/:id/containers`. It is pinned by
 * `fixtures/container.listed.json` on both sides.
 */
export type ContainerSummary = {
  id: string
  name: string
  image: string
  status: string
  state: string
  /** Every exposed port, published or not. Same shape as `ContainerInspect.ports`. */
  ports: ContainerPort[]
  /** Creation time as Unix seconds, as Docker reports it for a listed container. */
  created: number
}

/**
 * Payload for `container.listed` (Agent -> Server).
 */
export type ContainerListedPayload = {
  containers: ContainerSummary[]
}

/**
 * One port mapping, in the protocol's lowerCamelCase rather than the Docker
 * SDK's `PrivatePort`/`PublicPort`/`Type` casing.
 */
export type ContainerPort = {
  /** Port inside the container. */
  private: number
  /** Host port as a string; empty when the port is exposed but not published. */
  public: string
  /** `tcp`, `udp` or `sctp`. */
  protocol: string
  /** Host interface the mapping is bound to (`0.0.0.0`, `::`, `127.0.0.1`); omitted when unknown. */
  ip?: string
}

export type ContainerMount = {
  source: string
  target: string
  mode: string
}

export type ContainerState = {
  status: string
  running: boolean
  paused: boolean
  restarting: boolean
}

export type ContainerNetwork = {
  name: string
  ip: string
  gateway: string
  dns: string[]
}

export type ContainerInspect = {
  id: string
  shortId: string
  name: string
  image: string
  state: ContainerState
  created: string
  startedAt: string
  ports: ContainerPort[]
  mounts: ContainerMount[]
  networks: ContainerNetwork[]
  workingDir: string
  cmd: string[]
  restartPolicy: string
  entrypoint: string[]
  env : string[]
}

/**
 * Lifecycle actions that produce `container.result`.
 */
export type ContainerAction =
  | 'start'
  | 'stop'
  | 'restart'
  | 'remove'
  | 'pause'
  | 'unpause'

/**
 * Shared command payload for container operations (Server -> Agent).
 */
export type ContainerCommandPayload = {
  requestId: string
  containerId: string
}

/**
 * Payload for `container.remove` (Server -> Agent).

 */
export type ContainerRemovePayload = ContainerCommandPayload & {
  force?: boolean
}


export type ContainerInspectPayload = ContainerCommandPayload

export type ContainerInspectedPayload = {
  requestId: string
  container: ContainerInspect | null
  ok: boolean
  error: string | null
}

/**
 * Payload for `container.result` (Agent -> Server).
 */
export type ContainerResultPayload = {
  requestId: string
  action: ContainerAction
  containerId: string
  ok: boolean
  message: string
  error: string | null
}

export type ContainerListMessage = MessageEnvelope<
  typeof CONTAINER_LIST,
  ContainerListPayload
>

export type ContainerListedMessage = MessageEnvelope<
  typeof CONTAINER_LISTED,
  ContainerListedPayload
>

export type ContainerInspectMessage = MessageEnvelope<
  typeof CONTAINER_INSPECT,
  ContainerInspectPayload
>

export type ContainerInspectedMessage = MessageEnvelope<
  typeof CONTAINER_INSPECTED,
  ContainerInspectedPayload
>

export type ContainerStartMessage = MessageEnvelope<
  typeof CONTAINER_START,
  ContainerCommandPayload
>

export type ContainerRemoveMessage = MessageEnvelope<
  typeof CONTAINER_REMOVE,
  ContainerRemovePayload
>


export type ContainerStopMessage = MessageEnvelope<
  typeof CONTAINER_STOP,
  ContainerCommandPayload
>

export type ContainerRestartMessage = MessageEnvelope<
  typeof CONTAINER_RESTART,
  ContainerCommandPayload
>

/**
 * `container.pause` / `container.unpause` (Server -> Agent).
 *
 * Both reuse `ContainerCommandPayload`: neither carries a flag, unlike
 * `container.remove` with its `force`.
 */
export type ContainerPauseMessage = MessageEnvelope<
  typeof CONTAINER_PAUSE,
  ContainerCommandPayload
>

export type ContainerUnpauseMessage = MessageEnvelope<
  typeof CONTAINER_UNPAUSE,
  ContainerCommandPayload
>

export type ContainerResultMessage = MessageEnvelope<
  typeof CONTAINER_RESULT,
  ContainerResultPayload
>

export type ContainerMessage =
  | ContainerListMessage
  | ContainerListedMessage
  | ContainerInspectMessage
  | ContainerInspectedMessage
  | ContainerStartMessage
  | ContainerStopMessage
  | ContainerRestartMessage
  | ContainerResultMessage
  | ContainerRemoveMessage
  | ContainerPauseMessage
  | ContainerUnpauseMessage
