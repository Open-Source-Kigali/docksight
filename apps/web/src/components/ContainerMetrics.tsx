import { useState } from 'react';
import { ArrowDownUp, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import {
  ChartLegend,
  TimeSeriesChart,
  type Series,
} from '@/components/charts/TimeSeriesChart';
import { StatTile } from '@/components/StatTile';
import { MockBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBytes, formatPercent } from '@/lib/format';
import { mockContainerMetrics } from '@/lib/mock';

/**
 * Container metrics view. Every number here is MOCK — the agent protocol has
 * no `container.stats` message yet, so nothing on this screen comes from the
 * API. Swap `mockContainerMetrics` for the real hook when it lands.
 */
export function ContainerMetrics({
  containerId,
  containerName,
}: {
  containerId: string;
  containerName?: string;
}) {
  const metrics = mockContainerMetrics(containerId);
  const secondsAgo = (index: number, length: number) =>
    `-${(length - index - 1) * 5}s`;

  const networkSeries: Series[] = [
    {
      key: 'in',
      label: 'Network in',
      values: metrics.networkInSeries,
      color: 'series-1',
    },
    {
      key: 'out',
      label: 'Network out',
      values: metrics.networkOutSeries,
      color: 'series-2',
    },
  ];

  const diskSeries: Series[] = [
    {
      key: 'read',
      label: 'Disk read',
      values: metrics.diskReadSeries,
      color: 'series-1',
    },
    {
      key: 'write',
      label: 'Disk write',
      values: metrics.diskWriteSeries,
      color: 'series-2',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/5 px-4 py-2.5 text-sm text-warning">
        <MockBadge label="Mock" />
        <span>
          Live container statistics are not in the agent protocol yet — these
          series are generated client-side
          {containerName ? ` for ${containerName}` : ''}.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="CPU"
          value={formatPercent(metrics.cpuPercent)}
          hint="of host cores"
          icon={Cpu}
        />
        <StatTile
          label="Memory"
          value={formatBytes(metrics.memoryUsedBytes)}
          hint={`of ${formatBytes(metrics.memoryLimitBytes)} limit`}
          icon={MemoryStick}
          tone={metrics.memoryPercent > 85 ? 'danger' : 'default'}
        />
        <StatTile
          label="Network I/O"
          value={`${formatBytes(metrics.networkInBytes)}/s`}
          hint={`${formatBytes(metrics.networkOutBytes)}/s out`}
          icon={ArrowDownUp}
        />
        <StatTile
          label="Disk I/O"
          value={`${formatBytes(metrics.diskReadBytes)}/s`}
          hint={`${formatBytes(metrics.diskWriteBytes)}/s write`}
          icon={HardDrive}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="CPU usage"
          series={[
            {
              key: 'cpu',
              label: 'CPU',
              values: metrics.cpuSeries,
              color: 'series-1',
            },
          ]}
          format={(value) => `${Math.round(value)}%`}
          yMax={100}
          xLabel={secondsAgo}
        />
        <ChartCard
          title="Memory usage"
          series={[
            {
              key: 'memory',
              label: 'Memory',
              values: metrics.memorySeries,
              color: 'series-1',
            },
          ]}
          format={(value) => `${Math.round(value)}%`}
          yMax={100}
          xLabel={secondsAgo}
        />
        <ChartCard
          title="Network throughput"
          series={networkSeries}
          format={(value) => formatBytes(value)}
          xLabel={secondsAgo}
        />
        <ChartCard
          title="Disk I/O"
          series={diskSeries}
          format={(value) => formatBytes(value)}
          xLabel={secondsAgo}
        />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  series,
  format,
  yMax,
  xLabel,
}: {
  title: string;
  series: Series[];
  format: (value: number) => string;
  yMax?: number;
  xLabel: (index: number, length: number) => string;
}) {
  const [showTable, setShowTable] = useState(false);
  const latest = series[0]?.values.at(-1) ?? 0;

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={showTable}
              onClick={() => setShowTable((current) => !current)}
            >
              {showTable ? 'Chart' : 'Table'}
            </Button>
          }
        >
          {title}
        </CardTitle>
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xl font-semibold tabular-nums">
            {format(latest)}
          </p>
          <ChartLegend series={series} />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {showTable ? (
          <div className="max-h-[180px] overflow-y-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-secondary/80">
                <tr>
                  <th className="px-3 py-1.5 font-medium text-muted-foreground">
                    Time
                  </th>
                  {series.map((entry) => (
                    <th
                      key={entry.key}
                      className="px-3 py-1.5 font-medium text-muted-foreground"
                    >
                      {entry.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series[0].values.map((_, index) => (
                  <tr key={index} className="border-t border-border">
                    <td className="px-3 py-1 tabular-nums text-muted-foreground">
                      {xLabel(index, series[0].values.length)}
                    </td>
                    {series.map((entry) => (
                      <td key={entry.key} className="px-3 py-1 tabular-nums">
                        {format(entry.values[index] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <TimeSeriesChart
            series={series}
            format={format}
            yMax={yMax}
            xLabel={xLabel}
          />
        )}
      </CardContent>
    </Card>
  );
}
