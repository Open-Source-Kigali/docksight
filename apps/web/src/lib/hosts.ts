import type { Host } from '@/types/api'

/** Delete is an admin action, and only when the server says the host is eligible. */
export function canShowDeleteHost(
  host: Pick<Host, 'canDelete'>,
  isAdmin: boolean,
): boolean {
  return isAdmin && host.canDelete === true
}
