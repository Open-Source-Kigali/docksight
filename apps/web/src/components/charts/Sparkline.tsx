import { useId } from 'react';
import { cn } from '@/lib/utils';

type SparklineProps = {
  values: number[];
  className?: string;
  /** CSS color for the stroke; the fill is derived at 18% opacity. */
  color?: string;
  height?: number;
};

/**
 * Decorative micro-trend for stat tiles. The number beside it carries the
 * value — this shape only carries direction, so it has no axes or tooltip.
 */
export function Sparkline({
  values,
  className,
  color = 'var(--primary)',
  height = 28,
}: SparklineProps) {
  const gradientId = useId();

  if (values.length < 2) {
    return <div className={cn('h-7', className)} />;
  }

  const width = 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const line = points
    .map(
      ([x, y], index) =>
        `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`,
    )
    .join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('h-7 w-full', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

type MeterProps = {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  tone?: 'auto' | 'primary';
};

/** Thin utilisation bar with rounded data-ends anchored to the track. */
export function Meter({
  value,
  max = 100,
  label,
  className,
  tone = 'auto',
}: MeterProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const color =
    tone === 'primary'
      ? 'bg-primary'
      : percent >= 85
        ? 'bg-danger'
        : percent >= 65
          ? 'bg-warning'
          : 'bg-success';

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xs font-medium tabular-nums text-foreground">
            {Math.round(percent)}%
          </span>
        </div>
      ) : null}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        role="meter"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            color,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
