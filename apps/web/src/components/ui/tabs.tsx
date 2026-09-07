import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TabItem<T extends string = string> = {
  key: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  count?: number;
  badge?: ReactNode;
};

type TabsProps<T extends string> = {
  items: Array<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-border',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === value;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md px-3 py-2.5 text-sm font-medium transition-colors',
              'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors',
              active
                ? 'text-foreground after:bg-primary'
                : 'text-muted-foreground after:bg-transparent hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {item.label}
            {typeof item.count === 'number' ? (
              <span
                className={cn(
                  'rounded px-1.5 py-px text-[11px] font-semibold tabular-nums',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-muted-foreground',
                )}
              >
                {item.count}
              </span>
            ) : null}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

type FilterChipsProps<T extends string> = {
  items: Array<{ key: T; label: string; count?: number; dot?: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** Status chips (Running / Exited / Paused / Restarting). */
export function FilterChips<T extends string>({
  items,
  value,
  onChange,
  className,
}: FilterChipsProps<T>) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
            )}
          >
            {item.dot}
            {item.label}
            {typeof item.count === 'number' ? (
              <span className="tabular-nums opacity-70">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
