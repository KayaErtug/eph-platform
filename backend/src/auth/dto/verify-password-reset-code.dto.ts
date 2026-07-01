import { Transform } from 'class-transformer';
import { IsEmail, Matches } from 'class-validator';

export class VerifyPasswordResetCodeDto {
  @Transform(({ value }) => String(value || '').trim().toLowerCase())
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @Transform(({ value }) => String(value || '').replace(/\D/g, '').slice(0, 6))
  @Matches(/^\d{6}$/, {
    message: 'Doğrulama kodu 6 haneli olmalıdır.',
  })
  code: string;
}