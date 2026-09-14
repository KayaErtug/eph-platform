"use client";

import EphStandartGayrimenkulKarti from "./EphStandartGayrimenkulKarti";
import type {
  EphPortfolioShareInput,
  EphPremiumCardData,
} from "./ephPremiumCardStandard";

export type PortfolioShareFeature = {
  icon: string;
  label: string;
};

export type PortfolioShareData = EphPortfolioShareInput;

export default function PortfolioShareCard({
  data,
}: {
  data: EphPremiumCardData;
}) {
  return (
    <EphStandartGayrimenkulKarti
      data={data}
      variant="whatsapp"
    />
  );
}
