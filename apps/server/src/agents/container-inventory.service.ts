import { Injectable } from '@nestjs/common';
import type { ContainerSummary } from '@docksight/protocol';

export type HostContainerSnapshot = {
  hostId: string;
  agentUuid: string;
  containers: ContainerSummary[];
  updatedAt: Date;
};

/**
 * In-memory container inventory from agent discovery (read-only for the dashboard).
 * Not persisted to the database in this increment.
 */
@Injectable()
export class ContainerInventoryService {
  private readonly byHostId = new Map<string, HostContainerSnapshot>();
  private readonly hostIdByUuid = new Map<string, string>();

  rememberHost(hostId: string, agentUuid: string) {
    this.hostIdByUuid.set(agentUuid, hostId);
    const existing = this.byHostId.get(hostId);
    if (!existing) {
      this.byHostId.set(hostId, {
        hostId,
        agentUuid,
        containers: [],
        updatedAt: new Date(0),
      });
    } else if (existing.agentUuid !== agentUuid) {
      this.byHostId.set(hostId, { ...existing, agentUuid });
    }
  }

  setContainers(
    agentUuid: string,
    containers: ContainerSummary[],
    hostId?: string,
  ): HostContainerSnapshot | null {
    const resolvedHostId = hostId ?? this.hostIdByUuid.get(agentUuid);
    if (!resolvedHostId) {
      return null;
    }

    const snapshot: HostContainerSnapshot = {
      hostId: resolvedHostId,
      agentUuid,
      containers,
      updatedAt: new Date(),
    };
    this.byHostId.set(resolvedHostId, snapshot);
    this.hostIdByUuid.set(agentUuid, resolvedHostId);
    return snapshot;
  }

  getByHostId(hostId: string): HostContainerSnapshot | null {
    return this.byHostId.get(hostId) ?? null;
  }

  getByUuid(agentUuid: string): HostContainerSnapshot | null {
    const hostId = this.hostIdByUuid.get(agentUuid);
    if (!hostId) {
      return null;
    }
    return this.byHostId.get(hostId) ?? null;
  }
}
