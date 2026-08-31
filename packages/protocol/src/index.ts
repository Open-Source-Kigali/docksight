/**
 * @docksight/protocol
 *
 * Shared DockSight agent WebSocket protocol contracts.
 * See package README and docs/protocol.md for the full specification.
 */

export type { JsonObject, MessageType, ProtocolDomain } from './types';

export type { MessageEnvelope } from './envelope';
export { createEnvelope, isJsonObject, isMessageEnvelope } from './envelope';

export type {
  AgentHeartbeatMessage,
  AgentHeartbeatPayload,
  AgentMessage,
  AgentMessageType,
  AgentRegisterMessage,
  AgentRegisterPayload,
  AgentRegisteredMessage,
  AgentRegisteredPayload,
  AgentStatus,
} from './agent';

export {
  AGENT_HEARTBEAT,
  AGENT_MESSAGE_TYPE,
  AGENT_REGISTER,
  AGENT_REGISTERED,
  AGENT_STATUS,
} from './agent';

export type {
  ContainerAction,
  ContainerCommandPayload,
  ContainerInspect,
  ContainerInspectMessage,
  ContainerInspectPayload,
  ContainerInspectedMessage,
  ContainerInspectedPayload,
  ContainerListMessage,
  ContainerListPayload,
  ContainerListedMessage,
  ContainerListedPayload,
  ContainerMount,
  ContainerNetwork,
  ContainerMessage,
  ContainerMessageType,
  ContainerPort,
  ContainerRemoveMessage,
  ContainerRemovePayload,
  ContainerRestartMessage,
  ContainerResultMessage,
  ContainerResultPayload,
  ContainerState,
  ContainerStartMessage,
  ContainerStopMessage,
  ContainerSummary,
} from './container';

export {
  CONTAINER_INSPECT,
  CONTAINER_INSPECTED,
  CONTAINER_LIST,
  CONTAINER_REMOVE,
  CONTAINER_LISTED,
  CONTAINER_MESSAGE_TYPE,
  CONTAINER_RESTART,
  CONTAINER_RESULT,
  CONTAINER_START,
  CONTAINER_STOP,
} from './container';

export type {
  LogEntry,
  LogStreamName,
  LogsChunkMessage,
  LogsChunkPayload,
  LogsMessage,
  LogsMessageType,
  LogsSubscribeMessage,
  LogsSubscribePayload,
  LogsUnsubscribeMessage,
  LogsUnsubscribePayload,
} from './logs';

export {
  LOGS_CHUNK,
  LOGS_MESSAGE_TYPE,
  LOGS_SUBSCRIBE,
  LOGS_UNSUBSCRIBE,
} from './logs';

export type {
  HostCpuMetrics,
  HostMemoryMetrics,
  HostMetricsMessage,
  HostMetricsPayload,
  MetricsMessage,
  MetricsMessageType,
} from './metrics';

export { METRICS_HOST, METRICS_MESSAGE_TYPE } from './metrics';

export type { ProtocolErrorCode } from './errors';
export { ERROR_DOMAIN, PROTOCOL_ERROR_CODE } from './errors';
