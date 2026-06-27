import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

function normalizePhoneForSystem(value?: string | null) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');

  let local = digits;

  if (local.startsWith('0090')) {
    local = local.slice(4);
  }

  if (local.startsWith('90')) {
    local = local.slice(2);
  }

  if (local.startsWith('0')) {
    local = local.slice(1);
  }

  if (local.length > 10) {
    local = local.slice(-10);
  }

  if (local.length !== 10 || !local.startsWith('5')) {
    return raw;
  }

  return `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
}

export enum RegistrationType {
  EMLAK_DANISMANI = 'EMLAK_DANISMANI',
  EMLAK_OFISI = 'EMLAK_OFISI',
  MUTEAHHIT = 'MUTEAHHIT',
  INSAAT_FIRMASI = 'INSAAT_FIRMASI',
}

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @Transform(({ value }) => normalizePhoneForSystem(value))
  @IsString()
  @Matches(/^\+90 5\d{2} \d{3} \d{2} \d{2}$/, {
    message: 'Telefon numarası +90 532 282 88 75 formatına uygun olmalıdır',
  })
  phone: string;

  @Transform(({ value }) => String(value || '').trim())
  @IsString()
  @MinLength(2, {
    message: 'Şehir seçimi zorunludur',
  })
  city: string;

  @IsEnum(Role, {
    message: 'Geçerli bir meslek seçiniz',
  })
  role: Role;

  @IsOptional()
  @IsEnum(RegistrationType, {
    message: 'Geçerli bir kayıt türü seçiniz',
  })
  registrationType?: RegistrationType;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}
