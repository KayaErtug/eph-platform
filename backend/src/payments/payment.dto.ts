import { Type } from 'class-transformer';
import { ArrayMaxSize, Equals, IsArray, IsBoolean, IsDefined, IsEmail, IsIn, IsInt, IsNotEmpty, IsString, IsOptional, IsDateString, IsNumber, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class MembershipPackageSettingsDto {
  @IsString() @Length(2,80) paketAdi!: string;
  @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(10000000) fiyat!: number;
  @IsInt() @Min(0) @Max(10000000) aylikPaketPk!: number;
  @IsInt() @Min(0) @Max(10000000) aktifPortfoyLimiti!: number;
  @IsInt() @Min(-1) @Max(10000000) aktifCrmLimiti!: number;
  @IsInt() @Min(0) @Max(10000000) aylikTalepLimiti!: number;
  @IsInt() @Min(0) @Max(10000000) aylikHavuzGonderimLimiti!: number;
  @IsOptional() @IsInt() @Min(1) @Max(36500) denemeGunSayisi!: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(10000000) projeLimiti!: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(10000000) projeIlanLimiti!: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(10000000) ofisAltKullaniciLimiti!: number | null;
  @IsBoolean() aktifMi!: boolean;
  @IsDateString() expectedUpdatedAt!: string;
}

export class BillingDto {
  @IsString() @Length(2, 80) firstName!: string;
  @IsString() @Length(2, 80) lastName!: string;
  @IsEmail() @MaxLength(160) email!: string;
  @Matches(/^\+90[0-9]{10}$/) phone!: string;
  @Matches(/^[1-9][0-9]{10}$/) identityNumber!: string;
  @IsString() @Length(10, 300) address!: string;
  @IsString() @Length(2, 80) city!: string;
}

export class CheckoutDto {
  @IsIn(['MEMBERSHIP', 'PK']) kind!: 'MEMBERSHIP' | 'PK';
  @Matches(/^[A-Z0-9_-]{2,60}$/) productCode!: string;
  @IsString() @Matches(/^[a-f0-9]{64}$/) termsVersion!: string;
  @Equals(true) acceptedTerms!: boolean;
  @IsDefined() @ValidateNested() @Type(() => BillingDto) billing!: BillingDto;
}

export class RefundRequestDto {
  @IsString() @Length(10, 500) reason!: string;
}

export class MembershipPriceDto {
  @IsInt() @Min(1) @Max(1000000000) amountMinor!: number;
  @IsBoolean() active!: boolean;
}

export class PkProductDto {
  @Matches(/^[A-Z0-9_-]{2,60}$/) code!: string;
  @IsString() @Length(2, 80) name!: string;
  @IsInt() @Min(1) @Max(10000000) credits!: number;
  @IsInt() @Min(1) @Max(1000000000) amountMinor!: number;
  @IsBoolean() active!: boolean;
}

export class PaymentSettingsDto {
  @IsBoolean() approved!: boolean;
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => PkProductDto) pkProducts!: PkProductDto[];
  @IsString() @IsNotEmpty() @MaxLength(250) sellerName!: string;
  @IsString() @Length(10, 300) sellerAddress!: string;
  @IsString() @Length(2, 80) taxOffice!: string;
  @Matches(/^[0-9]{10,11}$/) taxNumber!: string;
  @IsString() @Length(2, 80) registryNumber!: string;
  @IsEmail() @MaxLength(160) email!: string;
  @IsString() @Length(10, 30) phone!: string;
  @IsString() @Length(30, 5000) delivery!: string;
  @IsString() @Length(30, 5000) refunds!: string;
  @IsString() @Length(30, 5000) sales!: string;
  @IsString() @Length(30, 5000) privacy!: string;
}
