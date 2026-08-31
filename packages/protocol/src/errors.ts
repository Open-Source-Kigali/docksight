/**
 * Shared error-related constants for the agent protocol.
 *
 * Full `error.*` message types will be added in a later increment.
 * This module reserves naming and common error code strings early.
 */

/**
 * Reserved error domain prefix for future messages (e.g. `error.report`).
 */
export const ERROR_DOMAIN = 'error' as const;

/**
 * Common protocol error codes (draft / reserved).
 */
export const PROTOCOL_ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_MESSAGE_TYPE: 'UNKNOWN_MESSAGE_TYPE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ProtocolErrorCode =
  (typeof PROTOCOL_ERROR_CODE)[keyof typeof PROTOCOL_ERROR_CODE];
