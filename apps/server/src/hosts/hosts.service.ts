import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ContainerSummary,
  HostCpuMetrics,
  HostMemoryMetrics,
} from '@docksight/protocol';
import type { Agent } from '../../generated/prisma/client';
import { AgentsService } from '../agents/agents.service';
import { ContainerInventoryService } from '../agents/container-inventory.service';
import {
  HostMetricsService,
  type HostMetricsSnapshot,
} from '../metrics/host-metrics.service';

export type HostMetricsDto = {
  hostId: string;
  cpu: HostCpuMetrics | null;
  memory: HostMemoryMetrics | null;
  /** When the agent sampled the host; null until the first sample arrives. */
  collectedAt: string | null;
};

export type HostDto = {
  id: string;
  uuid: string;
  hostname: string;
  /** Operator label, or hostname when none has been set. */
  displayName: string;
  os: string;
  architecture: string;
  version: string;
  status: string;
  lastSeen: string | null;
  /**
   * Latest reported usage, so the host list needs no extra round-trips. Always
   * present; its `cpu`/`memory` are null until the agent reports.
   */
  metrics: HostMetricsDto;
};

export type HostContainersDto = {
  hostId: string;
  containers: ContainerSummary[];
  updatedAt: string | null;
};

@Injectable()
export class HostsService {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly inventory: ContainerInventoryService,
    private readonly hostMetrics: HostMetricsService,
  ) { }

  async listHosts(): Promise<HostDto[]> {
    const agents = await this.agentsService.findAll();

    for (const agent of agents) {
      this.inventory.rememberHost(agent.id, agent.uuid);
      this.hostMetrics.rememberHost(agent.id, agent.uuid);
    }

    return agents.map((agent) =>
      toHostDto(agent, this.hostMetrics.getByHostId(agent.id)),
    );
  }

  async updateDisplayName(
    hostId: string,
    displayName: string,
  ): Promise<HostDto | null> {
    const updated = await this.agentsService.updateDisplayName(
      hostId,
      displayName,
    );
    if (!updated) {
      return null;
    }

    this.hostMetrics.rememberHost(updated.id, updated.uuid);
    return toHostDto(updated, this.hostMetrics.getByHostId(updated.id));
  }

  /**
   * Latest CPU/memory sample for a host. Returns null only when the host is
   * unknown — a known host that has not reported yet yields null fields, so the
   * dashboard can tell "no such host" apart from "no data yet".
   */
  async getMetrics(hostId: string): Promise<HostMetricsDto | null> {
    const agent = await this.agentsService.findById(hostId);
    if (!agent) {
      return null;
    }

    this.hostMetrics.rememberHost(agent.id, agent.uuid);
    return toMetricsDto(agent.id, this.hostMetrics.getByHostId(agent.id));
  }

  async listContainers(hostId: string): Promise<HostContainersDto | null> {
    const agent = await this.agentsService.findById(hostId);
    if (!agent) {
      return null;
    }

    this.inventory.rememberHost(agent.id, agent.uuid);

    const snapshot = this.inventory.getByHostId(agent.id);

    return {
      hostId: agent.id,
      containers: snapshot?.containers ?? [],
      updatedAt: snapshot?.updatedAt ? snapshot.updatedAt.toISOString() : null,
    };
  }

  /**
   * Enforces business rules for deleting a host:
   * - Cannot be missing
   * - Cannot be currently ONLINE
   * - Must have been inactive for at least 7 days
   */
  async deleteHost(hostId: string): Promise<void> {
    const agent = await this.agentsService.findById(hostId);
    if (!agent) {
      throw new NotFoundException(`Host not found: ${hostId}`);
    }

    if (agent.status === 'ONLINE') {
      throw new ConflictException('Cannot delete an active host');
    }

    const lastSeenDate = agent.lastSeen || agent.createdAt;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (lastSeenDate > sevenDaysAgo) {
      throw new ConflictException('Host must be inactive for at least 7 days');
    }

    await this.agentsService.delete(agent.id);
  }
}

function toHostDto(
  agent: Agent,
  snapshot: HostMetricsSnapshot | null,
): HostDto {
  return {
    id: agent.id,
    uuid: agent.uuid,
    hostname: agent.hostname,
    displayName: agent.displayName?.trim() || agent.hostname,
    os: agent.os,
    architecture: agent.architecture,
    version: agent.version,
    status: agent.status,
    lastSeen: agent.lastSeen ? agent.lastSeen.toISOString() : null,
    metrics: toMetricsDto(agent.id, snapshot),
  };
}

function toMetricsDto(
  hostId: string,
  snapshot: HostMetricsSnapshot | null,
): HostMetricsDto {
  return {
    hostId,
    cpu: snapshot?.cpu ?? null,
    memory: snapshot?.memory ?? null,
    collectedAt: snapshot?.collectedAt.toISOString() ?? null,
  };
}
