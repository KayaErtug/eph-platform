import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { EphAuthorityLettersController } from './eph-authority-letters.controller';
import { EphAuthorityLettersService } from './eph-authority-letters.service';

@Module({
  imports: [PrismaModule],
  controllers: [EphAuthorityLettersController],
  providers: [EphAuthorityLettersService],
})
export class EphAuthorityLettersModule {}