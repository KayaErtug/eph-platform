import { IsString } from 'class-validator';

export class SendEmailCodeDto {
  @IsString()
  pendingRegistrationId: string;
}
