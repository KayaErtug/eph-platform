import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { KontorController } from './kontor.controller';
import { KontorService } from './kontor.service';

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [KontorController],
  providers: [KontorService],
  exports: [KontorService],
})
export class KontorModule {}
