import {
  AlertTriangle,
  Eye,
  EyeOff,
  Play,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Square,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { DataList, MiniTable } from '@/components/ui/data-list';
import { Drawer, DrawerSection } from '@/components/ui/drawer';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { useContainerInspect } from '@/hooks/useContainerInspect';
import { formatDateTime, formatRelativeTime, shortId } from '@/lib/format';
import { ApiError } from '@/services/api';
import type { ContainerAction } from '@/types/api';
import type { ContainerRow } from '@/components/ContainerTable';

const NEEDS_ADMIN = 'Requires the ADMIN role';

type ContainerInspectDrawerProps = {
  hostId: string;
  container: ContainerRow | null;
  onClose: () => void;
  onViewLogs?: (container: ContainerRow) => void;
  onAction?: (container: ContainerRow, action: ContainerAction) => void;
  busyKey?: string | null;
  /** Cosmetic gate; the API still enforces ADMIN on lifecycle routes. */
  canManage?: boolean;
};

const hideValue = (key: string) => {
  const lower_key = key.toLocaleLowerCase();
  return (
    lower_key.includes('pass') ||
    lower_key.includes('database_url') ||
    lower_key.includes('db_url') ||
    lower_key.includes('key') ||
    lower_key.includes('token') ||
    lower_key.includes('secret') ||
    lower_key.includes('auth') ||
    lower_key.includes('cred') ||
    lower_key.includes('private') ||
    lower_key.includes('certificate') ||
    lower_key.includes('cert') ||
    lower_key.includes('ssh') ||
    lower_key.includes('rsa') ||
    lower_key.includes('pem') ||
    lower_key.includes('pfx') ||
    lower_key.includes('p12') ||
    lower_key.includes('p7b') ||
    lower_key.includes('p7c') ||
    lower_key.includes('p7m') ||
    lower_key.includes('p7s') ||
    lower_key.includes('p7r') ||
    lower_key.includes('p7t') ||
    lower_key.includes('p7u') ||
    lower_key.includes('p7v') ||
    lower_key.includes('p7w') ||
    lower_key.includes('p7x') ||
    lower_key.includes('p7y') ||
    lower_key.includes('p7z')
  );
};

export function ContainerInspectDrawer({
  hostId,
  container,
  onClose,
  onViewLogs,
  onAction,
  busyKey = null,
  canManage = true,
}: ContainerInspectDrawerProps) {
  const inspectQuery = useContainerInspect(hostId, container?.id ?? undefined);
  const details = inspectQuery.data?.container ?? null;

  const errorMessage =
    inspectQuery.error instanceof ApiError
      ? inspectQuery.error.message
      : inspectQuery.error instanceof Error
        ? inspectQuery.error.message
        : inspectQuery.data?.error;

  if (!container) {
    return null;
  }

  const running =
    (details?.state.running ?? container.state === 'running') === true;
  const rowBusy = busyKey?.startsWith(`${container.id}:`) ?? false;

  return (
    <Drawer
      open
      onClose={onClose}
      title={details?.name?.replace(/^\//, '') ?? container.name}
      subtitle={
        <span className="font-mono">
          {shortId(details?.id ?? container.id)} · {container.image}
        </span>
      }
      headerExtra={
        <>
          <StatusBadge status={details?.state.status ?? container.state} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh inspect data"
            title="Refresh"
            disabled={inspectQuery.isFetching}
            onClick={() => void inspectQuery.refetch()}
          >
            <RefreshCw
              className={
                inspectQuery.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'
              }
              aria-hidden
            />
          </Button>
        </>
      }
      footer={
        <>
          <Button
            type="button"
            size="sm"
            onClick={() => onViewLogs?.(container)}
            disabled={!onViewLogs}
          >
            <ScrollText className="h-3.5 w-3.5" aria-hidden />
            Open logs
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            title={canManage ? undefined : NEEDS_ADMIN}
            disabled={running || rowBusy || !onAction || !canManage}
            onClick={() => onAction?.(container, 'start')}
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Start
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            title={canManage ? undefined : NEEDS_ADMIN}
            disabled={!running || rowBusy || !onAction || !canManage}
            onClick={() => onAction?.(container, 'stop')}
          >
            <Square className="h-3.5 w-3.5" aria-hidden />
            Stop
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            title={canManage ? undefined : NEEDS_ADMIN}
            disabled={!running || rowBusy || !onAction || !canManage}
            onClick={() => onAction?.(container, 'restart')}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Restart
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            className="ml-2"
            title={canManage ? undefined : NEEDS_ADMIN}
            disabled={rowBusy || !onAction || !canManage}
            onClick={() => onAction?.(container, 'remove')}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <CopyButton
              variant="button"
              value={details?.id ?? container.id}
              label="Copy ID"
            />
            <CopyButton
              variant="button"
              value={details?.image ?? container.image}
              label="Copy image"
            />
          </div>
        </>
      }
    >
      {inspectQuery.isLoading ? (
        <InspectSkeleton />
      ) : errorMessage || !details ? (
        <div className="p-5">
          <div className="flex items-start gap-3 rounded-lg border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Inspect failed</p>
              <p className="mt-0.5 opacity-90">
                {errorMessage ?? 'The agent returned no inspect payload.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <DrawerSection title="General">
            <DataList
              items={[
                { label: 'Name', value: details.name.replace(/^\//, '') },
                {
                  label: 'Container ID',
                  value: shortId(details.id, 20),
                  mono: true,
                  copy: details.id,
                },
                {
                  label: 'Image',
                  value: details.image,
                  mono: true,
                  copy: details.image,
                  span: true,
                },
                {
                  label: 'Status',
                  value: (
                    <StatusBadge
                      status={details.state.status}
                      live={details.state.running}
                    />
                  ),
                },
                {
                  label: 'Restart policy',
                  value: details.restartPolicy || 'no',
                  mono: true,
                },
                {
                  label: 'Created',
                  value: `${formatDateTime(details.created)} · ${formatRelativeTime(details.created)}`,
                },
                {
                  label: 'Started',
                  value: details.startedAt
                    ? `${formatDateTime(details.startedAt)} · ${formatRelativeTime(details.startedAt)}`
                    : 'Never started',
                },
              ]}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <RuntimeFlag label="Running" active={details.state.running} />
              <RuntimeFlag
                label="Paused"
                active={details.state.paused}
                tone="warning"
              />
              <RuntimeFlag
                label="Restarting"
                active={details.state.restarting}
                tone="warning"
              />
            </div>
          </DrawerSection>

          <DrawerSection title="Configuration">
            <DataList
              columns={1}
              items={[
                {
                  label: 'Working directory',
                  value: details.workingDir || '/',
                  mono: true,
                },
                {
                  label: 'Entrypoint',
                  value:
                    details.entrypoint?.length > 0
                      ? details.entrypoint.join(' ')
                      : 'None',
                  mono: true,
                  copy: details.entrypoint?.join(' '),
                },
                {
                  label: 'Command',
                  value:
                    details.cmd?.length > 0 ? details.cmd.join(' ') : 'None',
                  mono: true,
                  copy: details.cmd?.join(' '),
                },
              ]}
            />
          </DrawerSection>

          <EnvironmentSection env={details.env} />

          <DrawerSection title={`Ports (${details.ports.length})`}>
            <MiniTable
              headers={['Container port', 'Host port', 'Protocol']}
              empty="No published ports"
              rows={details.ports.map((port) => [
                <span key="private" className="font-mono">
                  {port.private}
                </span>,
                <span key="public" className="font-mono">
                  {port.public ? (
                    port.public
                  ) : (
                    <span className="text-muted-foreground">Not published</span>
                  )}
                </span>,
                <span key="protocol" className="uppercase">
                  {port.protocol}
                </span>,
              ])}
            />
          </DrawerSection>

          <DrawerSection title={`Volumes (${details.mounts.length})`}>
            <MiniTable
              headers={['Source', 'Destination', 'Mode']}
              empty="No mounts"
              rows={details.mounts.map((mount) => [
                <span key="source" className="font-mono" title={mount.source}>
                  {mount.source || 'anonymous'}
                </span>,
                <span key="target" className="font-mono" title={mount.target}>
                  {mount.target}
                </span>,
                <span key="mode" className="font-mono">
                  {mount.mode || 'rw'}
                </span>,
              ])}
            />
          </DrawerSection>

          <DrawerSection
            title={`Networks (${details.networks.length})`}
            // action={
            //   <MockBadge
            //     label="Gateway + DNS mocked"
            //     title="ContainerNetwork only carries name and ip in the agent protocol"
            //   />
            // }
          >
            <MiniTable
              headers={['Network', 'IP address', 'Gateway', 'DNS']}
              empty="No networks attached"
              rows={details.networks.map((network) => {
                return [
                  <span key="name" className="font-medium">
                    {network.name}
                  </span>,
                  <span key="ip" className="font-mono">
                    {network.ip || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>,
                  <span
                    key="gateway"
                    className="font-mono text-muted-foreground"
                  >
                    {network.gateway}
                  </span>,
                  <span key="dns" className="font-mono text-muted-foreground">
                    {network.dns.join(', ')}
                  </span>,
                ];
              })}
            />
          </DrawerSection>
        </>
      )}
    </Drawer>
  );
}

function EnvironmentSection({ env }: { env: string[] }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <DrawerSection
      title={`Environment variables (${env.length})`}
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden />
            )}
            {revealed ? 'Hide values' : 'Show values'}
          </Button>
        </div>
      }
    >
      <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {env.map((entry, index) => (
          <div
            key={index}
            className="group flex items-center gap-3 px-3 py-2 text-[13px] transition-colors hover:bg-accent/50"
          >
            <span className="w-40 shrink-0 truncate font-mono font-medium">
              {entry.split('=')[0]}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
              {hideValue(entry.split('=')[0]) && !revealed
                ? '••••••••••••'
                : entry.split('=')[1]}
            </span>
            <CopyButton
              value={`${entry.split('=')[0]}=${entry.split('=')[1]}`}
              label="Copy"
            />
          </div>
        ))}
      </div>
    </DrawerSection>
  );
}

function RuntimeFlag({
  label,
  active,
  tone = 'success',
}: {
  label: string;
  active: boolean;
  tone?: 'success' | 'warning';
}) {
  return (
    <span
      className={
        active
          ? tone === 'success'
            ? 'inline-flex items-center gap-1.5 rounded-md border border-success/25 bg-success/10 px-2 py-0.5 text-xs font-medium text-success'
            : 'inline-flex items-center gap-1.5 rounded-md border border-warning/25 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning'
          : 'inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground'
      }
    >
      {label}: {active ? 'yes' : 'no'}
    </span>
  );
}

function InspectSkeleton() {
  return (
    <div className="space-y-6 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-md" />
      <SkeletonText lines={4} />
      <Skeleton className="h-32 w-full rounded-md" />
    </div>
  );
}
