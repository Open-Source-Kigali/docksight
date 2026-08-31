import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TONE_BADGE, type StatusTone } from '@/lib/status';

type BadgeProps = {
  children: ReactNode;
  tone?: StatusTone | 'primary';
  className?: string;
  dot?: boolean;
  pulse?: boolean;
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  dot = false,
  pulse = false,
}: BadgeProps) {
  const toneClass =
    tone === 'primary'
      ? 'border-primary/25 bg-primary/10 text-primary'
      : TONE_BADGE[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        toneClass,
        className,
      )}
    >
      {dot ? (
        <StatusDot tone={tone === 'primary' ? 'neutral' : tone} pulse={pulse} />
      ) : null}
      {children}
    </span>
  );
}

const DOT_TONE: Record<StatusTone, string> = {
  success: 'bg-success text-success',
  warning: 'bg-warning text-warning',
  danger: 'bg-danger text-danger',
  neutral: 'bg-muted-foreground text-muted-foreground',
};

export function StatusDot({
  tone,
  pulse = false,
  className,
}: {
  tone: StatusTone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)}>
      <span
        className={cn(
          'relative inline-flex h-2 w-2 rounded-full',
          DOT_TONE[tone],
          pulse && 'status-pulse',
        )}
      />
    </span>
  );
}

/** Marks any value that is not backed by the API yet. */
export function MockBadge({
  label = 'Mock',
  title = 'Placeholder — DockSight does not expose this over the API yet',
  className,
}: {
  label?: string;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex cursor-help items-center gap-1 rounded border border-dashed border-warning/40 bg-warning/5 px-1.5 py-px text-[11px] font-medium uppercase tracking-wide text-warning',
        className,
      )}
    >
      {label}
    </span>
  );
}
