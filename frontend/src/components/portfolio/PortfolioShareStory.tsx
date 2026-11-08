"use client";

import EphStandartGayrimenkulKarti from "./EphStandartGayrimenkulKarti";
import type { EphPremiumCardData } from "./ephPremiumCardStandard";

export default function PortfolioShareStory({
  data,
  mode = "story",
}: {
  data: EphPremiumCardData;
  mode?: "story" | "reel";
}) {
  return (
    <EphStandartGayrimenkulKarti
      data={data}
      variant={mode}
    />
  );
}
