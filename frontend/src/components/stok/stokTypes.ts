export type LocalPortfolioImage = {
  id: string;
  file?: File;
  previewUrl: string;
  existing?: boolean;
  remoteId?: string;
  name?: string;
  size?: number;
  isCover?: boolean;
};

export interface UnitImage {
  id: string;
  unitId: string;
  url: string;
  supabaseUrl?: string;
  path?: string;
  bucket?: string;
  originalName?: string;
  mimetype?: string;
  size?: number;
  isCover: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type PortfolioAuthorityType =
  | "YETKI_BELGESI"
  | "TAPU"
  | "TAPU_SAHIBI_KIMLIK"
  | "KAT_KARSILIGI_SOZLESMESI"
  | "DIGER_DOGRULAMA_EVRAKI";

export interface PortfolioAuthorityDocument {
  id: string;
  unitId: string;
  authorityType: PortfolioAuthorityType;
  fileUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  approved: boolean;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectReason?: string | null;
  documentSide?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Unit {
  id: string;
  type: string;

  floor?: number;
  floorLabel?: string;
  totalFloors?: number;

  number: string;
  adaNo?: string;
  parselNo?: string;
  roomCount?: string;
  area?: number;

  price: number;
  priceCurrency?: "TRY" | "USD" | "EUR" | "GBP" | string;

  status: string;
  description?: string;
  features?: string[];

  isVerified?: boolean;
  isOffMarket?: boolean;

  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;

  approvalStatus?: string;
  submittedForApprovalAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvalNote?: string;

  isPoolVisible?: boolean;
  poolPublishedAt?: string;
  poolRemovedAt?: string;

  createdAt?: string;

  images?: UnitImage[];
  authorityDocuments?: PortfolioAuthorityDocument[];

  project: {
    id: string;
    name: string;
    city: string;
    district: string;
    address: string;

    owner: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface Project {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  isActive: boolean;

  owner: {
    firstName: string;
    lastName: string;
    role: string;
  };

  units: Unit[];

  _count: {
    units: number;
  };
}

export interface UnitFormState {
  type: string;
  floor: string;
  floorLabel?: string;
  totalFloors?: string;

  number: string;
  adaNo: string;
  parselNo: string;
  roomCount: string;
  area: string;

  price: string;

  priceCurrency?: "TRY" | "USD" | "EUR" | "GBP";

  status: string;
  description: string;
  features?: string[];
}

export interface ProjectFormState {
  name: string;
  city: string;
  district: string;
  address: string;
}