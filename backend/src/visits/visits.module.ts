import { Module } from '@nestjs/common';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { ParselController } from './parsel.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VisitsController, ParselController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
