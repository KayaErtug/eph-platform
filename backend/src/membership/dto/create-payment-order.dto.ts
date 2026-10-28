import { UyelikPaketKodu } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreatePaymentOrderDto {
  @IsEnum(UyelikPaketKodu)
  paketKodu!: UyelikPaketKodu;
}
