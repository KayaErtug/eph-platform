import { Body, Controller, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentNoStoreInterceptor } from '../payment-no-store.interceptor';
import { AppleStoreService } from './apple-store.service';

/** Mobil doğrulama (JWT). İstemci JWS'ine güvenilmez; sunucu App Store Server API ile işlemi kendisi sorgular. */
@Controller('payments/store/apple')
@UseInterceptors(PaymentNoStoreInterceptor)
export class AppleStoreController {
  constructor(private readonly apple: AppleStoreService) {}

  @Post('verify') @HttpCode(200) @UseGuards(JwtAuthGuard)
  verify(@CurrentUser() user: { id: string }, @Body() body: { transactionId?: unknown; originalTransactionId?: unknown; productId?: unknown }) {
    return this.apple.verify(user.id, body ?? {});
  }

  /** Herkese açık: kimlik yok, JWS imzası Apple kök zinciriyle doğrulanır. Geçersiz → 401, doğrulanan → 200 boş gövde. */
  @Post('notifications') @HttpCode(200)
  async notifications(@Body('signedPayload') signedPayload: unknown): Promise<void> {
    await this.apple.handleNotification(signedPayload);
  }
}
