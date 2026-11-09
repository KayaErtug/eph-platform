import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PushModule } from "../push/push.module";
import { OfficeController } from "./office.controller";
import { OfficeService } from "./office.service";

import { OfficeManagementService } from './office-management.service';
import { OfficeManagementController } from './office-management.controller';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [OfficeController, OfficeManagementController],
  providers: [OfficeService, OfficeManagementService],
  exports: [OfficeService],
})
export class OfficeModule {}
