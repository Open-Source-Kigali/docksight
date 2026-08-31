import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { UpdateHostDto } from './dto/update-host.dto';
import { HostsService } from './hosts.service';

@ApiTags('hosts')
@Controller('hosts')
export class HostsController {
  constructor(private readonly hostsService: HostsService) {}

  @Get()
  @ApiOperation({ summary: 'List registered Docker hosts (agents)' })
  @ApiOkResponse({ description: 'Registered hosts' })
  listHosts() {
    return this.hostsService.listHosts();
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a host display name' })
  @ApiBody({ type: UpdateHostDto })
  @ApiOkResponse({ description: 'Updated host' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  async updateDisplayName(
    @Param('id') id: string,
    @Body() body: UpdateHostDto,
  ) {
    const result = await this.hostsService.updateDisplayName(
      id,
      body.displayName,
    );
    if (!result) {
      throw new NotFoundException(`Host not found: ${id}`);
    }
    return result;
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Latest CPU and memory usage reported by a host' })
  @ApiOkResponse({ description: 'Host resource usage snapshot' })
  async getMetrics(@Param('id') id: string) {
    const result = await this.hostsService.getMetrics(id);
    if (!result) {
      throw new NotFoundException(`Host not found: ${id}`);
    }
    return result;
  }

  @Get(':id/containers')
  @ApiOperation({ summary: 'List containers discovered on a host' })
  @ApiOkResponse({ description: 'Container inventory for the host' })
  async listContainers(@Param('id') id: string) {
    const result = await this.hostsService.listContainers(id);
    if (!result) {
      throw new NotFoundException(`Host not found: ${id}`);
    }
    return result;
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a host that has been inactive for at least 7 days',
  })
  @ApiOkResponse({ description: 'Host deleted' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  @ApiConflictResponse({
    description: 'Host is active or was active within the last 7 days',
  })
  async deleteHost(@Param('id') id: string) {
    await this.hostsService.deleteHost(id);
  }
}
