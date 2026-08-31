import type { MessageEnvelope } from './envelope';

/**
 * Agent connectivity status values.
 */
export const AGENT_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

/**
 * Agent message type constants (`domain.action`).
 */
export const AGENT_MESSAGE_TYPE = {
  AGENT_REGISTER: 'agent.register',
  AGENT_REGISTERED: 'agent.registered',
  AGENT_HEARTBEAT: 'agent.heartbeat',
} as const;

export type AgentMessageType =
  (typeof AGENT_MESSAGE_TYPE)[keyof typeof AGENT_MESSAGE_TYPE];

/** Convenience aliases matching PI-007A naming. */
export const AGENT_REGISTER = AGENT_MESSAGE_TYPE.AGENT_REGISTER;
export const AGENT_REGISTERED = AGENT_MESSAGE_TYPE.AGENT_REGISTERED;
export const AGENT_HEARTBEAT = AGENT_MESSAGE_TYPE.AGENT_HEARTBEAT;

/**
 * Payload for `agent.register` (Agent → Server).
 */
export type AgentRegisterPayload = {
  uuid: string;
  hostname: string;
  os: string;
  architecture: string;
  version: string;
};

/**
 * Payload for `agent.registered` (Server → Agent).
 */
export type AgentRegisteredPayload = {
  id: string;
  uuid: string;
  status: string;
  message: string;
};

/**
 * Payload for `agent.heartbeat` (Agent → Server).
 */
export type AgentHeartbeatPayload = {
  uuid: string;
};

export type AgentRegisterMessage = MessageEnvelope<
  typeof AGENT_REGISTER,
  AgentRegisterPayload
>;

export type AgentRegisteredMessage = MessageEnvelope<
  typeof AGENT_REGISTERED,
  AgentRegisteredPayload
>;

export type AgentHeartbeatMessage = MessageEnvelope<
  typeof AGENT_HEARTBEAT,
  AgentHeartbeatPayload
>;

export type AgentMessage =
  AgentRegisterMessage | AgentRegisteredMessage | AgentHeartbeatMessage;
