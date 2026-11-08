import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { CrmModule } from '../crm/crm.module';
import { KontorModule } from '../kontor/kontor.module';
import { NetworkModule } from '../network/network.module';
import { MatchingModule } from '../matching/matching.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CoordinationLinkRepository } from './coordination-link.repository';
import { CoordinationRecalculationController } from './coordination-recalculation.controller';
import { CoordinationRecalculationService } from './coordination-recalculation.service';
import { CoordinationController } from './coordination.controller';
import { CoordinationService } from './coordination.service';
import { PoolCrmCoordinationController } from './pool-crm-coordination.controller';
import { PoolCrmCoordinationService } from './pool-crm-coordination.service';
import { CommercialMatchScanController } from './commercial-match-scan.controller';
import { CommercialMatchScanService } from './commercial-match-scan.service';

@Module({
  imports: [
    PrismaModule,
    CrmModule,
    NetworkModule,
    MatchingModule,
    AdminModule,
    KontorModule,
  ],
  controllers: [
    CoordinationController,
    PoolCrmCoordinationController,
    CoordinationRecalculationController,
    CommercialMatchScanController,
  ],
  providers: [
    CoordinationService,
    CoordinationLinkRepository,
    PoolCrmCoordinationService,
    CoordinationRecalculationService,
    CommercialMatchScanService,
  ],
  exports: [
    CoordinationService,
    PoolCrmCoordinationService,
    CoordinationRecalculationService,
  ],
})
export class CoordinationModule {}
