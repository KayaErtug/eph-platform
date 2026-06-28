import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";

@Module({
  imports: [PrismaModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
