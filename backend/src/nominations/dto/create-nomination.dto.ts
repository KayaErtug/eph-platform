import { IsEnum, IsString, IsOptional, IsEmail } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateNominationDto {
  @IsString()
  candidateName: string;

  @IsEmail()
  candidateEmail: string;

  @IsString()
  candidatePhone: string;

  @IsEnum(Role)
  candidateRole: Role;

  @IsOptional()
  @IsString()
  note?: string;
}


