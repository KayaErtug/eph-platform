import { Module } from '@nestjs/common';

import { LinaDistanceModule } from '../lina/geo/lina-distance.module';
import { MatchingModule } from '../matching/matching.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyCriteriaModule } from '../property-criteria/property-criteria.module';
import { PropertyDemandModule } from '../property-demand/property-demand.module';
import { CrmController } from './crm.controller';
import { CrmMatchEngineService } from './crm-match-engine.service';
import { CrmService } from './crm.service';

@Module({
  imports: [PrismaModule, LinaDistanceModule, PropertyCriteriaModule, PropertyDemandModule, MatchingModule],
  controllers: [CrmController],
  providers: [
    {
      provide: CrmService,
      useClass: CrmMatchEngineService,
    },
  ],
  exports: [CrmService, PropertyDemandModule],
})
export class CrmModule {}
