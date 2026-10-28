import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { PoolAudienceModule } from '../pool-audience/pool-audience.module';

import { PolicyAwareUnitsService } from './policy-aware-units.service';
import { PoolShareController } from './pool-share.controller';
import { PortfolioShareController } from './portfolio-share.controller';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { PoolPublicationService } from './pool-publication.service';

@Module({
  imports: [AdminModule, PoolAudienceModule],
  providers: [
    PoolPublicationService,
    {
      provide: UnitsService,
      useClass: PolicyAwareUnitsService,
    },
  ],
  controllers: [
    UnitsController,
    PoolShareController,
    PortfolioShareController,
  ],
})
export class UnitsModule {}
