import { Module } from '@nestjs/common';

import { CrmModule } from '../crm/crm.module';
import { NetworkModule } from '../network/network.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CoordinationLinkRepository } from './coordination-link.repository';
import { CoordinationController } from './coordination.controller';
import { CoordinationService } from './coordination.service';
import { PoolCrmCoordinationController } from './pool-crm-coordination.controller';
import { PoolCrmCoordinationService } from './pool-crm-coordination.service';

@Module({
  imports: [PrismaModule, CrmModule, NetworkModule],
  controllers: [
    CoordinationController,
    PoolCrmCoordinationController,
  ],
  providers: [
    CoordinationService,
    CoordinationLinkRepository,
    PoolCrmCoordinationService,
  ],
  exports: [CoordinationService, PoolCrmCoordinationService],
})
export class CoordinationModule {}
