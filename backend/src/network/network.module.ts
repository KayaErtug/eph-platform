import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { NetworkController } from './network.controller';
import { NetworkService } from './network.service';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [NetworkController],
  providers: [NetworkService],
})
export class NetworkModule {}
