import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { PoolAudienceModule } from '../pool-audience/pool-audience.module';
import { ContentSafetyController } from './content-safety.controller';
import { ContentSafetyService } from './content-safety.service';

@Module({ imports: [AdminModule, PoolAudienceModule], controllers: [ContentSafetyController], providers: [ContentSafetyService] })
export class ContentSafetyModule {}
