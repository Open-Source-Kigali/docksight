import type { ReactNode } from 'react';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

type DataListProps = {
  items: Array<{
    label: string;
    value: ReactNode;
    mono?: boolean;
    copy?: string;
    span?: boolean;
  }>;
  columns?: 1 | 2;
  className?: string;
};

/** Label/value grid used across the inspect drawer and host header. */
export function DataList({ items, columns = 2, className }: DataListProps) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn('group min-w-0', item.span && 'sm:col-span-2')}
        >
          <dt className="text-xs font-medium text-muted-foreground">
            {item.label}
          </dt>
          <dd
            className={cn(
              'mt-1 flex items-center gap-1 text-sm text-foreground',
              item.mono && 'font-mono text-[13px]',
            )}
          >
            <span className="min-w-0 truncate">{item.value}</span>
            {item.copy ? (
              <CopyButton value={item.copy} label={`Copy ${item.label}`} />
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Compact table shell reused inside the drawer (ports, volumes, networks). */
export function MiniTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
        {empty}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-secondary/60">
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-t border-border transition-colors hover:bg-accent/50"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="max-w-[16rem] truncate px-3 py-2 align-middle"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
