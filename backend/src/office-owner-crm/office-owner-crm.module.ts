import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OfficeOwnerCrmController } from './office-owner-crm.controller';
import { OfficeOwnerCrmService } from './office-owner-crm.service';

@Module({
  imports: [PrismaModule],
  controllers: [OfficeOwnerCrmController],
  providers: [OfficeOwnerCrmService],
  exports: [OfficeOwnerCrmService],
})
export class OfficeOwnerCrmModule {}
