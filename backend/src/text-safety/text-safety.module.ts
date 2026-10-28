import { Module } from '@nestjs/common';

import { TextSafetyService } from './text-safety.service';

@Module({
  providers: [TextSafetyService],
  exports: [TextSafetyService],
})
export class TextSafetyModule {}
