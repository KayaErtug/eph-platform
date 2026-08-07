import { Module } from '@nestjs/common';

import { LinaDistanceModule } from '../lina/geo/lina-distance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyCriteriaModule } from '../property-criteria/property-criteria.module';
import { CrmController } from './crm.controller';
import { CrmMatchEngineService } from './crm-match-engine.service';
import { CrmService } from './crm.service';

@Module({
  imports: [PrismaModule, LinaDistanceModule, PropertyCriteriaModule],
  controllers: [CrmController],
  providers: [
    {
      provide: CrmService,
      useClass: CrmMatchEngineService,
    },
  ],
  exports: [CrmService],
})
export class CrmModule {}
