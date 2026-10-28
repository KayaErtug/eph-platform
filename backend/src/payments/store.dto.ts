import { Type } from 'class-transformer';
import { ArrayMaxSize, Equals, IsArray, IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

export type StorePlatform = 'APPLE' | 'GOOGLE';
export type StoreMode = 'sandbox' | 'live';

export class StoreProductDto {
  @IsIn(['APPLE', 'GOOGLE']) platform: StorePlatform;
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/) sku: string;
  @IsIn(['MEMBERSHIP', 'PK']) kind: 'MEMBERSHIP' | 'PK';
  @Matches(/^[A-Z0-9_-]{2,60}$/) productCode: string;
  @IsOptional() @IsIn(['EMLAK_PRO', 'MUTEAHHIT']) segment?: string;
  @IsBoolean() active: boolean;
}

export class StoreSettingsDto {
  @IsBoolean() approved: boolean;
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => StoreProductDto)
  products: StoreProductDto[];
}

export class StoreIntentDto {
  @IsIn(['APPLE', 'GOOGLE']) platform: StorePlatform;
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/) sku: string;
  @Matches(/^[a-f0-9]{64}$/) termsVersion: string;
  @Equals(true) acceptedTerms: boolean;
}

export class StoreVerifyDto {
  @IsIn(['APPLE', 'GOOGLE']) platform: StorePlatform;
  @IsIn(['sandbox', 'live']) mode: StoreMode;
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/) sku: string;
  @IsOptional() @Matches(/^[0-9]{1,60}$/) transactionId?: string;
  @IsOptional() @IsString() @MaxLength(8192) purchaseToken?: string;
}
