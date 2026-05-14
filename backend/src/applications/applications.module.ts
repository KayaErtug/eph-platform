import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { MailService } from '../mail.service';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService, MailService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}