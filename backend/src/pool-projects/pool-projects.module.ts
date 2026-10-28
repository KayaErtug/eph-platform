import { PoolAudienceModule } from '../pool-audience/pool-audience.module';
import { Module } from '@nestjs/common';

import { MatchingModule } from '../matching/matching.module';

import { PoolProjectsController } from './pool-projects.controller';
import { PoolProjectsPublicController } from './pool-projects-public.controller';
import { PoolProjectsService } from './pool-projects.service';

@Module({
  imports: [MatchingModule, PoolAudienceModule],
  controllers: [PoolProjectsController, PoolProjectsPublicController],
  providers: [PoolProjectsService],
  exports: [PoolProjectsService],
})
export class PoolProjectsModule {}
