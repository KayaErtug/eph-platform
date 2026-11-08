import { NativePushService } from './native-push.service';
import { NativePushController } from './native-push.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [PrismaModule],
  controllers: [PushController, NativePushController],
  providers: [PushService, NativePushService],
  exports: [PushService],
})
export class PushModule {}