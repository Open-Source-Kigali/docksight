import { useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type Series = {
  key: string;
  label: string;
  values: number[];
  /** Slot 1 and 2 of the validated categorical palette. */
  color: 'series-1' | 'series-2';
};

type TimeSeriesChartProps = {
  series: Series[];
  /** Formats y values in ticks, tooltip and direct labels. */
  format: (value: number) => string;
  /** Label for each x index, e.g. "-40s". */
  xLabel?: (index: number, length: number) => string;
  height?: number;
  yMax?: number;
  className?: string;
};

const COLOR_VAR: Record<Series['color'], string> = {
  'series-1': 'var(--series-1)',
  'series-2': 'var(--series-2)',
};

const PADDING = { top: 12, right: 12, bottom: 22, left: 46 };

/**
 * Line/area chart with a crosshair + tooltip hover layer. One y-axis only —
 * two measures of different scale get two charts, never a second axis.
 */
export function TimeSeriesChart({
  series,
  format,
  xLabel = (index, length) => `-${length - 1 - index}s`,
  height = 180,
  yMax,
  className,
}: TimeSeriesChartProps) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 560;
  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const pointCount = series[0]?.values.length ?? 0;

  const { max, ticks } = useMemo(() => {
    const dataMax = Math.max(
      1,
      ...series.flatMap((entry) => entry.values),
      yMax ?? 0,
    );
    const roundedMax = yMax ?? niceCeil(dataMax);
    return {
      max: roundedMax,
      ticks: [0, roundedMax / 2, roundedMax],
    };
  }, [series, yMax]);

  if (pointCount < 2) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground',
          className,
        )}
        style={{ height }}
      >
        Not enough samples yet
      </div>
    );
  }

  const xAt = (index: number) =>
    PADDING.left + (index / (pointCount - 1)) * plotWidth;
  const yAt = (value: number) =>
    PADDING.top + plotHeight - (Math.min(value, max) / max) * plotHeight;

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const relative = ((event.clientX - rect.left) / rect.width) * width;
    const ratio = (relative - PADDING.left) / plotWidth;
    const index = Math.round(ratio * (pointCount - 1));
    setHoverIndex(Math.min(pointCount - 1, Math.max(0, index)));
  }

  const activeIndex = hoverIndex ?? pointCount - 1;
  const tooltipX = xAt(activeIndex);
  const tooltipOnRight = tooltipX > width * 0.6;

  return (
    <div className={cn('relative', className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        style={{ height }}
        role="img"
        aria-label={`${series.map((entry) => entry.label).join(' and ')} over time`}
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <defs>
          {series.map((entry) => (
            <linearGradient
              key={entry.key}
              id={`${gradientId}-${entry.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={COLOR_VAR[entry.color]}
                stopOpacity={series.length > 1 ? 0.14 : 0.2}
              />
              <stop
                offset="100%"
                stopColor={COLOR_VAR[entry.color]}
                stopOpacity="0"
              />
            </linearGradient>
          ))}
        </defs>

        {/* Recessive grid + y ticks */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={tick === 0 ? undefined : '3 4'}
            />
            <text
              x={PADDING.left - 8}
              y={yAt(tick) + 3.5}
              textAnchor="end"
              className="fill-[var(--muted-foreground)] text-[10px] tabular-nums"
            >
              {format(tick)}
            </text>
          </g>
        ))}

        {/* x labels: first, middle, last only */}
        {[0, Math.floor((pointCount - 1) / 2), pointCount - 1].map((index) => (
          <text
            key={index}
            x={xAt(index)}
            y={height - 6}
            textAnchor={
              index === 0
                ? 'start'
                : index === pointCount - 1
                  ? 'end'
                  : 'middle'
            }
            className="fill-[var(--muted-foreground)] text-[10px] tabular-nums"
          >
            {xLabel(index, pointCount)}
          </text>
        ))}

        {series.map((entry) => {
          const line = entry.values
            .map(
              (value, index) =>
                `${index === 0 ? 'M' : 'L'}${xAt(index).toFixed(2)},${yAt(value).toFixed(2)}`,
            )
            .join(' ');
          const area = `${line} L${xAt(pointCount - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`;

          return (
            <g key={entry.key}>
              <path d={area} fill={`url(#${gradientId}-${entry.key})`} />
              <path
                d={line}
                fill="none"
                stroke={COLOR_VAR[entry.color]}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {/* Crosshair */}
        {hoverIndex !== null ? (
          <line
            x1={tooltipX}
            x2={tooltipX}
            y1={PADDING.top}
            y2={PADDING.top + plotHeight}
            stroke="var(--muted-foreground)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ) : null}

        {series.map((entry) => (
          <circle
            key={`marker-${entry.key}`}
            cx={tooltipX}
            cy={yAt(entry.values[activeIndex] ?? 0)}
            r="4.5"
            fill={COLOR_VAR[entry.color]}
            stroke="var(--card)"
            strokeWidth="2"
          />
        ))}
      </svg>

      {/* Tooltip — HTML so it inherits type tokens */}
      <div
        className={cn(
          'pointer-events-none absolute top-2 rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md transition-opacity',
          hoverIndex === null ? 'opacity-0' : 'opacity-100',
          tooltipOnRight ? 'left-2' : 'right-2',
        )}
      >
        <p className="text-[11px] font-medium text-muted-foreground">
          {xLabel(activeIndex, pointCount)}
        </p>
        <div className="mt-1 space-y-0.5">
          {series.map((entry) => (
            <div key={entry.key} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: COLOR_VAR[entry.color] }}
                aria-hidden
              />
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="ml-auto font-medium tabular-nums text-foreground">
                {format(entry.values[activeIndex] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Legend — required whenever a chart carries two or more series. */
export function ChartLegend({ series }: { series: Series[] }) {
  if (series.length < 2) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      {series.map((entry) => (
        <span
          key={entry.key}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: COLOR_VAR[entry.color] }}
            aria-hidden
          />
          {entry.label}
        </span>
      ))}
    </div>
  );
}

function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}
