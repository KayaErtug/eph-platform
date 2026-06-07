import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class KatilimTalebiOlusturDto {
  @IsString()
  @MinLength(2)
  applicantName: string;

  @IsEmail()
  applicantEmail: string;

  @IsString()
  @MinLength(10)
  applicantPhone: string;

  @IsEnum(Role)
  requestedRole: Role;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsBoolean()
  pilotBasvuruMu?: boolean;

  @IsBoolean()
  platformAccepted: boolean;

  @IsBoolean()
  kvkkAccepted: boolean;

  @IsBoolean()
  privacyAccepted: boolean;

  @IsBoolean()
  userAgreementAccepted: boolean;
}