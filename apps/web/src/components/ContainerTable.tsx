import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  Info,
  LoaderCircle,
  MoreHorizontal,
  Play,
  RotateCcw,
  ScrollText,
  Square,
  Trash2,
} from 'lucide-react';
import { StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { FilterChips } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { copyToClipboard, formatDateTime, shortId } from '@/lib/format';
import { statusTone } from '@/lib/status';
import type { Container, ContainerAction } from '@/types/api';
import { Link } from 'react-router-dom';

export type ContainerRow = Container & { hostId?: string; hostname?: string };

type StatusFilter = 'all' | 'running' | 'exited' | 'paused' | 'restarting';

const PAGE_SIZE = 10;

type ContainerTableProps = {
  containers: ContainerRow[];
  busyKey?: string | null;
  showHostColumn?: boolean;
  /**
   * Whether the signed-in user may run lifecycle actions. Cosmetic only — the
   * API enforces the ADMIN role on start/stop/restart regardless.
   */
  canManage?: boolean;
  onAction?: (container: ContainerRow, action: ContainerAction) => void;
  onInspect?: (container: ContainerRow) => void;
  onViewLogs?: (container: ContainerRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
};

const NEEDS_ADMIN = 'Requires the ADMIN role';

export function ContainerTable({
  containers,
  busyKey = null,
  showHostColumn = false,
  canManage = true,
  onAction,
  onInspect,
  onViewLogs,
  emptyTitle = 'No containers running',
  emptyDescription = 'Once this host reports containers over the agent connection they show up here.',
}: ContainerTableProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [contextMenu, setContextMenu] = useState<{
    container: ContainerRow;
    x: number;
    y: number;
  } | null>(null);

  const counts = useMemo(() => {
    const tally = { running: 0, exited: 0, paused: 0, restarting: 0 };
    for (const container of containers) {
      const state = (container.state || '').toLowerCase();
      if (state in tally) {
        tally[state as keyof typeof tally] += 1;
      }
    }
    return tally;
  }, [containers]);

  const renderPort = (ports: any[]): string => {
    if (!ports || ports.length === 0) return '-';
    return ports[0].PublicPort + ':' + ports[0].PrivatePort;
  };

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return containers.filter((container) => {
      const state = (container.state || '').toLowerCase();
      if (filter !== 'all' && state !== filter) {
        return false;
      }
      if (!value) {
        return true;
      }
      return (
        container.name.toLowerCase().includes(value) ||
        container.image.toLowerCase().includes(value) ||
        container.id.toLowerCase().includes(value) ||
        (container.hostname ?? '').toLowerCase().includes(value)
      );
    });
  }, [containers, filter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const columnCount = showHostColumn ? 9 : 8;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search name, image or ID…"
          className="w-full lg:max-w-sm"
        />
        <FilterChips
          value={filter}
          onChange={setFilter}
          items={[
            { key: 'all', label: 'All', count: containers.length },
            {
              key: 'running',
              label: 'Running',
              count: counts.running,
              dot: <StatusDot tone="success" />,
            },
            {
              key: 'exited',
              label: 'Exited',
              count: counts.exited,
              dot: <StatusDot tone="danger" />,
            },
            {
              key: 'paused',
              label: 'Paused',
              count: counts.paused,
              dot: <StatusDot tone="warning" />,
            },
            {
              key: 'restarting',
              label: 'Restarting',
              count: counts.restarting,
              dot: <StatusDot tone="warning" />,
            },
          ]}
        />
      </div>

      {containers.length === 0 ? (
        <EmptyState
          illustration="containers"
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration="search"
          title="No containers match your filters"
          description="Try a different search term, or clear the status filter."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="w-8 px-4 py-2.5" aria-label="Status" />
                  <Th>Name</Th>
                  {showHostColumn ? <Th>Host</Th> : null}
                  <Th>Image</Th>
                  <Th>Container ID</Th>
                  <Th>Ports</Th>
                  <Th>Created</Th>
                  <Th>State</Th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((container) => {
                  const running =
                    (container.state || '').toLowerCase() === 'running';
                  const rowBusy =
                    busyKey?.startsWith(`${container.id}:`) ?? false;
                  const busyAction = busyKey?.split(':')[1] as
                    ContainerAction | undefined;

                  return (
                    <tr
                      key={`${container.hostId ?? ''}${container.id}`}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setContextMenu({
                          container,
                          x: event.clientX,
                          y: event.clientY,
                        });
                      }}
                      onClick={() => onInspect?.(container)}
                      className="group cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-accent/50"
                    >
                      <td className="px-4 py-3">
                        <StatusDot
                          tone={statusTone(container.state)}
                          pulse={running}
                        />
                      </td>
                      <td className="max-w-[16rem] px-4 py-3">
                        <span className="block truncate font-medium text-foreground">
                          {container.name}
                        </span>
                      </td>
                      {showHostColumn ? (
                        <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                          <span className="block truncate">
                            {container.hostname}
                          </span>
                        </td>
                      ) : null}
                      <td className="max-w-[18rem] px-4 py-3 text-muted-foreground">
                        <span className="block truncate font-mono text-[13px]">
                          {container.image}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-mono text-[13px] text-muted-foreground">
                          {shortId(container.id)}
                          <button
                            type="button"
                            aria-label="Copy container ID"
                            title="Copy container ID"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyToClipboard(container.id);
                            }}
                            className="rounded p-0.5 opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                          >
                            <Copy className="h-3 w-3" aria-hidden />
                          </button>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {renderPort(container.ports) !== '-' ? (
                          <Link
                            target="_blank"
                            to={`http://localhost:${container.ports[0]?.PublicPort}`}
                            className="block hover:underline hover:text-blue-700 hover:font-bold truncate font-mono text-[13px]"
                          >
                            {renderPort(container.ports)}
                          </Link>
                        ) : (
                          renderPort(container.ports)
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-mono text-[13px] text-muted-foreground">
                          {formatDateTime(
                            new Date(container.created * 1000).toISOString(),
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={container.state} live={running} />
                        {container.status ? (
                          <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                            {container.status}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconAction
                            label="Start"
                            icon={Play}
                            disabled={
                              running || rowBusy || !onAction || !canManage
                            }
                            title={canManage ? undefined : NEEDS_ADMIN}
                            loading={rowBusy && busyAction === 'start'}
                            onClick={() => onAction?.(container, 'start')}
                          />
                          <IconAction
                            label="Stop"
                            icon={Square}
                            disabled={
                              !running || rowBusy || !onAction || !canManage
                            }
                            title={canManage ? undefined : NEEDS_ADMIN}
                            loading={rowBusy && busyAction === 'stop'}
                            onClick={() => onAction?.(container, 'stop')}
                          />
                          <IconAction
                            label="Restart"
                            icon={RotateCcw}
                            disabled={
                              !running || rowBusy || !onAction || !canManage
                            }
                            title={canManage ? undefined : NEEDS_ADMIN}
                            loading={rowBusy && busyAction === 'restart'}
                            onClick={() => onAction?.(container, 'restart')}
                          />
                          <Dropdown
                            trigger={({ toggle, ...aria }) => (
                              <button
                                type="button"
                                {...aria}
                                aria-label={`More actions for ${container.name}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggle();
                                }}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <MoreHorizontal
                                  className="h-4 w-4"
                                  aria-hidden
                                />
                              </button>
                            )}
                          >
                            {({ close }) => (
                              <div onClick={(event) => event.stopPropagation()}>
                                <RowMenuItems
                                  container={container}
                                  canManage={canManage}
                                  onAction={onAction}
                                  onInspect={onInspect}
                                  onViewLogs={onViewLogs}
                                  close={close}
                                />
                              </div>
                            )}
                          </Dropdown>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={columnCount} className="p-0">
                    <Pagination
                      page={currentPage}
                      pageCount={pageCount}
                      total={filtered.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={setPage}
                      label="containers"
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {contextMenu
        ? createPortal(
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
            >
              <RowMenuItems
                container={contextMenu.container}
                canManage={canManage}
                onInspect={onInspect}
                onViewLogs={onViewLogs}
                onAction={onAction}
                close={() => setContextMenu(null)}
              />
            </ContextMenu>,
            document.body,
          )
        : null}
    </div>
  );
}

function RowMenuItems({
  container,
  canManage = true,
  onInspect,
  onViewLogs,
  onAction,
  close,
}: {
  container: ContainerRow;
  canManage?: boolean;
  onInspect?: (container: ContainerRow) => void;
  onViewLogs?: (container: ContainerRow) => void;
  onAction?: (container: ContainerRow, action: ContainerAction) => void;
  close: () => void;
}) {
  const running = (container.state || '').toLowerCase() === 'running';

  return (
    <>
      <DropdownItem
        icon={<Info className="h-4 w-4" />}
        onSelect={() => {
          onInspect?.(container);
          close();
        }}
      >
        Inspect
      </DropdownItem>
      <DropdownItem
        icon={<ScrollText className="h-4 w-4" />}
        onSelect={() => {
          onViewLogs?.(container);
          close();
        }}
      >
        Logs
      </DropdownItem>
      {onAction ? (
        <>
          <DropdownSeparator />
          <DropdownItem
            icon={<Play className="h-4 w-4" />}
            disabled={running || !canManage}
            onSelect={() => {
              onAction(container, 'start');
              close();
            }}
          >
            Start
          </DropdownItem>
          <DropdownItem
            icon={<Square className="h-4 w-4" />}
            disabled={!running || !canManage}
            onSelect={() => {
              onAction(container, 'stop');
              close();
            }}
          >
            Stop
          </DropdownItem>
          <DropdownItem
            icon={<RotateCcw className="h-4 w-4" />}
            disabled={!running || !canManage}
            onSelect={() => {
              onAction(container, 'restart');
              close();
            }}
          >
            Restart
          </DropdownItem>
          {!canManage ? (
            <p className="px-2.5 pb-1 text-[11px] text-muted-foreground">
              {NEEDS_ADMIN}
            </p>
          ) : null}
        </>
      ) : null}
      <DropdownSeparator />
      <DropdownItem
        icon={<Copy className="h-4 w-4" />}
        onSelect={() => {
          void copyToClipboard(container.id);
          close();
        }}
      >
        Copy container ID
      </DropdownItem>
      <DropdownItem
        icon={<Copy className="h-4 w-4" />}
        onSelect={() => {
          void copyToClipboard(container.image);
          close();
        }}
      >
        Copy image
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem
        icon={<Trash2 className="h-4 w-4" />}
        destructive
        disabled={!onAction || !canManage}
        onSelect={() => {
          onAction?.(container, 'remove');
          close();
        }}
      >
        Delete
      </DropdownItem>
    </>
  );
}

function ContextMenu({
  x,
  y,
  onClose,
  children,
}: {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const dismiss = () => onClose();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', dismiss);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 230);
  const top = Math.min(y, window.innerHeight - 340);

  return (
    <div
      role="menu"
      style={{ left, top }}
      onClick={(event) => event.stopPropagation()}
      className="animate-pop-in fixed z-50 min-w-[13rem] rounded-lg border border-border bg-popover p-1 shadow-xl"
    >
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">{children}</span>
    </th>
  );
}

function IconAction({
  label,
  icon: Icon,
  disabled,
  loading,
  title,
  onClick,
}: {
  label: string;
  icon: typeof Play;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {loading ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Icon className="h-3.5 w-3.5" aria-hidden />
      )}
    </Button>
  );
}
