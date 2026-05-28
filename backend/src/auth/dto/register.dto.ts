import {
  IsEmail,
  IsMobilePhone,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  inviteCode?: string;
}