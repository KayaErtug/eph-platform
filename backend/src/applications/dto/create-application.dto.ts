import { IsEnum, IsString, IsOptional, IsEmail } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateApplicationDto {
  @IsString()
  applicantName: string;

  @IsEmail()
  applicantEmail: string;

  @IsString()
  applicantPhone: string;

  @IsEnum(Role)
  requestedRole: Role;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}