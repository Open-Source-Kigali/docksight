import type { Port } from '@/types/api'

/**
 * Every port mapping of a container, joined rather than showing only the
 * first one. A port that is exposed but not published has an empty `public`
 * and renders as the private port alone, e.g. `8080:80, 443`.
 */
export function formatPorts(ports: Port[] | undefined): string {
  if (!ports || ports.length === 0) return '-'
  return ports
    .map((port) => (port.public ? `${port.public}:${port.private}` : `${port.private}`))
    .join(', ')
}
