import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { AdminModule } from "../admin/admin.module";
import { PushModule } from "../push/push.module";
import { PropertyCriteriaModule } from "../property-criteria/property-criteria.module";
import { PropertyDemandModule } from "../property-demand/property-demand.module";
import { PropertyValidationModule } from "../property-validation/property-validation.module";
import { TextSafetyModule } from "../text-safety/text-safety.module";
import { NetworkController } from "./network.controller";
import { NetworkPostShareController } from "./network-post-share.controller";
import { NetworkService } from "./network.service";

@Module({
  imports: [
    PrismaModule,
    AdminModule,
    PushModule,
    PropertyCriteriaModule,
    PropertyDemandModule,
    PropertyValidationModule,
    TextSafetyModule,
  ],
  controllers: [NetworkController, NetworkPostShareController],
  providers: [NetworkService],
  exports: [NetworkService, PropertyDemandModule],
})
export class NetworkModule {}
