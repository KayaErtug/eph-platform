import { IsString, Length } from 'class-validator';

export class VerifyEmailV2Dto {
  @IsString()
  pendingRegistrationId: string;

  @IsString()
  @Length(6, 6, {
    message: 'E-posta doğrulama kodu 6 haneli olmalıdır.',
  })
  code: string;
}
