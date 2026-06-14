import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { TuranController } from './turan.controller';
import { TuranService } from './turan.service';

@Module({
  imports: [PrismaModule],
  controllers: [TuranController],
  providers: [TuranService],
})
export class TuranModule {}
