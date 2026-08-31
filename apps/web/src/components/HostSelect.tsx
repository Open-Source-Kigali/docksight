import { ChevronDown, Server } from 'lucide-react';
import { StatusDot } from '@/components/ui/badge';
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
} from '@/components/ui/dropdown';
import { statusTone } from '@/lib/status';
import { hostDisplayName } from '@/lib/host-name';
import type { Host } from '@/types/api';

export function HostSelect({
  hosts,
  value,
  onChange,
}: {
  hosts: Host[];
  value: string | undefined;
  onChange: (hostId: string) => void;
}) {
  const selected = hosts.find((host) => host.id === value);

  return (
    <Dropdown
      align="start"
      trigger={({ toggle, ...aria }) => (
        <button
          type="button"
          onClick={toggle}
          {...aria}
          className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <Server className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="max-w-[12rem] truncate">
            {selected ? hostDisplayName(selected) : 'Select host'}
          </span>
          {selected ? <StatusDot tone={statusTone(selected.status)} /> : null}
          <ChevronDown
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden
          />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>Hosts</DropdownLabel>
          {hosts.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">
              No hosts registered
            </p>
          ) : (
            hosts.map((host) => (
              <DropdownItem
                key={host.id}
                icon={<StatusDot tone={statusTone(host.status)} />}
                onSelect={() => {
                  onChange(host.id);
                  close();
                }}
              >
                {hostDisplayName(host)}
              </DropdownItem>
            ))
          )}
        </>
      )}
    </Dropdown>
  );
}
