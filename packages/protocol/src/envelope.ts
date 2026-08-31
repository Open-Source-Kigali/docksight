import type { JsonObject, MessageType } from './types';

/**
 * Common WebSocket message envelope.
 *
 * Every server ↔ agent message MUST use this wrapper.
 *
 * Rules:
 * - `type` uses `domain.action` format (lowercase, case-sensitive)
 * - `payload` MUST always be a JSON object
 */
export type MessageEnvelope<
  TType extends MessageType = MessageType,
  TPayload extends JsonObject = JsonObject,
> = {
  type: TType;
  payload: TPayload;
};

/**
 * Type guard: payload is a plain object (not null, array, or primitive).
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard: value looks like a protocol envelope.
 */
export function isMessageEnvelope(value: unknown): value is MessageEnvelope {
  if (!isJsonObject(value)) {
    return false;
  }

  return typeof value.type === 'string' && isJsonObject(value.payload);
}

/**
 * Create a typed envelope.
 */
export function createEnvelope<
  TType extends MessageType,
  TPayload extends JsonObject,
>(type: TType, payload: TPayload): MessageEnvelope<TType, TPayload> {
  return { type, payload };
}
