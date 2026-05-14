import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { MailService } from '../mail.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, MailService],
  exports: [AdminService],
})
export class AdminModule {}