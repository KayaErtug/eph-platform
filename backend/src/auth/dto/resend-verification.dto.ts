import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email!: string;
}
