import { IsEmail, IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email!: string;

  @IsString({ message: 'Doğrulama kodu metin olmalıdır.' })
  @Matches(/^\d{6}$/, {
    message: 'Doğrulama kodu 6 haneli olmalıdır.',
  })
  code!: string;
}
