










import { Module } from '@nestjs/common';
import { NominationsService } from './nominations.service';
import { NominationsController } from './nominations.controller';
import { MailService } from '../mail.service';

@Module({
  controllers: [NominationsController],
  providers: [NominationsService, MailService],
  exports: [NominationsService],
})
export class NominationsModule {}