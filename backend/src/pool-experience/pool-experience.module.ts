import { Module } from '@nestjs/common';

import { CustomerPresentationController } from './customer-presentation.controller';
import { PoolExperienceController } from './pool-experience.controller';
import { PoolExperienceService } from './pool-experience.service';

@Module({
  controllers: [PoolExperienceController, CustomerPresentationController],
  providers: [PoolExperienceService],
})
export class PoolExperienceModule {}
