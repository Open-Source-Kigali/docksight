import { LogsViewer } from '@/components/LogsViewer';
import { Drawer } from '@/components/ui/drawer';
import { shortId } from '@/lib/format';
import type { ContainerRow } from '@/components/ContainerTable';

export function ContainerLogsDrawer({
  hostId,
  container,
  onClose,
}: {
  hostId: string;
  container: ContainerRow | null;
  onClose: () => void;
}) {
  if (!container) {
    return null;
  }

  return (
    <Drawer
      open
      size="lg"
      onClose={onClose}
      title={`Logs · ${container.name.replace(/^\//, '')}`}
      subtitle={
        <span className="font-mono">
          {shortId(container.id)} · {container.image}
        </span>
      }
    >
      <div className="h-[calc(100vh-8rem)] p-4">
        <LogsViewer
          fill
          hostId={hostId}
          containerId={container.id}
          containerName={container.name}
        />
      </div>
    </Drawer>
  );
}
