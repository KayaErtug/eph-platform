import { Body, Controller, Get, Headers, HttpCode, Param, Post, Put, Req, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CheckoutDto, MembershipPriceDto, PaymentSettingsDto, RefundRequestDto, MembershipPackageSettingsDto } from './payment.dto';
import { PaymentService } from './payment.service';
import { PaymentNoStoreInterceptor } from './payment-no-store.interceptor';

@Controller('payments')
@UseInterceptors(PaymentNoStoreInterceptor)
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}
  @Get('catalog') catalog(@CurrentUser() user: { id: string }) { return this.payments.catalog(user.id); }
  @Get('orders') orders(@CurrentUser() user: { id: string }) { return this.payments.orders(user.id); }
  @Get('orders/:id') order(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.payments.order(user.id, id); }
  @Post('checkout') checkout(@CurrentUser() user: { id: string }, @Body() dto: CheckoutDto, @Headers('idempotency-key') key: string, @Req() req: Request) {
    return this.payments.checkout(user.id, dto, key, req.ip || req.socket.remoteAddress || '');
  }
  @Post('orders/:id/refresh') @HttpCode(200)
  refresh(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.payments.refresh(user.id, id); }
  @Post('orders/:id/refund-request')
  refund(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: RefundRequestDto) {
    return this.payments.requestRefund(user.id, id, dto.reason);
  }
}

@Controller('payments')
@UseInterceptors(PaymentNoStoreInterceptor)
export class PaymentPublicController {
  constructor(private readonly payments: PaymentService) {}
  @Get('public-catalog') publicCatalog() { return this.payments.publicCatalog(); }
  @Get('legal') async legal() {
    const config = await this.payments.settings();
    return { terms: config.terms, termsVersion: config.termsVersion, approved: config.approved };
  }
  @Post('iyzico/callback') async callback(@Body('token') token: unknown, @Res() response: Response) {
    const id = await this.payments.callback(token);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.redirect(303, this.payments.resultUrl(id));
  }
  @Post('iyzico/webhook') @HttpCode(200)
  webhook(@Body() body: unknown, @Headers('x-iyz-signature-v3') signature: string) { return this.payments.webhook(body, signature); }
}

@Controller('payments/admin')
@UseInterceptors(PaymentNoStoreInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class PaymentAdminController {
  constructor(private readonly payments: PaymentService) {}
  @Get('membership-packages') membershipPackages() { return this.payments.adminMembershipPackages(); }
  @Put('membership-packages/:id') saveMembershipPackage(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: MembershipPackageSettingsDto) { return this.payments.saveMembershipPackage(user.id, id, dto); }
  @Get('settings') settings() { return this.payments.settings(); }
  @Put('settings') save(@CurrentUser() user: { id: string }, @Body() dto: PaymentSettingsDto) { return this.payments.saveSettings(user.id, dto); }
  @Get('orders') orders() { return this.payments.orders('', true); }
  @Get('membership-prices') prices() { return this.payments.membershipPrices(); }
  @Put('membership-prices/:id') savePrice(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: MembershipPriceDto) {
    return this.payments.saveMembershipPrice(user.id, id, dto.amountMinor, dto.active);
  }
}
