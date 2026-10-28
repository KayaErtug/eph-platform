import { Module } from '@nestjs/common';

import { LinaDistanceModule } from '../lina/geo/lina-distance.module';
import { PropertyDemandModule } from '../property-demand/property-demand.module';
import { PropertyCardProfileModule } from '../property-card/property-card-profile.module';
import { EphMatchEngineService } from './eph-match-engine.service';

@Module({
  imports: [LinaDistanceModule, PropertyDemandModule, PropertyCardProfileModule],
  providers: [EphMatchEngineService],
  exports: [EphMatchEngineService, PropertyDemandModule],
})
export class MatchingModule {}
