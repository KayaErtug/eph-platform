import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PushModule } from "../push/push.module";
import { NotificationsModule } from '../notifications/notifications.module';
import { OfficeController } from "./office.controller";
import { OfficeService } from "./office.service";

import { OfficeManagementService } from './office-management.service';
import { OfficeManagementController } from './office-management.controller';
import { OfficePoolController } from './office-pool.controller';
import { OfficePoolService } from './office-pool.service';
import { SisterController } from './sister/sister.controller';
import { SisterLinksService } from './sister/sister-links.service';
import { SisterPoolService } from './sister/sister-pool.service';
import { SisterRequestsService } from './sister/sister-requests.service';

@Module({
  imports: [PrismaModule, PushModule, NotificationsModule],
  controllers: [OfficeController, OfficeManagementController, OfficePoolController, SisterController],
  providers: [OfficeService, OfficeManagementService, OfficePoolService, SisterLinksService, SisterPoolService, SisterRequestsService],
  exports: [OfficeService],
})
export class OfficeModule {}
