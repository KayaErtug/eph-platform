import { LinaNetworkRequestDraftService } from "./lina-network-request-draft.service";
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';

describe("LinaNetworkRequestDraftService", () => {
  const propertyCardProfileService = {
    getProfile: jest.fn((unitType: string) => {
      const profiles: Record<string, string[]> = {
        DAIRE: ["roomCount", "netArea", "floor", "buildingAge", "heatingType", "parkingType", "facade", "elevatorStatus"],
        FABRIKA: ["closedArea", "openArea", "electricityPower", "ceilingHeight", "tirEntranceStatus", "loadingRampStatus", "officeArea", "fireSystemStatus"],
      };
      const keys = profiles[unitType] || [];
      return { profile: { slots: keys.map((key) => ({ key, sourceKeys: [key] })) } };
    }),
  };
  it("returns a canonical, approval-only draft", async () => {
    const openAiClient = {
      createResponse: jest.fn().mockResolvedValue({
        output_text: JSON.stringify({
          category: "PORTFOY_ARIYORUM", requestIntent: "PORTFOY_SATILIK", propertyType: "DAIRE",
          roomCounts: ["invalid"], minArea: 120, city: "istanbul", maxBudget: 9000000,
          currency: "TRY", urgency: "Müşteri Hazır", confidence: 0.91, warnings: [],
        }),
      }),
    };
    const locationCatalog = {
      resolveLocationFromMessage: jest.fn().mockResolvedValue({
        success: true, province: "İstanbul", district: "Kadıköy", neighborhood: "Fenerbahçe",
      }),
    };
    const service = new LinaNetworkRequestDraftService(openAiClient as never, locationCatalog as never, propertyCardProfileService as never);

    const result = await service.create("İstanbul Kadıköy'de 3+1 satılık daire arıyorum");

    expect(result.requiresApproval).toBe(true);
    expect(result.draft).toMatchObject({
      category: "PORTFOY_ARIYORUM", requestIntent: "PORTFOY_SATILIK", propertyType: "DAIRE",
      roomCounts: ["3+1"], city: "İstanbul",
      areas: [{ city: "İstanbul", district: "Kadıköy", neighborhood: "Fenerbahçe" }],
    });
  });

  it("rejects an empty request", async () => {
    const service = new LinaNetworkRequestDraftService({} as never, {} as never, propertyCardProfileService as never);
    await expect(service.create("kısa")).rejects.toThrow("8-1500");
  });

  it("maps canonical profile criteria and verifies every requested neighborhood", async () => {
    const openAiClient = {
      createResponse: jest.fn().mockResolvedValue({
        output_text: JSON.stringify({
          category: "PORTFOY_ARIYORUM", requestIntent: "PORTFOY_SATILIK", propertyType: "DAIRE",
          roomCounts: [], profileCriteria: { parkingType: ["Var"] }, minArea: 120, city: "Denizli",
          areas: [
            { city: "Denizli", district: "Merkezefendi", neighborhood: "Şemikler" },
            { city: "Denizli", district: "Merkezefendi", neighborhood: "Akkonak" },
          ],
          maxBudget: 8000000, currency: "TRY", urgency: "Normal", confidence: 0.95, warnings: [],
        }),
      }),
    };
    const locationCatalog = {
      resolveLocationFromMessage: jest.fn().mockImplementation(async (message: string) => {
        if (message.includes("Şemikler")) return { success: true, province: "Denizli", district: "Merkezefendi", neighborhood: "Şemikler" };
        if (message.includes("Akkonak")) return { success: true, province: "Denizli", district: "Merkezefendi", neighborhood: "Akkonak" };
        return { success: false, source: "NONE", message: "Katalog geçici olarak yanıt vermedi." };
      }),
    };
    const service = new LinaNetworkRequestDraftService(openAiClient as never, locationCatalog as never, propertyCardProfileService as never);
    const message = "Denizli Merkezefendi Şemikler ve Akkonak'ta satılık 3+1 veya 4+1 daire arıyorum. En az 120 m² olsun. Bütçem maksimum 8 milyon TL. Asansör ve otopark olsun.";

    const result = await service.create(message);

    expect(result.draft).toMatchObject({
      roomCounts: ["3+1", "4+1"], minArea: 120, maxBudget: 8000000, city: "Denizli",
      title: "Merkezefendi 3+1 / 4+1 Satılık Daire",
      areas: [
        { city: "Denizli", district: "Merkezefendi", neighborhood: "Şemikler" },
        { city: "Denizli", district: "Merkezefendi", neighborhood: "Akkonak" },
      ],
      profileCriteria: { elevatorStatus: ["Var"] },
    });
    expect(result.draft.profileCriteria.parkingType).toEqual(["Açık Otopark"]);
    expect(result.draft.title.length).toBeGreaterThanOrEqual(5);
    expect(result.draft.title.length).toBeLessThanOrEqual(50);
    expect(result.draft.detail).toBe(message);
    expect(result.draft.detail.length).toBeGreaterThanOrEqual(12);
    expect(result.draft.detail.length).toBeLessThanOrEqual(200);
    expect(result.warnings.some((warning) => warning.includes("Otopark"))).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("Konum"))).toBe(false);
  });

  it.each([
    ["otopark olsun", "Açık Otopark"],
    ["kapalı otopark olsun", "Kapalı Otopark"],
    ["açık otopark olsun", "Açık Otopark"],
    ["otopark olmasın", "Yok"],
    ["otopark mevcut", "Açık Otopark"],
    ["otoparklı olsun", "Açık Otopark"],
    ["otopark istiyorum", "Açık Otopark"],
    ["kapalı garaj olsun", "Kapalı Otopark"],
  ])("maps %s to canonical %s", async (parkingText, expected) => {
    const openAiClient = { createResponse: jest.fn().mockResolvedValue({
      output_text: JSON.stringify({ propertyType: "DAIRE", profileCriteria: {}, warnings: [] }),
    }) };
    const locationCatalog = { resolveLocationFromMessage: jest.fn().mockResolvedValue({ success: false }) };
    const service = new LinaNetworkRequestDraftService(openAiClient as never, locationCatalog as never, propertyCardProfileService as never);

    const result = await service.create(`Denizli'de daire arıyorum, ${parkingText}.`);

    expect(result.draft.profileCriteria.parkingType).toEqual([expected]);
    if (parkingText === "otopark olmasın") {
      expect(result.draft.profileCriteria.parkingType).not.toContain("Açık Otopark");
    }
  });

  it.each([
    "bina yaşı 5-10",
    "5-10 yaş arası",
  ])("maps %s to the numeric building age range", async (buildingAgeText) => {
    const openAiClient = { createResponse: jest.fn().mockResolvedValue({
      output_text: JSON.stringify({ propertyType: "DAIRE", profileCriteria: {}, warnings: [] }),
    }) };
    const locationCatalog = { resolveLocationFromMessage: jest.fn().mockResolvedValue({ success: false }) };
    const service = new LinaNetworkRequestDraftService(openAiClient as never, locationCatalog as never, propertyCardProfileService as never);

    const result = await service.create(`Denizli'de satılık daire arıyorum, ${buildingAgeText}.`);

    expect(result.draft.profileCriteria.buildingAge).toEqual([
      "5", "6", "7", "8", "9", "10",
    ]);
  });

  it("keeps the warning for an unknown location", async () => {
    const openAiClient = { createResponse: jest.fn().mockResolvedValue({
      output_text: JSON.stringify({ city: "Atlantis", areas: [], warnings: [] }),
    }) };
    const locationCatalog = { resolveLocationFromMessage: jest.fn().mockResolvedValue({ success: false }) };
    const service = new LinaNetworkRequestDraftService(openAiClient as never, locationCatalog as never, propertyCardProfileService as never);

    const result = await service.create("Atlantis merkezde satılık bir daire arıyorum");

    expect(result.warnings).toContain("Konum EPH kataloğunda kesin doğrulanamadı; yayınlamadan önce kontrol edin.");
  });

  it('prepares the seven-neighborhood request as a draft with its budget', async () => {
    const neighborhoods = ['Adalet', 'Şemikler', 'Selçuk Bey', 'Değirmenönü', 'Karaman', 'Servergazi', 'Gerzele'];
    const openAiClient = { createResponse: jest.fn().mockResolvedValue({ output_text: JSON.stringify({
      category: 'PORTFOY_ARIYORUM', requestIntent: 'PORTFOY_SATILIK', propertyType: 'DAIRE',
      city: 'Denizli', areas: neighborhoods.map(neighborhood => ({ city: 'Denizli', district: 'Merkezefendi', neighborhood })),
      maxBudget: 8000000, currency: 'TRY', profileCriteria: {}, confidence: 0.95,
    }) }) };
    const catalog = { resolveLocationFromMessage: jest.fn().mockImplementation(async (message: string) => ({ success: true, province: 'Denizli', district: 'Merkezefendi', neighborhood: neighborhoods.find(name => message.endsWith(name)) || 'Adalet' })) };
    const service = new LinaNetworkRequestDraftService(openAiClient as never, catalog as never, propertyCardProfileService as never);
    const result = await service.create(`Denizli Merkezefendi ${neighborhoods.join(', ')} mahallelerinde satılık 3+1 veya 4+1 daire arıyorum. Bütçem maks 8 milyon TL.`);
    expect(result.draft.roomCounts).toEqual(['3+1', '4+1']);
    expect(result.draft.maxBudget).toBe(8000000);
    expect(result.draft.areas).toHaveLength(7);
    expect(result.requiresApproval).toBe(true);
    expect(openAiClient.createResponse.mock.calls[0][0]).toMatchObject({ tools: [], toolChoice: 'none', maxOutputTokens: 1800 });
  });

  it.each(['{ "city":', '', '[]'])('reports incomplete or invalid model JSON safely (%s)', async output_text => {
    const client = { createResponse: jest.fn().mockResolvedValue({ output_text }) };
    const service = new LinaNetworkRequestDraftService(client as never, {} as never, propertyCardProfileService as never);
    await expect(service.create('Denizli\'de satılık daire arıyorum')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('does not expose provider errors or fabricate a draft during an outage', async () => {
    const client = { createResponse: jest.fn().mockRejectedValue(new Error('OPENAI_RESPONSES_HTTP_401:private details')) };
    const service = new LinaNetworkRequestDraftService(client as never, {} as never, propertyCardProfileService as never);
    try { await service.create('Denizli\'de satılık daire arıyorum'); throw new Error('Expected failure'); }
    catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getResponse()).toMatchObject({ code: 'LINA_REQUEST_DRAFT_UNAVAILABLE' });
      expect(JSON.stringify((error as ServiceUnavailableException).getResponse())).not.toContain('private details');
    }
  });
});
