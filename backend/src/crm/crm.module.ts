import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { LinaDistanceModule } from "../lina/geo/lina-distance.module";
import { PropertyCriteriaModule } from "../property-criteria/property-criteria.module";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";

@Module({
  imports: [PrismaModule, LinaDistanceModule, PropertyCriteriaModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
