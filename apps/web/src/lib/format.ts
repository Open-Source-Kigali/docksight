export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Never';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return 'Never';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  let delta = (date.getTime() - Date.now()) / 1000;

  // Agent and browser clocks drift; never render a heartbeat as "in 2 seconds".
  if (delta > 0) {
    return 'just now';
  }

  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) {
      return formatter.format(Math.round(delta), unit);
    }
    delta /= size;
  }

  return formatter.format(Math.round(delta), 'year');
}

export function shortId(id: string, length = 12): string {
  if (!id) {
    return '—';
  }
  return id.length > length ? id.slice(0, length) : id;
}

export function shortImage(image: string): string {
  if (!image) {
    return '—';
  }
  // Drop a registry host prefix (registry.example.com/team/app:tag) for display.
  const withoutRegistry = image.includes('/')
    ? image.split('/').slice(-2).join('/')
    : image;
  return withoutRegistry;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function osLabel(os: string): string {
  const value = (os || '').toLowerCase();
  if (value.includes('win')) {
    return 'Windows';
  }
  if (value.includes('darwin') || value.includes('mac')) {
    return 'macOS';
  }
  if (value.includes('linux')) {
    return 'Linux';
  }
  return os || 'Unknown';
}

export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/** Two-letter monogram from an email local part, e.g. "sam.r@x.io" -> "SA". */
export function initialsFor(email: string | undefined): string {
  const local = (email ?? '').split('@')[0];
  if (!local) {
    return '??';
  }
  const parts = local.split(/[._-]/).filter(Boolean);
  const letters =
    parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2);
  return letters.toUpperCase();
}
