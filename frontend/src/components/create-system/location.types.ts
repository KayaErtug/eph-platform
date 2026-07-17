export const EPH_LOCATION_VERSION = "1.0.0" as const;

export type EPHLocationScope =
  | "CITY"
  | "DISTRICT"
  | "NEIGHBORHOOD";

export type EPHLocationArea = {
  country: string;
  city: string;
  district: string;
  neighborhood: string;

  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
};

export type EPHLocationAreaInput = {
  country?: unknown;
  city?: unknown;
  district?: unknown;
  neighborhood?: unknown;

  latitude?: unknown;
  longitude?: unknown;
  placeId?: unknown;
};

export type EPHLegacyLocationFields = {
  city: string;
  district: string;
  neighborhood: string;
};
