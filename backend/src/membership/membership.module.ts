import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { PaymentAdminController, PaymentController, PaymentPublicController } from '../payments/payment.controller';
import { IyzicoGateway, PAYMENT_GATEWAY } from '../payments/iyzico.gateway';
import { PaymentService } from '../payments/payment.service';
import { AppleStoreController } from '../payments/store/apple-store.controller';
import { AppleStoreClient } from '../payments/store/apple-store.client';
import { AppleStoreService } from '../payments/store/apple-store.service';
import { APPLE_STORE_PORT } from '../payments/store/apple-store.port';
import { OfficeEntitlementService } from '../office/office-entitlement.service';
import { StoreCatalogController } from '../payments/store/store-catalog.controller';
import { StoreCatalogService } from '../payments/store/store-catalog.service';

@Module({
  imports: [PrismaModule],
  controllers: [MembershipController, PaymentController, PaymentPublicController, PaymentAdminController, AppleStoreController, StoreCatalogController],
  providers: [MembershipService, OfficeEntitlementService, StoreCatalogService, PaymentService, { provide: PAYMENT_GATEWAY, useClass: IyzicoGateway },
    AppleStoreService, { provide: APPLE_STORE_PORT, useFactory: () => new AppleStoreClient() }],
  exports: [MembershipService, OfficeEntitlementService],
})
export class MembershipModule {}
