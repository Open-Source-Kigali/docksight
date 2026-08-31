import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
};

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  label = 'items',
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{first}</span>–
        <span className="font-medium text-foreground">{last}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span> {label}
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>

        {buildPages(page, pageCount).map((entry, index) =>
          entry === 'gap' ? (
            <span
              key={`gap-${index}`}
              className="px-1.5 text-xs text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={entry}
              type="button"
              variant={entry === page ? 'default' : 'ghost'}
              size="icon-sm"
              aria-current={entry === page ? 'page' : undefined}
              onClick={() => onPageChange(entry)}
              className="text-xs tabular-nums"
            >
              {entry}
            </Button>
          ),
        )}

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function buildPages(page: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages: Array<number | 'gap'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) {
    pages.push('gap');
  }
  for (let value = start; value <= end; value += 1) {
    pages.push(value);
  }
  if (end < pageCount - 1) {
    pages.push('gap');
  }
  pages.push(pageCount);

  return pages;
}
