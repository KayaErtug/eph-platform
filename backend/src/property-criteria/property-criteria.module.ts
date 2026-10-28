import { Module } from '@nestjs/common';

import { PropertyCriteriaService } from './property-criteria.service';

@Module({
  providers: [PropertyCriteriaService],
  exports: [PropertyCriteriaService],
})
export class PropertyCriteriaModule {}
