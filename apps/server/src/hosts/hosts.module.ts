import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { MetricsModule } from '../metrics/metrics.module';
import { HostsController } from './hosts.controller';
import { HostsService } from './hosts.service';

@Module({
  imports: [AgentsModule, MetricsModule],
  controllers: [HostsController],
  providers: [HostsService],
})
export class HostsModule {}
