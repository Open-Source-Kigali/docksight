import type { Host } from '@/types/api';

export const HOST_DISPLAY_NAME_MAX_LENGTH = 64;

export function hostDisplayName(
  host: Pick<Host, 'hostname' | 'displayName'>,
): string {
  return host.displayName?.trim() || host.hostname;
}

/** Friendly name plus agent hostname so container search still matches both. */
export function hostInventoryLabel(
  host: Pick<Host, 'hostname' | 'displayName'>,
): string {
  const label = hostDisplayName(host);
  return label === host.hostname
    ? host.hostname
    : `${label} (${host.hostname})`;
}

export function validateHostDisplayName(value: string): string | null {
  const name = value.trim();
  if (!name) {
    return 'Display name must not be empty';
  }
  if (name.length > HOST_DISPLAY_NAME_MAX_LENGTH) {
    return `Display name must be at most ${HOST_DISPLAY_NAME_MAX_LENGTH} characters`;
  }
  return null;
}
