import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Copy,
  Check,
  Eraser,
  Pause,
  Play,
  RotateCw,
  Search,
} from 'lucide-react';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useContainerLogs } from '@/hooks/useContainerLogs';
import { copyToClipboard } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { LogEntry } from '@/types/api';

type LogsViewerProps = {
  hostId: string;
  containerId: string;
  containerName: string;
  className?: string;
  /** Terminal height; the drawer variant fills the panel instead. */
  fill?: boolean;
};

type Level = 'error' | 'warn' | 'info' | 'debug' | 'plain';

const LEVEL_STYLE: Record<Level, string> = {
  error: 'text-rose-300',
  warn: 'text-amber-300',
  info: 'text-sky-300',
  debug: 'text-slate-400',
  plain: 'text-slate-200',
};

const LEVEL_TAG: Record<Level, string> = {
  error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  debug: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  plain: '',
};

function detectLevel(entry: LogEntry): Level {
  const message = entry.message ?? '';
  if (/\b(error|err|fatal|panic|exception|failed)\b/i.test(message)) {
    return 'error';
  }
  if (/\b(warn|warning|deprecat)/i.test(message)) {
    return 'warn';
  }
  if (/\b(info|notice)\b/i.test(message)) {
    return 'info';
  }
  if (/\b(debug|trace)\b/i.test(message)) {
    return 'debug';
  }
  return entry.stream === 'stderr' ? 'error' : 'plain';
}

/** Dark terminal log surface — fixed dark palette in both app themes. */
export function LogsViewer({
  hostId,
  containerId,
  containerName,
  className,
  fill = false,
}: LogsViewerProps) {
  const {
    entries,
    status,
    error,
    paused,
    bufferedCount,
    togglePause,
    clear,
    reconnect,
  } = useContainerLogs(hostId, containerId);

  const [query, setQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return entries;
    }
    return entries.filter((entry) =>
      entry.message?.toLowerCase().includes(value),
    );
  }, [entries, query]);

  useEffect(() => {
    if (!autoScroll) {
      return;
    }
    const node = scrollerRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [filtered, autoScroll]);

  function handleScroll() {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }
    const atBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < 40;
    setAutoScroll(atBottom);
  }

  async function handleCopy() {
    const ok = await copyToClipboard(
      filtered.map((entry) => `${entry.timestamp} ${entry.message}`).join('\n'),
    );
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    }
  }

  function handleDownload() {
    const blob = new Blob(
      [
        filtered
          .map((entry) => `${entry.timestamp} ${entry.message}`)
          .join('\n'),
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${containerName.replace(/^\//, '')}-logs.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-[#0b1020]',
        fill && 'h-full',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
          <StatusDot
            tone={
              status === 'live'
                ? 'success'
                : status === 'error'
                  ? 'danger'
                  : 'warning'
            }
            pulse={status === 'live'}
          />
          {status === 'live'
            ? 'Streaming'
            : status === 'paused'
              ? 'Paused'
              : status === 'error'
                ? 'Disconnected'
                : 'Connecting…'}
        </span>

        {paused && bufferedCount > 0 ? (
          <Badge
            tone="warning"
            className="border-amber-500/30 bg-amber-500/15 text-amber-300"
          >
            {bufferedCount} buffered
          </Badge>
        ) : null}

        <div className="relative ml-auto w-full sm:w-56">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter logs…"
            aria-label="Filter logs"
            className="h-7 w-full rounded-md border border-white/10 bg-white/5 pl-8 pr-2 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus-visible:border-sky-500/50 focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>

        <div className="flex items-center gap-1">
          <TerminalButton
            label={paused ? 'Resume' : 'Pause'}
            onClick={togglePause}
            icon={paused ? Play : Pause}
          />
          <TerminalButton
            label={copied ? 'Copied' : 'Copy'}
            onClick={() => void handleCopy()}
            icon={copied ? Check : Copy}
          />
          <TerminalButton
            label="Download"
            onClick={handleDownload}
            icon={ArrowDownToLine}
          />
          <TerminalButton label="Clear" onClick={clear} icon={Eraser} />
          <TerminalButton
            label="Reconnect"
            onClick={reconnect}
            icon={RotateCw}
          />
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className={cn(
          'min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12.5px] leading-[1.6]',
          !fill && 'h-[26rem]',
        )}
      >
        {status === 'error' ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              illustration="logs"
              className="border-white/10 bg-transparent text-slate-300"
              title="Log stream disconnected"
              description={
                <span className="text-slate-400">
                  {error ?? 'The agent closed the stream.'}
                </span>
              }
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={reconnect}
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden />
                  Reconnect
                </Button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-slate-500">
            {entries.length === 0
              ? 'Waiting for log output…'
              : `No lines match “${query}”.`}
          </p>
        ) : (
          filtered.map((entry, index) => {
            const level = detectLevel(entry);
            return (
              <div
                key={`${entry.timestamp}-${index}`}
                className="group flex gap-3 whitespace-pre-wrap break-words rounded px-1 hover:bg-white/[0.04]"
              >
                <span className="shrink-0 select-none text-slate-600 tabular-nums">
                  {formatLogTime(entry.timestamp)}
                </span>
                {level !== 'plain' ? (
                  <span
                    className={cn(
                      'h-fit shrink-0 rounded border px-1 text-[10px] font-semibold uppercase leading-4',
                      LEVEL_TAG[level],
                    )}
                  >
                    {level}
                  </span>
                ) : null}
                <span className={cn('min-w-0 flex-1', LEVEL_STYLE[level])}>
                  {highlight(entry.message, query)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-400">
        <span className="tabular-nums">
          {filtered.length} line{filtered.length === 1 ? '' : 's'}
          {query ? ` of ${entries.length}` : ''}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(event) => setAutoScroll(event.target.checked)}
            className="h-3 w-3 accent-sky-500"
          />
          Auto-scroll
        </label>
      </div>
    </div>
  );
}

function TerminalButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Play;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function formatLogTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp.slice(0, 12);
  }
  return date.toLocaleTimeString(undefined, { hour12: false });
}

function highlight(message: string, query: string) {
  const value = query.trim();
  if (!value) {
    return message;
  }
  const parts = message.split(new RegExp(`(${escapeRegExp(value)})`, 'ig'));
  return parts.map((part, index) =>
    part.toLowerCase() === value.toLowerCase() ? (
      <mark key={index} className="rounded bg-amber-400/30 text-amber-100">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
