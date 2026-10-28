import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyFirebasePhoneOtpDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  pendingRegistrationId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  sessionInfo: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Telefon doğrulama kodu 6 haneli olmalıdır.',
  })
  code: string;
}
