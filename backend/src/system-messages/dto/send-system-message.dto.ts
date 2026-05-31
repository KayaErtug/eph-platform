import { IsIn, IsOptional, IsString } from 'class-validator';

export class SendSystemMessageDto {
  @IsString()
  @IsIn([
    'TEK_KULLANICI',
    'COKLU_KULLANICI',
    'TUM_KULLANICILAR',
    'EMLAKCILAR',
    'MUTEAHHITLER',
    'INSAAT_FIRMALARI',
    'ADMINLER',
    'SUPER_ADMINLER',
    'SEHIRLER',
    'SEHIRLER_VE_ROLLER',
    'OZEL_GRUP',
  ])
  targetType!: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  targetRole?: string;

  @IsOptional()
  targetCities?: string[];

  @IsOptional()
  targetCityPlateCodes?: string[];

  @IsOptional()
  targetRoles?: string[];

  @IsString()
  @IsIn([
    'BILGILENDIRME',
    'SIKAYET_YANITI',
    'ONERI_YANITI',
    'UYARI',
    'DUYURU',
    'HESAP_ISLEMI',
    'ILAN_ISLEMI',
    'UYELIK_PAKET_ISLEMI',
    'EVRAK_DOGRULAMA_ISLEMI',
    'NETWORK_ISLEMI',
    'GUVENLIK_BILDIRIMI',
    'BAKIM_TEKNIK_BILGILENDIRME',
    'ODEME_FATURA_BILGILENDIRMESI',
    'KURAL_IHLALI_BILDIRIMI',
    'DESTEK_YANITI',
    'DIGER',
  ])
  category!: string;

  @IsOptional()
  @IsString()
  customCategory?: string;

  @IsString()
  title!: string;

  @IsString()
  body!: string;
}