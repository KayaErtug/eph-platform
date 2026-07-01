import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(20, {
    message: 'Şifre yenileme oturumu geçersizdir.',
  })
  resetToken: string;

  @IsString()
  @MinLength(6, {
    message: 'Yeni şifre en az 6 karakter olmalıdır.',
  })
  @MaxLength(128, {
    message: 'Yeni şifre en fazla 128 karakter olabilir.',
  })
  newPassword: string;
}