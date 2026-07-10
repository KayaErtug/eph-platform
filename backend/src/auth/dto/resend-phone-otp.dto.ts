import { IsString } from 'class-validator';

export class ResendPhoneOtpDto {
  @IsString()
  pendingRegistrationId: string;
}
