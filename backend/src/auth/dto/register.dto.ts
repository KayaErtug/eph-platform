import { IsEmail, IsEnum, IsString, MinLength, IsMobilePhone } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsMobilePhone('tr-TR')
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  inviteCode: string;
}
