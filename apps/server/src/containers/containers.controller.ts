import {
  BadRequestException,
  Body,
  Controller,
  GatewayTimeoutException,
  Get,
  HttpException,
  MessageEvent,
  NotFoundException,
  Param,
  Post,
  Query,
  Sse,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Observable, finalize } from 'rxjs';
import type { ContainerAction, LogsChunkPayload } from '@docksight/protocol';
import { Roles } from '../auth/roles.decorator';
import { ContainersService } from './containers.service';

class ContainerActionBodyDto {
  @ApiProperty({ description: 'Host (agent) id that owns the container' })
  @IsString()
  @IsNotEmpty()
  hostId!: string;
}

class ContainerRemoveBodyDto extends ContainerActionBodyDto {
  @ApiProperty({
    required: false,
    default: false,
    description: 'Remove a running container by killing it first',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

@ApiTags('containers')
@Controller('containers')
export class ContainersController {
  constructor(private readonly containersService: ContainersService) {}

  @Get(':id/inspect')
  @ApiOperation({ summary: 'Inspect a container on a host' })
  @ApiOkResponse({ description: 'Docker inspect data for the container' })
  async inspect(
    @Param('id') containerId: string,
    @Query('hostId') hostId: string,
  ) {
    if (!hostId?.trim()) {
      throw new BadRequestException('hostId query parameter is required');
    }

    try {
      const result = await this.containersService.inspectContainer(
        hostId,
        containerId,
      );

      if (!result.ok) {
        throw new BadRequestException(
          result.error ?? 'Container inspect failed',
        );
      }

      return result;
    } catch (error) {
      this.mapAndThrow(error, 'Container inspect failed');
    }
  }

  @Post(':id/start')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a container on a host' })
  @ApiBody({ type: ContainerActionBodyDto })
  @ApiOkResponse({ description: 'Lifecycle command result' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  start(
    @Param('id') containerId: string,
    @Body() body: ContainerActionBodyDto,
  ) {
    return this.runAction(containerId, body.hostId, 'start');
  }

  @Post(':id/stop')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stop a container on a host' })
  @ApiBody({ type: ContainerActionBodyDto })
  @ApiOkResponse({ description: 'Lifecycle command result' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  stop(@Param('id') containerId: string, @Body() body: ContainerActionBodyDto) {
    return this.runAction(containerId, body.hostId, 'stop');
  }

  @Post(':id/restart')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restart a container on a host' })
  @ApiBody({ type: ContainerActionBodyDto })
  @ApiOkResponse({ description: 'Lifecycle command result' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  restart(
    @Param('id') containerId: string,
    @Body() body: ContainerActionBodyDto,
  ) {
    return this.runAction(containerId, body.hostId, 'restart');
  }

  @Post(':id/pause')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause a container on a host' })
  @ApiBody({ type: ContainerActionBodyDto })
  @ApiOkResponse({ description: 'Lifecycle command result' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  pause(
    @Param('id') containerId: string,
    @Body() body: ContainerActionBodyDto,
  ) {
    return this.runAction(containerId, body.hostId, 'pause');
  }

  @Post(':id/unpause')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpause a container on a host' })
  @ApiBody({ type: ContainerActionBodyDto })
  @ApiOkResponse({ description: 'Lifecycle command result' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  unpause(
    @Param('id') containerId: string,
    @Body() body: ContainerActionBodyDto,
  ) {
    return this.runAction(containerId, body.hostId, 'unpause');
  }

  @Post(':id/remove')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a container on a host' })
  @ApiBody({ type: ContainerRemoveBodyDto })
  @ApiOkResponse({ description: 'Lifecycle command result' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  remove(
    @Param('id') containerId: string,
    @Body() body: ContainerRemoveBodyDto,
  ) {
    return this.runAction(containerId, body.hostId, 'remove', body.force);
  }

  @Sse(':id/logs')
  @ApiOperation({
    summary: 'Stream container logs (SSE)',
    description:
      'Opens a live log stream via the connected agent. Query: hostId (required), tail, follow.',
  })
  streamLogs(
    @Param('id') containerId: string,
    @Query('hostId') hostId: string,
    @Query('tail') tailRaw?: string,
    @Query('follow') followRaw?: string,
  ): Observable<MessageEvent> {
    if (!hostId?.trim()) {
      throw new BadRequestException('hostId query parameter is required');
    }

    const tail = Number.parseInt(tailRaw ?? '100', 10);
    const follow = followRaw !== 'false';

    return new Observable<MessageEvent>((subscriber) => {
      let requestId: string | null = null;
      let closed = false;

      const onChunk = (payload: LogsChunkPayload) => {
        if (closed) {
          return;
        }
        subscriber.next({
          type: 'logs.chunk',
          data: payload,
        });
      };

      void this.containersService
        .startLogStream({
          hostId,
          containerId,
          tail: Number.isFinite(tail) && tail > 0 ? tail : 100,
          follow,
          onChunk,
        })
        .then((id) => {
          requestId = id;
          subscriber.next({
            type: 'logs.subscribed',
            data: { requestId: id, containerId },
          });
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to start log stream';
          subscriber.error(this.mapStreamError(message));
        });

      return () => {
        closed = true;
        if (requestId) {
          this.containersService.stopLogStream(requestId);
        }
      };
    }).pipe(
      finalize(() => {
        // teardown also handled by Observable unsubscribe return
      }),
    );
  }

  private mapStreamError(message: string): HttpException {
    if (message.includes('not found')) {
      return new NotFoundException(message);
    }
    if (message.includes('not connected') || message.includes('offline')) {
      return new ServiceUnavailableException(message);
    }
    return new BadRequestException(message);
  }

  private async runAction(
    containerId: string,
    hostId: string,
    action: ContainerAction,
    force = false,
  ) {
    try {
      return await this.containersService.runLifecycleAction(
        hostId,
        containerId,
        action,
        force,
      );
    } catch (error) {
      this.mapAndThrow(error, 'Container action failed');
    }
  }

  private mapAndThrow(error: unknown, fallback: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    const message = error instanceof Error ? error.message : fallback;

    if (message.includes('not found')) {
      throw new NotFoundException(message);
    }
    if (message.includes('not connected') || message.includes('offline')) {
      throw new ServiceUnavailableException(message);
    }
    if (message.includes('timed out')) {
      throw new GatewayTimeoutException(message);
    }
    if (message.includes('required')) {
      throw new BadRequestException(message);
    }
    throw new BadRequestException(message);
  }
}
