import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DigitalContractStatus, DigitalContractType } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreateContractInput,
  OfficeContractsService,
} from './office-contracts.service';

@Controller('office/contracts')
@UseGuards(JwtAuthGuard)
export class OfficeContractsController {
  constructor(private readonly service: OfficeContractsService) {}

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('officeId') officeId?: string,
    @Query('contractType') contractType?: DigitalContractType,
    @Query('status') status?: DigitalContractStatus,
  ) {
    return this.service.list(user, { officeId, contractType, status });
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getById(id, user);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: CreateContractInput) {
    return this.service.create(user, body);
  }

  @Post(':id/send-sms')
  sendSms(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.sendSmsOtp(id, user);
  }

  @Post(':id/verify-sms')
  verifySms(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('code') code: string,
  ) {
    return this.service.verifySmsOtp(id, user, code);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approveReferral(id, user);
  }

  @Post(':id/dispute')
  dispute(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string,
  ) {
    return this.service.dispute(id, user, reason);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.archive(id, user);
  }
}
