import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  phoneOrEmail?: string;

  // Geriye dönük uyumluluk (eski mobil/web sürümleri için)
  @IsOptional()
  @IsString()
  email?: string;

  // Doğrudan telefon girişi için
  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;
}
