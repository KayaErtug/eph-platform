export type LocalPortfolioImage = {
  id: string;
  file: File;
  previewUrl: string;
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

export interface Unit {
  id: string;
  type: string;
  floor?: number;
  number: string;
  roomCount?: string;
  area?: number;
  price: number;
  status: string;
  description?: string;
  isVerified?: boolean;
  isOffMarket?: boolean;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  createdAt?: string;
  images?: UnitImage[];
  project: {
    id: string;
    name: string;
    city: string;
    district: string;
    address: string;
    owner: { firstName: string; lastName: string };
  };
}

export interface Project {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  isActive: boolean;
  owner: { firstName: string; lastName: string; role: string };
  units: Unit[];
  _count: { units: number };
}

export interface UnitFormState {
  type: string;
  floor: string;
  number: string;
  roomCount: string;
  area: string;
  price: string;
  status: string;
  description: string;
}

export interface ProjectFormState {
  name: string;
  city: string;
  district: string;
  address: string;
}
