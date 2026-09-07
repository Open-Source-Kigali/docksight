export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Maps host status (`ONLINE` / `OFFLINE` / `UNKNOWN`) and Docker container
 * state strings (`running`, `exited`, `paused`, `restarting`, `created`,
 * `dead`) onto the four tones used across badges, dots and cards.
 */
export function statusTone(status: string | undefined | null): StatusTone {
  const value = (status ?? '').trim().toLowerCase();

  if (
    value === 'online' ||
    value === 'running' ||
    value === 'healthy' ||
    value === 'up' ||
    value.startsWith('up ')
  ) {
    return 'success';
  }

  if (
    value === 'restarting' ||
    value === 'paused' ||
    value === 'created' ||
    value === 'unknown' ||
    value === 'degraded' ||
    value === 'connecting'
  ) {
    return 'warning';
  }

  if (
    value === 'offline' ||
    value === 'dead' ||
    value === 'error' ||
    value === 'removing' ||
    value.startsWith('exited')
  ) {
    return 'danger';
  }

  return 'neutral';
}

export function statusLabel(status: string | undefined | null): string {
  const value = (status ?? '').trim();
  if (!value) {
    return 'Unknown';
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export const TONE_TEXT: Record<StatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-muted-foreground',
};

export const TONE_BADGE: Record<StatusTone, string> = {
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  danger: 'border-danger/25 bg-danger/10 text-danger',
  neutral: 'border-border bg-secondary text-muted-foreground',
};
