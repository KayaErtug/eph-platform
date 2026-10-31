import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminEmailService } from './admin-email.service';

@Module({ imports: [PrismaModule], providers: [AdminEmailService], exports: [AdminEmailService] })
export class AdminEmailModule {}
