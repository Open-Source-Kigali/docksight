import type { ComponentType, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  chart?: ReactNode;
  className?: string;
};

const TONE_ICON: Record<NonNullable<StatTileProps['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  chart,
  className,
}: StatTileProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums">
            {value}
          </p>
          {hint ? (
            <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              TONE_ICON[tone],
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
      </div>
      {chart ? <div className="mt-4">{chart}</div> : null}
    </Card>
  );
}
