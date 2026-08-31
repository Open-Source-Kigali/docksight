import { useMemo, useState } from 'react';
import { Boxes, HardDrive, Network } from 'lucide-react';
import { Badge, MockBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/input';
import { formatBytes, formatRelativeTime, shortId } from '@/lib/format';
import { mockImages, mockNetworks, mockVolumes } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * Images / Networks / Volumes are entirely MOCK — the agent protocol has no
 * `image.*`, `network.*` or `volume.*` message types yet, so there is nothing
 * to fetch. Layout and interactions are real so the screens can be wired up
 * once the endpoints land.
 */

export function MockNotice({ what }: { what: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/5 px-4 py-2.5 text-sm text-warning">
      <MockBadge label="Mock" />
      <span>
        {what} are not exposed by the DockSight API yet — this table renders
        placeholder rows.
      </span>
    </div>
  );
}

function TableShell({
  headers,
  children,
  minWidth = '48rem',
}: {
  headers: string[];
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-sm"
          style={{ minWidth }}
        >
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {headers.map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const ROW =
  'border-b border-border transition-colors last:border-b-0 hover:bg-accent/50';

export function ImagesTable({ hostId }: { hostId: string }) {
  const [query, setQuery] = useState('');
  const images = useMemo(() => mockImages(hostId), [hostId]);
  const filtered = images.filter((image) =>
    `${image.repository}:${image.tag}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <MockNotice what="Docker images" />
      <SearchInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search images…"
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState
          illustration="images"
          title="This host has no Docker images"
          description="Images pulled by the Docker daemon on this host will be listed here."
        />
      ) : (
        <TableShell
          headers={[
            'Repository',
            'Tag',
            'Image ID',
            'Size',
            'Created',
            'In use',
          ]}
        >
          {filtered.map((image) => (
            <tr key={`${image.repository}:${image.tag}`} className={ROW}>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Boxes
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                  {image.repository}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge tone="neutral" className="font-mono">
                  {image.tag}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">
                {shortId(image.id.replace('sha256:', ''))}
              </td>
              <td className="px-4 py-3 tabular-nums">
                {formatBytes(image.sizeBytes)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatRelativeTime(image.created)}
              </td>
              <td className="px-4 py-3">
                {image.containers > 0 ? (
                  <Badge tone="success">
                    {image.containers} container
                    {image.containers === 1 ? '' : 's'}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Unused</span>
                )}
              </td>
            </tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}

export function NetworksTable({ hostId }: { hostId: string }) {
  const networks = useMemo(() => mockNetworks(hostId), [hostId]);

  return (
    <div className="space-y-4">
      <MockNotice what="Docker networks" />
      <TableShell
        headers={['Name', 'Driver', 'Scope', 'Subnet', 'Gateway', 'Containers']}
      >
        {networks.map((network) => (
          <tr key={network.name} className={ROW}>
            <td className="px-4 py-3">
              <span className="inline-flex items-center gap-2 font-medium">
                <Network
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                {network.name}
              </span>
            </td>
            <td className="px-4 py-3">
              <Badge tone="neutral" className="font-mono">
                {network.driver}
              </Badge>
            </td>
            <td className="px-4 py-3 text-muted-foreground">{network.scope}</td>
            <td className="px-4 py-3 font-mono text-[13px]">
              {network.subnet}
            </td>
            <td className="px-4 py-3 font-mono text-[13px]">
              {network.gateway}
            </td>
            <td className="px-4 py-3 tabular-nums">{network.attached}</td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}

export function VolumesTable({ hostId }: { hostId: string }) {
  const volumes = useMemo(() => mockVolumes(hostId), [hostId]);

  return (
    <div className="space-y-4">
      <MockNotice what="Docker volumes" />
      <TableShell
        headers={['Name', 'Driver', 'Mount point', 'Size', 'Created', 'Status']}
        minWidth="56rem"
      >
        {volumes.map((volume) => (
          <tr key={volume.name} className={ROW}>
            <td className="px-4 py-3">
              <span className="inline-flex items-center gap-2 font-medium">
                <HardDrive
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                {volume.name}
              </span>
            </td>
            <td className="px-4 py-3">
              <Badge tone="neutral" className="font-mono">
                {volume.driver}
              </Badge>
            </td>
            <td
              className={cn(
                'max-w-[22rem] truncate px-4 py-3 font-mono text-[13px] text-muted-foreground',
              )}
              title={volume.mountpoint}
            >
              {volume.mountpoint}
            </td>
            <td className="px-4 py-3 tabular-nums">
              {formatBytes(volume.sizeBytes)}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {formatRelativeTime(volume.created)}
            </td>
            <td className="px-4 py-3">
              {volume.inUse ? (
                <Badge tone="success" dot>
                  In use
                </Badge>
              ) : (
                <Badge tone="neutral" dot>
                  Dangling
                </Badge>
              )}
            </td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}
