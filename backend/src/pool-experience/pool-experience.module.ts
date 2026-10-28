import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { MatchingModule } from '../matching/matching.module';
import { PoolAudienceModule } from '../pool-audience/pool-audience.module';

import { CustomerPresentationController } from './customer-presentation.controller';
import { PoolExperienceController } from './pool-experience.controller';
import { PoolExperienceService } from './pool-experience.service';

@Module({
  imports: [AdminModule, MatchingModule, PoolAudienceModule],
  controllers: [PoolExperienceController, CustomerPresentationController],
  providers: [PoolExperienceService],
})
export class PoolExperienceModule {}
