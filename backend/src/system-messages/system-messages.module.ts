import { Module } from '@nestjs/common';
import { SystemMessagesService } from './system-messages.service';
import { SystemMessagesController } from './system-messages.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemMessagesController],
  providers: [SystemMessagesService],
  exports: [SystemMessagesService],
})
export class SystemMessagesModule {}