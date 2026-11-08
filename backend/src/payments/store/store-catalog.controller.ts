import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentNoStoreInterceptor } from '../payment-no-store.interceptor';
import { StoreCatalogService } from './store-catalog.service';

/** Mobil mağaza kataloğu (sözleşme r2 §3.1). JWT; yanıt önbelleğe alınmaz; fiyat alanı yok. */
@Controller('payments/store')
@UseInterceptors(PaymentNoStoreInterceptor)
@UseGuards(JwtAuthGuard)
export class StoreCatalogController {
  constructor(private readonly catalog: StoreCatalogService) {}

  @Get('catalog')
  get(@CurrentUser() user: { id: string }, @Query('platform') platform?: string) {
    return this.catalog.catalog(user.id, platform);
  }
}
