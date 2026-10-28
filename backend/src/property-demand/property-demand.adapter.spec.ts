import { PropertyDemandAdapter } from "./property-demand.adapter";

const META_PREFIX = "__EPH_META__REQUEST_CRITERIA__:";

describe("PropertyDemandAdapter", () => {
  const adapter = new PropertyDemandAdapter();

  it("maps Network SATILIK DAIRE", () => {
    const result = adapter.fromNetworkPost({
      type: "PORTFOY_ARIYORUM",
      tags: ["Talep Türü:PORTFOY_SATILIK"],
      propertyTypes: ["DAIRE"],
      city: "Denizli",
      district: "Pamukkale",
      title: "Daire aranıyor",
      priceCurrency: "TRY",
    });

    expect(result.transactionType).toBe("SATILIK");
    expect(result.unitType).toBe("DAIRE");
  });

  it("maps Network KIRALIK DAIRE", () => {
    const result = adapter.fromNetworkPost({
      type: "PORTFOY_ARIYORUM",
      tags: ["Talep Türü:PORTFOY_KIRALIK"],
      propertyTypes: ["DAIRE"],
      title: "Kiralık daire",
    });

    expect(result.transactionType).toBe("KIRALIK");
  });

  it("decodes legacy __EPH_META__ criteria", () => {
    const result = adapter.fromNetworkPost({
      type: "PORTFOY_ARIYORUM",
      propertyTypes: ["DAIRE"],
      features: [
        `${META_PREFIX}${JSON.stringify({
          version: "1.0",
          unitType: "DAIRE",
          cardProfile: "DAIRE",
          values: { floorLabel: ["2. Kat"] },
        })}`,
      ],
      title: "Talep",
    });

    expect(result.cardProfileCriteria).toEqual({
      version: "1.3",
      profile: "DAIRE",
      values: { floorLabel: ["2. Kat"] },
    });
  });

  it("removes metadata from canonical feature list", () => {
    const meta = `${META_PREFIX}${JSON.stringify({ values: { floorLabel: ["2. Kat"] } })}`;
    const result = adapter.fromNetworkPost({
      type: "PORTFOY_ARIYORUM",
      propertyTypes: ["DAIRE"],
      features: ["Asansör", meta, "Otopark"],
      title: "Talep",
    });

    expect(result.features).toEqual(["Asansör", "Otopark"]);
  });

  it("uses roomCounts as card profile roomCount fallback", () => {
    const result = adapter.fromNetworkPost({
      type: "PORTFOY_ARIYORUM",
      propertyTypes: ["DAIRE"],
      roomCounts: ["2+1", "3+1"],
      title: "Talep",
    });

    expect(result.cardProfileCriteria?.values.roomCount).toEqual(["2+1", "3+1"]);
  });

  it("keeps CardProfile roomCount over legacy roomCounts", () => {
    const result = adapter.fromNetworkPost({
      type: "PORTFOY_ARIYORUM",
      propertyTypes: ["DAIRE"],
      roomCounts: ["2+1"],
      features: [
        `${META_PREFIX}${JSON.stringify({
          cardProfile: "DAIRE",
          values: { roomCount: ["4+1"] },
        })}`,
      ],
      title: "Talep",
    });

    expect(result.cardProfileCriteria?.values.roomCount).toEqual(["4+1"]);
  });

  it("preserves recognized criterion priorities from CRM and network records", () => {
    const result = adapter.fromCustomerInterest({
      propertyTypes: ["DAIRE"],
      cardProfileCriteria: {
        profile: "DAIRE",
        values: { roomCount: ["3+1", "3+2", "4+1"] },
        priorities: { roomCount: "MUST", facade: "PREFERENCE", elevatorStatus: "ANY", invalid: "HIGH" },
      },
    });
    expect(result.cardProfileCriteria?.priorities).toEqual({
      roomCount: "MUST",
      facade: "PREFERENCE",
      elevatorStatus: "ANY",
    });
  });

  it("prefers structured areas and removes duplicates", () => {
    const result = adapter.fromNetworkPost({
      type: "PORTFOY_ARIYORUM",
      city: "Denizli",
      district: "Legacy District",
      areas: [
        { city: "Denizli", district: "Pamukkale", neighborhood: "Kınıklı" },
        { city: "Denizli", district: "Pamukkale", neighborhood: "Kınıklı" },
        { city: "Denizli", district: "Merkezefendi", neighborhood: null },
      ],
      title: "Talep",
    });

    expect(result.location).toEqual({
      city: "Denizli",
      areas: [
        { district: "Pamukkale", neighborhood: "Kınıklı" },
        { district: "Merkezefendi", neighborhood: null },
      ],
    });
  });

  it("maps CRM transaction intent", () => {
    expect(
      adapter.fromCustomerInterest({ purchaseIntent: "SATIN_ALMA" }).transactionType,
    ).toBe("SATILIK");
    expect(
      adapter.fromCustomerInterest({ purchaseIntent: "KIRALAMA" }).transactionType,
    ).toBe("KIRALIK");
    expect(
      adapter.fromCustomerInterest({ purchaseIntent: "YATIRIM" }).transactionType,
    ).toBeNull();
  });

  it("maps budget fields with Network legacy budget fallback", () => {
    const network = adapter.fromNetworkPost({ budget: 5000000, title: "Talep" });
    expect(network.commercial).toEqual({
      minBudget: null,
      maxBudget: 5000000,
      currency: "TRY",
    });

    const crm = adapter.fromCustomerInterest({
      minBudget: 3000000,
      maxBudget: 4500000,
      priceCurrency: "USD",
    });
    expect(crm.commercial).toEqual({
      minBudget: 3000000,
      maxBudget: 4500000,
      currency: "USD",
    });
  });

  it("maps area range and normalizes reversed bounds", () => {
    const result = adapter.fromNetworkPost({ minArea: 200, maxArea: 120, title: "Talep" });
    expect(result.areaCriteria).toEqual({ min: 120, max: 200 });
  });

  it("maps landSharePercent to extension", () => {
    const result = adapter.fromNetworkPost({
      type: "KAT_KARSILIGI_ARSA_ARIYORUM",
      landSharePercent: 45,
      title: "Arsa aranıyor",
    });
    expect(result.extension).toEqual({ landSharePercent: 45 });
  });

  it("does not mutate input", () => {
    const input = {
      type: "PORTFOY_ARIYORUM",
      tags: ["Talep Türü:PORTFOY_SATILIK"],
      propertyTypes: ["DAIRE"],
      roomCounts: ["2+1"],
      areas: [{ city: "Denizli", district: "Pamukkale", neighborhood: "Kınıklı" }],
      features: ["Asansör"],
      title: "Talep",
    };
    const before = JSON.parse(JSON.stringify(input));
    adapter.fromNetworkPost(input);
    expect(input).toEqual(before);
  });
});
