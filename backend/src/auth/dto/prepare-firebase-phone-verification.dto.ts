import { IsString, MaxLength, MinLength } from 'class-validator';

export class PrepareFirebasePhoneVerificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  pendingRegistrationId: string;
}
