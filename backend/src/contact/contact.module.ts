import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

@Module({
  controllers: [ContactController],
  providers: [
    { provide: ContactService, useFactory: () => new ContactService() },
  ],
})
export class ContactModule {}
