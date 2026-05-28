import { Controller, Get, Param } from "@nestjs/common";
import { ReferralService } from "./referral.service";

@Controller("referral")
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get(":code")
  validate(@Param("code") code: string) {
    return this.referralService.validateReferralCode(code);
  }
}