import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { AgentsGateway } from './agents.gateway';
import { AgentsService } from './agents.service';
import { ContainerInventoryService } from './container-inventory.service';

@Module({
  imports: [MetricsModule],
  providers: [AgentsService, AgentsGateway, ContainerInventoryService],
  exports: [AgentsService, AgentsGateway, ContainerInventoryService],
})
export class AgentsModule {}
