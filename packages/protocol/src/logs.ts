import type { MessageEnvelope } from './envelope';

/**
 * Logs message type constants (`domain.action`).
 */
export const LOGS_MESSAGE_TYPE = {
  LOGS_SUBSCRIBE: 'logs.subscribe',
  LOGS_UNSUBSCRIBE: 'logs.unsubscribe',
  LOGS_CHUNK: 'logs.chunk',
} as const;

export type LogsMessageType =
  (typeof LOGS_MESSAGE_TYPE)[keyof typeof LOGS_MESSAGE_TYPE];

export const LOGS_SUBSCRIBE = LOGS_MESSAGE_TYPE.LOGS_SUBSCRIBE;
export const LOGS_UNSUBSCRIBE = LOGS_MESSAGE_TYPE.LOGS_UNSUBSCRIBE;
export const LOGS_CHUNK = LOGS_MESSAGE_TYPE.LOGS_CHUNK;

/**
 * Payload for `logs.subscribe` (Server → Agent).
 */
export type LogsSubscribePayload = {
  requestId: string;
  containerId: string;
  /** Number of historical lines to send first (default 100). */
  tail?: number;
  /** Continue streaming after historical lines (default true). */
  follow?: boolean;
};

/**
 * Payload for `logs.unsubscribe` (Server → Agent).
 */
export type LogsUnsubscribePayload = {
  requestId: string;
};

export type LogStreamName = 'stdout' | 'stderr';

/**
 * One decoded log line.
 */
export type LogEntry = {
  timestamp: string;
  stream: LogStreamName | string;
  message: string;
};

/**
 * Payload for `logs.chunk` (Agent → Server).
 */
export type LogsChunkPayload = {
  requestId: string;
  containerId: string;
  entries: LogEntry[];
};

export type LogsSubscribeMessage = MessageEnvelope<
  typeof LOGS_SUBSCRIBE,
  LogsSubscribePayload
>;

export type LogsUnsubscribeMessage = MessageEnvelope<
  typeof LOGS_UNSUBSCRIBE,
  LogsUnsubscribePayload
>;

export type LogsChunkMessage = MessageEnvelope<
  typeof LOGS_CHUNK,
  LogsChunkPayload
>;

export type LogsMessage =
  LogsSubscribeMessage | LogsUnsubscribeMessage | LogsChunkMessage;
