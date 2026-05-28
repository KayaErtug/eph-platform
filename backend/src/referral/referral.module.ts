import { Module } from "@nestjs/common";
import { ReferralController } from "./referral.controller";
import { ReferralService } from "./referral.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [ReferralController],
  providers: [ReferralService, PrismaService],
})
export class ReferralModule {}