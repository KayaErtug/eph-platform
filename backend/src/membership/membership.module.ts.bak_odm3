import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { PaymentAdminController, PaymentController, PaymentPublicController } from '../payments/payment.controller';
import { IyzicoGateway, PAYMENT_GATEWAY } from '../payments/iyzico.gateway';
import { PaymentService } from '../payments/payment.service';

@Module({
  imports: [PrismaModule],
  controllers: [MembershipController, PaymentController, PaymentPublicController, PaymentAdminController],
  providers: [MembershipService, PaymentService, { provide: PAYMENT_GATEWAY, useClass: IyzicoGateway }],
  exports: [MembershipService],
})
export class MembershipModule {}
