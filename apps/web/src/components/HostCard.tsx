import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Cpu,
  MemoryStick,
  MoreHorizontal,
  Pencil,
  PlugZap,
  RefreshCw,
} from 'lucide-react';
import { OsIcon } from '@/components/OsIcon';
import { RenameHostDialog } from '@/components/RenameHostDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { Meter } from '@/components/charts/Sparkline';
import { MockBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/dropdown';
import { formatBytes, formatRelativeTime, osLabel } from '@/lib/format';
import { hostDisplayName } from '@/lib/host-name';
import { isStale, toHostResources } from '@/lib/metrics';
import { cn } from '@/lib/utils';
import { useIsAdmin } from '@/stores/auth';
import type { Host } from '@/types/api';

type HostCardProps = {
  host: Host;
  /** Real counts from `/hosts/:id/containers`; undefined while loading. */
  containerCount?: number;
  runningCount?: number;
  countsLoading?: boolean;
  onRefresh?: (hostId: string) => void;
};

export function HostCard({
  host,
  containerCount,
  runningCount,
  countsLoading = false,
  onRefresh,
}: HostCardProps) {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [renaming, setRenaming] = useState(false);
  const label = hostDisplayName(host);
  // Pushed by the agent on `metrics.host` and embedded in the /hosts response,
  // so the card needs no extra request.
  const resources = toHostResources(host.metrics);
  // A disconnected agent leaves its last sample behind; say so rather than
  // presenting a frozen number as current.
  const stale = resources.hasData && isStale(resources.collectedAt);

  return (
    <Card
      interactive
      className="group flex cursor-pointer flex-col"
      onClick={() => navigate(`/hosts/${host.id}`)}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
            <OsIcon os={host.os} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight">{label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {host.hostname}
              {' · '}
              {osLabel(host.os)} · {host.architecture} · Docker {host.version}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={host.status} />
          <Dropdown
            trigger={({ toggle, ...aria }) => (
              <button
                type="button"
                {...aria}
                aria-label={`Actions for ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle();
                }}
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </button>
            )}
          >
            {({ close }) => (
              <div onClick={(event) => event.stopPropagation()}>
                <DropdownItem
                  icon={<ArrowUpRight className="h-4 w-4" />}
                  onSelect={() => {
                    navigate(`/hosts/${host.id}`);
                    close();
                  }}
                >
                  Open host
                </DropdownItem>
                <DropdownItem
                  icon={<RefreshCw className="h-4 w-4" />}
                  onSelect={() => {
                    onRefresh?.(host.id);
                    close();
                  }}
                >
                  Refresh inventory
                </DropdownItem>
                {isAdmin ? (
                  <DropdownItem
                    icon={<Pencil className="h-4 w-4" />}
                    onSelect={() => {
                      setRenaming(true);
                      close();
                    }}
                  >
                    Rename
                  </DropdownItem>
                ) : null}
                <DropdownSeparator />
                <DropdownItem
                  icon={<PlugZap className="h-4 w-4" />}
                  destructive
                  disabled
                >
                  Disconnect agent
                </DropdownItem>
                <div className="px-2.5 pb-1">
                  <MockBadge
                    label="Disconnect: no endpoint"
                    title="The server has no agent-disconnect route yet"
                  />
                </div>
              </div>
            )}
          </Dropdown>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 px-5 pb-4 sm:grid-cols-4">
        <Stat
          label="Containers"
          value={countsLoading ? '—' : (containerCount ?? '—')}
        />
        <Stat
          label="Running"
          value={countsLoading ? '—' : (runningCount ?? '—')}
          accent={
            !countsLoading && (runningCount ?? 0) > 0
              ? 'text-success'
              : undefined
          }
        />
        <Stat
          label="Last seen"
          value={formatRelativeTime(host.lastSeen)}
          small
        />
        <Stat label="Agent" value={host.uuid.slice(0, 8)} mono small />
      </dl>

      <div className="mt-auto space-y-3 border-t border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" aria-hidden />
            Resources
          </span>
          <span
            className={cn(
              'text-[11px]',
              stale ? 'text-warning' : 'text-muted-foreground',
            )}
          >
            {resources.hasData
              ? `${stale ? 'Stale · ' : ''}${formatRelativeTime(resources.collectedAt)}`
              : 'Awaiting agent'}
          </span>
        </div>
        {resources.hasData ? (
          <div className={cn('space-y-3', stale && 'opacity-60')}>
            <Meter
              label={`CPU · ${resources.cpuCores} cores`}
              value={resources.cpuPercent}
            />
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MemoryStick className="h-3.5 w-3.5" aria-hidden />
                  Memory
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatBytes(resources.memoryUsedBytes)} /{' '}
                  {formatBytes(resources.memoryTotalBytes)}
                </span>
              </div>
              <Meter value={resources.memoryPercent} />
            </div>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            No sample yet. The agent pushes host CPU and memory every 10 seconds
            while it is connected.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-3">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/hosts/${host.id}`);
          }}
        >
          Open
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            onRefresh?.(host.id);
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled
          title="No agent-disconnect endpoint on the server yet"
          onClick={(event) => event.stopPropagation()}
          className="ml-auto"
        >
          <PlugZap className="h-3.5 w-3.5" aria-hidden />
          Disconnect
        </Button>
      </div>

      {isAdmin && renaming ? (
        <RenameHostDialog host={host} onClose={() => setRenaming(false)} />
      ) : null}
    </Card>
  );
}

function Stat({
  label,
  value,
  accent,
  mono = false,
  small = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-1 font-semibold tabular-nums',
          small ? 'text-xs font-medium leading-tight' : 'truncate text-lg',
          mono && 'truncate font-mono text-xs',
          accent,
        )}
      >
        {value}
      </dd>
    </div>
  );
}
