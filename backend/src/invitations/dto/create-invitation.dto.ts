import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @IsString()
  @MinLength(2)
  candidateName: string;

  @IsEmail()
  candidateEmail: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsBoolean()
  isPilotInvitation?: boolean;

  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxUses?: number;
}