import { IsString, MaxLength, MinLength } from 'class-validator';

export class BindFirebasePhoneSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  pendingRegistrationId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  sessionInfo: string;
}
