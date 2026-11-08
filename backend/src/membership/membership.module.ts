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

@Module({
  imports: [PrismaModule],
  controllers: [MembershipController, PaymentController, PaymentPublicController, PaymentAdminController, AppleStoreController],
  providers: [MembershipService, PaymentService, { provide: PAYMENT_GATEWAY, useClass: IyzicoGateway },
    AppleStoreService, { provide: APPLE_STORE_PORT, useFactory: () => new AppleStoreClient() }],
  exports: [MembershipService],
})
export class MembershipModule {}
