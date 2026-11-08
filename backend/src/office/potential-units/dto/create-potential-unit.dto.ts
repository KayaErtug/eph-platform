import {
  PotentialUnitSource,
  PotentialUnitStatus,
  PotentialUnitType,
} from '@prisma/client';

export class CreatePotentialUnitDto {
  officeId?: string;
  type?: PotentialUnitType;
  sourceType?: PotentialUnitSource;
  contactPhone?: string;
  contactName?: string;
  photos?: string[];
  latitude!: number;
  longitude!: number;
  city?: string;
  district?: string;
  neighborhood?: string;
  street?: string;
  buildingNo?: string;
  formattedAddress?: string;
  addressNotes?: string;
  description?: string;
}

export class UpdatePotentialUnitStatusDto {
  status!: PotentialUnitStatus;
  statusNote?: string;
  assignedUserId?: string;
}

export class ConvertPotentialUnitDto {
  price?: number;
  roomCount?: string;
  netArea?: number;
  grossArea?: number;
  floor?: number;
  assignedUserId?: string;
}
