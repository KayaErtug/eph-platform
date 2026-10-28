import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentNoStoreInterceptor } from './payment-no-store.interceptor';
import { StoreIntentDto, StorePlatform, StoreSettingsDto, StoreVerifyDto } from './store.dto';
import { StorePaymentService } from './store.service';

@Controller('payments/store')
@UseGuards(JwtAuthGuard)
@UseInterceptors(PaymentNoStoreInterceptor)
export class StorePaymentController {
  constructor(private readonly store: StorePaymentService) {}
  @Get('catalog') catalog(@CurrentUser() user: { id: string }, @Query('platform') platform: StorePlatform) { return this.store.catalog(user.id, platform); }
  @Post('intents') intent(@CurrentUser() user: { id: string }, @Body() dto: StoreIntentDto) { return this.store.intent(user.id, dto); }
  @Post('verify') verify(@CurrentUser() user: { id: string }, @Body() dto: StoreVerifyDto) { return this.store.verify(user.id, dto); }
  @Post('intents/:id/cancel') cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.store.cancel(user.id, id); }
}

@Controller('payments/admin/store')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@UseInterceptors(PaymentNoStoreInterceptor)
export class StoreAdminController {
  constructor(private readonly store: StorePaymentService) {}
  @Get('settings') settings() { return this.store.adminSettings(); }
  @Put('settings') save(@CurrentUser() user: { id: string }, @Body() dto: StoreSettingsDto) { return this.store.saveSettings(user.id, dto); }
}
