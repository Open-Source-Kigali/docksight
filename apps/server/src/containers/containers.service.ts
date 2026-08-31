import { Injectable } from '@nestjs/common';
import type {
  ContainerAction,
  ContainerInspectedPayload,
  ContainerResultPayload,
  LogsChunkPayload,
} from '@docksight/protocol';
import { AgentsGateway } from '../agents/agents.gateway';
import { AgentsService } from '../agents/agents.service';

@Injectable()
export class ContainersService {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentsGateway: AgentsGateway,
  ) {}

  async runLifecycleAction(
    hostId: string,
    containerId: string,
    action: ContainerAction,
    force = false,
  ): Promise<ContainerResultPayload> {
    if (!hostId?.trim()) {
      throw new Error('hostId is required');
    }
    if (!containerId?.trim()) {
      throw new Error('containerId is required');
    }

    const agent = await this.agentsService.findById(hostId);
    if (!agent) {
      throw new Error(`Host not found: ${hostId}`);
    }

    return this.agentsGateway.sendContainerCommand(
      agent.uuid,
      agent.id,
      action,
      containerId,
      force,
    );
  }

  async inspectContainer(
    hostId: string,
    containerId: string,
  ): Promise<ContainerInspectedPayload> {
    if (!hostId?.trim()) {
      throw new Error('hostId is required');
    }
    if (!containerId?.trim()) {
      throw new Error('containerId is required');
    }

    const agent = await this.agentsService.findById(hostId);
    if (!agent) {
      throw new Error(`Host not found: ${hostId}`);
    }

    return this.agentsGateway.inspectContainer(
      agent.uuid,
      agent.id,
      containerId,
    );
  }

  async startLogStream(options: {
    hostId: string;
    containerId: string;
    tail?: number;
    follow?: boolean;
    onChunk: (payload: LogsChunkPayload) => void;
  }): Promise<string> {
    const { hostId, containerId, tail = 100, follow = true, onChunk } = options;

    if (!hostId?.trim()) {
      throw new Error('hostId is required');
    }
    if (!containerId?.trim()) {
      throw new Error('containerId is required');
    }

    const agent = await this.agentsService.findById(hostId);
    if (!agent) {
      throw new Error(`Host not found: ${hostId}`);
    }

    return this.agentsGateway.startLogStream({
      agentUuid: agent.uuid,
      hostId: agent.id,
      containerId,
      tail,
      follow,
      onChunk,
    });
  }

  stopLogStream(requestId: string) {
    this.agentsGateway.stopLogStream(requestId);
  }
}
