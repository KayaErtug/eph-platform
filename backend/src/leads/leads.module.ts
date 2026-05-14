import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { MailService } from '../mail.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, MailService],
  exports: [LeadsService],
})
export class LeadsModule {}