export type PropertyTransactionType =
  | "SATILIK"
  | "KIRALIK";

export type PropertyDemandArea = {
  district: string;
  neighborhood: string | null;
};

export type PropertyDemandLocation = {
  city: string | null;
  areas: PropertyDemandArea[];
};

export type PropertyDemandCommercial = {
  minBudget: number | null;
  maxBudget: number | null;
  currency: string;
};

export type PropertyDemandAreaCriteria = {
  min: number | null;
  max: number | null;
};

export type PropertyDemandCardProfileCriteria = {
  version: "1.3";
  profile: string;
  values: Record<string, string[]>;
  priorities?: Record<string, "MUST" | "PREFERENCE" | "ANY">;
};

export type PropertyDemand = {
  category: string;
  requestIntent: string | null;

  transactionType: PropertyTransactionType | null;
  unitType: string | null;

  location: PropertyDemandLocation;

  commercial: PropertyDemandCommercial;
  areaCriteria: PropertyDemandAreaCriteria;

  cardProfileCriteria: PropertyDemandCardProfileCriteria | null;
  features: string[];

  title: string;
  description: string | null;

  urgency: string | null;

  validity: {
    expiresAt: string | null;
  };

  visibility: string;

  extension: Record<string, unknown> | null;
};
