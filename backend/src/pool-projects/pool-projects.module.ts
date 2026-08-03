import { Module } from '@nestjs/common';

import { PoolProjectsController } from './pool-projects.controller';
import { PoolProjectsPublicController } from './pool-projects-public.controller';
import { PoolProjectsService } from './pool-projects.service';

@Module({
  controllers: [PoolProjectsController, PoolProjectsPublicController],
  providers: [PoolProjectsService],
  exports: [PoolProjectsService],
})
export class PoolProjectsModule {}
