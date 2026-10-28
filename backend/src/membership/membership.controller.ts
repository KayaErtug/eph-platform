import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { MembershipService } from './membership.service';

@Controller('membership')
@UseGuards(JwtAuthGuard)
export class MembershipController {
  constructor(
    private readonly membershipService: MembershipService,
  ) {}

  private getUserId(user: any): string {
    return String(
      user?.id ||
      user?.sub ||
      user?.userId ||
      '',
    ).trim();
  }

  @Get('packages')
  getPackages(@CurrentUser() user: any) {
    return this.membershipService.getPackages(
      this.getUserId(user),
    );
  }

  @Get('current')
  getCurrent(@CurrentUser() user: any) {
    return this.membershipService.getCurrent(
      this.getUserId(user),
    );
  }

  @Post('payment-orders')
  createPaymentOrder(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    return this.membershipService.createPaymentOrder(
      this.getUserId(user),
      dto,
    );
  }

  @Get('office-packages')
  getOfficePackages() {
    return this.membershipService.getOfficePackages();
  }
}
