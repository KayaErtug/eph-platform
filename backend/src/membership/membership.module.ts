import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { PaymentAdminController, PaymentController, PaymentPublicController } from '../payments/payment.controller';
import { IyzicoGateway, PAYMENT_GATEWAY } from '../payments/iyzico.gateway';
import { PaymentService } from '../payments/payment.service';
import { StorePaymentController, StoreAdminController } from '../payments/store.controller';
import { StorePaymentService } from '../payments/store.service';
import { OfficialStoreGateway, STORE_GATEWAY } from '../payments/store.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [MembershipController, PaymentController, PaymentPublicController, PaymentAdminController, StorePaymentController, StoreAdminController],
  providers: [MembershipService, PaymentService, StorePaymentService, { provide: STORE_GATEWAY, useClass: OfficialStoreGateway }, { provide: PAYMENT_GATEWAY, useClass: IyzicoGateway }],
  exports: [MembershipService],
})
export class MembershipModule {}
