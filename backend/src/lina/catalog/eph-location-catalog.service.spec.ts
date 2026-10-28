import {
  LinaDistanceService,
} from "../geo/lina-distance.service";
import {
  LinaGeoService,
} from "../geo/lina-geo.service";
import {
  EphLocationCatalogService,
} from "./eph-location-catalog.service";

describe("EphLocationCatalogService", () => {
  let geoService: {
    resolveLocationFromMessage:
      jest.Mock;
  };

  let distanceService: {
    calculate: jest.Mock;
  };

  let service:
    EphLocationCatalogService;

  beforeEach(() => {
    geoService = {
      resolveLocationFromMessage:
        jest.fn(),
    };

    distanceService = {
      calculate: jest.fn(),
    };

    service =
      new EphLocationCatalogService(
        geoService as unknown as
          LinaGeoService,
        distanceService as unknown as
          LinaDistanceService,
      );
  });

  it("loads exactly 81 Turkish provinces and 6 KKTC districts", () => {
    expect(
      service.listRegions("TR"),
    ).toHaveLength(81);

    expect(
      service.listRegions("KKTC"),
    ).toEqual([
      "Lefkoşa",
      "Girne",
      "Gazimağusa",
      "İskele",
      "Güzelyurt",
      "Lefke",
    ]);

    expect(
      service.getSummary(),
    ).toEqual(
      expect.objectContaining({
        turkiyeProvinceCount: 81,
        kktcDistrictCount: 6,
        kktcAdministrativeLevel:
          "DISTRICT_ONLY",
        kktcNeighborhoodsVerified:
          false,
      }),
    );
  });

  it("resolves a KKTC district without inventing a neighborhood", async () => {
    const result =
      await service
        .resolveLocationFromMessage(
          "Girne'de satılık daire arıyorum.",
        );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        country: "KKTC",
        source:
          "EPH_KKTC_CATALOG",
        province: "K.K.T.C.",
        district: "Girne",
        verificationLevel:
          "DISTRICT",
      }),
    );

    expect(
      result.neighborhood,
    ).toBeUndefined();

    expect(
      geoService
        .resolveLocationFromMessage,
    ).not.toHaveBeenCalled();
  });

  it("asks for a KKTC district when only the country is known", async () => {
    const result =
      await service
        .resolveLocationFromMessage(
          "K.K.T.C. içinde yatırım yapmak istiyorum.",
        );

    expect(result.success).toBe(false);
    expect(result.country).toBe(
      "KKTC",
    );
    expect(result.alternatives).toHaveLength(
      6,
    );
  });

  it("delegates Turkish locations to LinaGeoService", async () => {
    geoService.resolveLocationFromMessage
      .mockResolvedValue({
        success: true,
        source: "TURKIYE_API",
        confidence: "high",
        province: "Denizli",
        district: "Merkezefendi",
        neighborhood:
          "Selçuk Bey Mahallesi",
        matchedText:
          "Selçuk Bey Mahallesi",
        matchType: "neighborhood",
        message:
          "Konum Türkiye API üzerinden çözümlendi.",
      });

    const result =
      await service
        .resolveLocationFromMessage(
          "Denizli Merkezefendi Selçuk Bey Mahallesi",
        );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        country: "TR",
        source: "TURKIYE_API",
        verificationLevel:
          "NEIGHBORHOOD",
        province: "Denizli",
        district: "Merkezefendi",
      }),
    );
  });

  it("delegates distance calculation to the existing service", async () => {
    distanceService.calculate
      .mockResolvedValue({
        success: true,
        decision: {
          ready: true,
        },
      });

    const input = {
      origin: {
        latitude: 37.77,
        longitude: 29.08,
      },
      destination: {
        latitude: 37.75,
        longitude: 29.1,
      },
    };

    const result =
      await service.calculateDistance(
        input,
      );

    expect(
      distanceService.calculate,
    ).toHaveBeenCalledWith(input);

    expect(result).toEqual({
      success: true,
      decision: {
        ready: true,
      },
    });
  });
});
