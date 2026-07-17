import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { PushModule } from "../push/push.module";
import { PropertyCriteriaModule } from "../property-criteria/property-criteria.module";
import { PropertyValidationModule } from "../property-validation/property-validation.module";
import { TextSafetyModule } from "../text-safety/text-safety.module";
import { NetworkController } from "./network.controller";
import { NetworkPostShareController } from "./network-post-share.controller";
import { NetworkService } from "./network.service";

@Module({
  imports: [
    PrismaModule,
    PushModule,
    PropertyCriteriaModule,
    PropertyValidationModule,
    TextSafetyModule,
  ],
  controllers: [NetworkController, NetworkPostShareController],
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {}
