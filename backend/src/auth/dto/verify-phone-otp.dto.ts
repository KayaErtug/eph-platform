import { IsString, Length } from 'class-validator';

export class VerifyPhoneOtpDto {
  @IsString()
  pendingRegistrationId: string;

  @IsString()
  @Length(6, 6, {
    message: 'Telefon doğrulama kodu 6 haneli olmalıdır.',
  })
  code: string;
}
