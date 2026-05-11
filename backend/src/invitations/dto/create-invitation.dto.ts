import { IsEnum, IsInt, Min, Max } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @IsEnum(Role)
  role: Role;

  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays: number;

  @IsInt()
  @Min(1)
  @Max(10)
  maxUses: number;
}