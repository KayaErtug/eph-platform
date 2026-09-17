import { Module } from '@nestjs/common';

import { PropertyCardProfileController } from './property-card-profile.controller';
import { PropertyCardProfileService } from './property-card-profile.service';

@Module({
  controllers: [PropertyCardProfileController],
  providers: [PropertyCardProfileService],
  exports: [PropertyCardProfileService],
})
export class PropertyCardProfileModule {}
