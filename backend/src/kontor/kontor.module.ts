import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KontorController } from './kontor.controller';
import { KontorService } from './kontor.service';

@Module({
  imports: [PrismaModule],
  controllers: [KontorController],
  providers: [KontorService],
})
export class KontorModule {}
