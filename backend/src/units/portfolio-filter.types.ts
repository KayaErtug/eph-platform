import { UnitStatus, UnitType } from '@prisma/client';

export type PortfolioSortMode =
  | 'NEWEST'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'AREA_DESC';

export type PortfolioLocationState =
  | 'WITH_LOCATION'
  | 'WITHOUT_LOCATION';

export type PortfolioCreditState =
  | 'CREDIT_AVAILABLE'
  | 'CREDIT_UNAVAILABLE';

export type PortfolioSwapState =
  | 'SWAP_AVAILABLE'
  | 'SWAP_UNAVAILABLE';

export type PortfolioDateRange =
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS';

export type PortfolioFilterCriteria = {
  keyword?: string;

  types?: UnitType[];
  statuses?: UnitStatus[];

  cities?: string[];
  districts?: string[];
  neighborhoods?: string[];

  rooms?: string[];
  floors?: string[];
  currencies?: string[];
  features?: string[];

  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;

  locationStates?: PortfolioLocationState[];
  creditStates?: PortfolioCreditState[];
  swapStates?: PortfolioSwapState[];
  dateRanges?: PortfolioDateRange[];

  advisorIds?: string[];

  sort?: PortfolioSortMode;
};

export const EMPTY_PORTFOLIO_FILTER_CRITERIA: PortfolioFilterCriteria = {
  keyword: '',
  types: [],
  statuses: [],
  cities: [],
  districts: [],
  neighborhoods: [],
  rooms: [],
  floors: [],
  currencies: [],
  features: [],
  locationStates: [],
  creditStates: [],
  swapStates: [],
  dateRanges: [],
  advisorIds: [],
  sort: 'NEWEST',
};
