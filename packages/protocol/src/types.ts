/**
 * Shared primitive types for the DockSight agent protocol.
 */

/** Message type string in `domain.action` format (e.g. `agent.register`). */
export type MessageType = string;

/**
 * JSON object payload.
 * Arrays, primitives, and null are not valid protocol payloads.
 */
export type JsonObject = Record<string, unknown>;

/**
 * Reserved future protocol domains.
 * Message modules for these domains will be added later.
 */
export type ProtocolDomain =
  'agent' | 'container' | 'logs' | 'metrics' | 'event' | 'error' | 'system';
