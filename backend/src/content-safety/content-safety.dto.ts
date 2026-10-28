import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export enum SafetyEntity { NETWORK_POST = 'NETWORK_POST', POOL_UNIT = 'POOL_UNIT', MESSAGE = 'MESSAGE' }
export enum SafetyReason { SPAM = 'SPAM', HARASSMENT = 'HARASSMENT', FRAUD = 'FRAUD', INAPPROPRIATE = 'INAPPROPRIATE', OTHER = 'OTHER' }
export enum SafetyResolution { DISMISS = 'DISMISS', REMOVE_CONTENT = 'REMOVE_CONTENT' }

export class SafetyTargetDto {
  @IsEnum(SafetyEntity) entityType!: SafetyEntity;
  @IsString() @Matches(/^[A-Za-z0-9_-]{1,160}$/) entityId!: string;
}

export class CreateSafetyReportDto extends SafetyTargetDto {
  @IsEnum(SafetyReason) reason!: SafetyReason;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class ResolveSafetyReportDto {
  @IsEnum(SafetyResolution) action!: SafetyResolution;
  @IsString() @MinLength(5) @MaxLength(1000) note!: string;
}
