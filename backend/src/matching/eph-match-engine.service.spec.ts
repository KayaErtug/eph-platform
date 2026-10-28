import { EphMatchEngineService } from './eph-match-engine.service';

describe('EPH_MATCH_V1 omitted criteria and preserved policy', () => {
  const profile = {
    resolve: jest.fn(({ values }: any) => ({
      profile: { code: 'DAIRE' },
      slots: [
        { key: 'facade', value: values.facade },
        { key: 'buildingAge', value: values.buildingAge },
        { key: 'roomCount', value: values.roomCount },
      ],
    })),
  };
  const distance = { calculate: jest.fn() };
  const engine = new EphMatchEngineService(distance as any, profile as any);
  const unit = (extra: Record<string, unknown> = {}) => ({
    id: 'pool-unit', type: 'DAIRE', status: 'SATILIK', price: 6_000_000,
    area: 160, roomCount: '3+1', features: [], facade: 'Kuzey',
    project: { name: 'Havuz ilanı', city: 'Denizli', district: 'Pamukkale', neighborhood: 'Kınıklı' },
    ...extra,
  });
  const match = (demand: any, extra: Record<string, unknown> = {}, options: Record<string, unknown> = {}) => engine.matchDemandToUnit(demand, unit(extra), { useDistance: false, ...options });

  it('does not reduce score for omitted price, location or secondary criteria', async () => {
    expect((await match({}))?.matchScore).toBe(100);
    expect((await match({ city: 'Denizli' }))?.matchScore).toBe(100);
    expect((await match({ city: 'Denizli', district: 'Pamukkale' }))?.matchScore).toBe(100);
  });

  it('ignores an unrequested facade and empty CardProfile values', async () => {
    const demand = { city: 'Denizli', maxBudget: 7_000_000, minArea: 150, roomCounts: ['3+1'], cardProfileCriteria: { values: { facade: [] } } };
    expect((await match(demand, { facade: 'Kuzey' }))?.matchScore).toBe(100);
    expect((await match(demand, { facade: 'Güney' }))?.matchScore).toBe(100);
  });

  it('scores only requested CardProfile criteria', async () => {
    const demand = { cardProfileCriteria: { values: { facade: ['Güney'] } } };
    expect((await match(demand, { facade: 'Güney' }))?.matchScore).toBe(100);
    expect((await match(demand, { facade: 'Kuzey' }))?.matchScore).toBe(95);
  });

  it('excludes a known mismatch for a MUST criterion and flags missing listing data for confirmation', async () => {
    const demand = { cardProfileCriteria: { profile: 'DAIRE', values: { facade: ['Güney'] }, priorities: { facade: 'MUST' } } };
    expect(await match(demand, { facade: 'Kuzey' })).toBeNull();
    const needsConfirmation = await match(demand, { facade: null });
    expect(needsConfirmation).not.toBeNull();
    expect(needsConfirmation?.matchReasons).toContain('Teyit gerekli: ilanda Cephe bilgisi bulunmuyor');
  });

  it('keeps PREFERENCE soft and excludes ANY from score', async () => {
    const preference = { cardProfileCriteria: { profile: 'DAIRE', values: { facade: ['Güney'] }, priorities: { facade: 'PREFERENCE' } } };
    const any = { cardProfileCriteria: { profile: 'DAIRE', values: { facade: ['Güney'] }, priorities: { facade: 'ANY' } } };
    expect(await match(preference, { facade: 'Kuzey' })).not.toBeNull();
    expect((await match(any, { facade: 'Kuzey' }))?.matchScore).toBe(100);
  });

  it('treats multiple selected room configurations as exact alternatives for CardProfile', async () => {
    const demand = { cardProfileCriteria: { profile: 'DAIRE', values: { roomCount: ['3+1', '3+2', '4+1'] }, priorities: { roomCount: 'MUST' } } };
    expect(await match(demand, { roomCount: '3+2' })).not.toBeNull();
    expect(await match(demand, { roomCount: '4+2' })).toBeNull();
  });

  it('uses the CRM declared budget as a strict maximum', async () => {
    expect(await match({ maxBudget: 5_000_000 }, { price: 5_000_001 }, { source: 'CRM' })).toBeNull();
    expect((await match({ maxBudget: 5_000_000 }, { price: 5_000_000 }, { source: 'CRM' }))?.matchPolicy.priceTolerancePercent).toBe(0);
  });

  it('restricts CRM matching to the selected district and neighborhood', async () => {
    const demand = { city: 'Denizli', district: 'Pamukkale', neighborhood: 'Kınıklı' };
    expect(await match(demand, {}, { source: 'CRM' })).not.toBeNull();
    expect(await match(demand, { project: { city: 'Denizli', district: 'Pamukkale', neighborhood: 'Asmalıevler' } }, { source: 'CRM' })).toBeNull();
  });

  it.each([
    ['DAIRE', 'RESIDENTIAL', 30, 10, 5, 5],
    ['ARSA', 'LAND', 40, 12, 0, 8],
    ['FABRIKA_URETIM_TESISI', 'INDUSTRIAL', 40, 8, 0, 12],
    ['DUKKAN_MAGAZA', 'COMMERCIAL', 35, 10, 0, 10],
    ['OTEL', 'TOURISM', 35, 8, 2, 10],
    ['KONUT_PROJESI', 'PROJECT', 35, 8, 2, 10],
  ])('preserves %s tolerance and secondary weights', async (type, group, tolerance, area, room, features) => {
    const result = await match({}, { type });
    expect(result?.matchPolicy.propertyGroup).toBe(group);
    expect(result?.matchPolicy.priceTolerancePercent).toBe(tolerance);
    expect((await match({ maxArea: 100 }, { type }))?.matchScore).toBe(100 - Number(area));
    expect((await match({ roomCounts: ['4+1'] }, { type }))?.matchScore).toBe(100 - Number(room));
    expect((await match({ features: ['Asansör'] }, { type }))?.matchScore).toBe(100 - Number(features));
  });

  it('treats requested apartment room count as a minimum', async () => {
    expect(
      (await match(
        { roomCounts: ['2+1'] },
        { roomCount: '4+2' },
      ))?.matchScore,
    ).toBe(100);

    expect(
      (await match(
        { roomCounts: ['2+1'] },
        { roomCount: '1+1' },
      ))?.matchScore,
    ).toBe(95);
  });

  it('combines minimum room count and maximum building age semantics', async () => {
    const demand = {
      roomCounts: ['2+1'],
      cardProfileCriteria: {
        profile: 'DAIRE',
        values: {
          buildingAge: ['5'],
        },
      },
    };

    expect(
      (await match(
        demand,
        {
          roomCount: '4+2',
          buildingAge: 1,
        },
      ))?.matchScore,
    ).toBe(100);
  });

  it('applies CardProfile maximum building age semantics', async () => {
    const demand = {
      cardProfileCriteria: {
        profile: 'DAIRE',
        values: {
          buildingAge: ['5'],
        },
      },
    };

    expect(
      (await match(demand, { buildingAge: 1 }))?.matchScore,
    ).toBe(100);

    expect(
      (await match(demand, { buildingAge: 5 }))?.matchScore,
    ).toBe(100);

    expect(
      (await match(demand, { buildingAge: 8 }))?.matchScore,
    ).toBe(95);
  });

  it('preserves city, type, status and minimum-area exclusions', async () => {
    for (const demand of [{ city: 'İzmir' }, { propertyTypes: ['ARSA'] }, { statuses: ['KIRALIK'] }, { minArea: 170 }]) {
      expect(await match(demand)).toBeNull();
    }
  });

  it('preserves negotiation intersection rather than inventing a new price tolerance', async () => {
    expect(await match({ maxBudget: 5_000_000 }, { price: 9_000_000 })).not.toBeNull();
    expect(await match({ maxBudget: 5_000_000 }, { price: 9_500_000 })).toBeNull();
  });

  it.each([[75, 'GUCLU'], [74, 'UYGUN'], [40, 'UYGUN'], [39, 'ZAYIF']])('preserves score boundary %s', (score, level) => {
    expect((engine as any).getMatchLevel(score)).toBe(level);
  });
});

describe('Paid scan policy across all entry points', () => {
  const profile = { resolve: jest.fn(({ values }: any) => ({ profile: { code: 'DAIRE' }, slots: [
    { key: 'facade', value: values.facade }, { key: 'roomCount', value: values.roomCount },
    { key: 'netArea', value: values.netArea }, { key: 'grossArea', value: values.grossArea },
  ] })) };
  const engine = new EphMatchEngineService({ calculate: jest.fn() } as any, profile as any);
  const baseDemand = { city: 'Denizli', district: 'Merkezefendi', neighborhood: 'Adalet', propertyTypes: ['DAIRE'],
    statuses: ['SATILIK'], maxBudget: 5000000, priceCurrency: 'TRY', roomCounts: ['3+1'] };
  const baseUnit = { id: 'unit', type: 'DAIRE', status: 'SATILIK', price: 4500000, priceCurrency: 'TRY', area: 130,
    roomCount: '3+1', features: [], project: { name: 'Adalet', city: 'Denizli', district: 'Merkezefendi', neighborhood: 'Adalet', isActive: true } };
  const match = (unit: any = {}, demand: any = {}) => engine.matchDemandToUnit({ ...baseDemand, ...demand }, { ...baseUnit, ...unit }, { paidScan: true, source: 'TALEP_MERKEZI', useDistance: false });
  it('uses strict budget for request scans too', async () => { expect(await match({ price: 5000001 })).toBeNull(); });
  it('honors the minimum budget', async () => { expect(await match({ price: 4000000 }, { minBudget: 4100000 })).toBeNull(); });
  it.each(['USD', 'EUR'])('does not compare different currencies %s', async priceCurrency => { expect(await match({ priceCurrency })).toBeNull(); });
  it('accepts the TL/TRY alias', async () => { expect(await match({ priceCurrency: 'TL' })).not.toBeNull(); });
  it('does not treat a longer neighborhood name as an exact match', async () => { expect(await match({ project: { ...baseUnit.project, neighborhood: 'Adalet Park' } })).toBeNull(); });
  it('rejects another district and missing district', async () => { for (const district of ['Pamukkale', null]) expect(await match({ project: { ...baseUnit.project, district } })).toBeNull(); });
  it('rejects absent area when a minimum is required', async () => { expect(await match({ area: null }, { minArea: 100 })).toBeNull(); });
  it('enforces both area bounds', async () => { expect(await match({ area: 180 }, { minArea: 100, maxArea: 150 })).toBeNull(); });
  it('does not silently satisfy a missing MUST listing feature', async () => { expect(await match({}, { cardProfileCriteria: { values: { facade: ['Güney'] }, priorities: { facade: 'MUST' } } })).toBeNull(); });
  it('keeps an unknown PREFERENCE and explains the missing information', async () => { const r = await match({}, { cardProfileCriteria: { values: { facade: ['Güney'] }, priorities: { facade: 'PREFERENCE' } } }); expect(r?.matchReasons).toContain('Bilgi eksik: Cephe teyit edilmeli'); });
  it('ANY ignores the corresponding criterion', async () => { expect((await match({ roomCount: '1+1' }, { cardProfileCriteria: { values: { roomCount: ['3+1'] }, priorities: { roomCount: 'ANY' } } }))?.matchScore).toBe(100); });
  it('default basic room criteria exclude too-small rooms; PREFERENCE remains soft', async () => { expect(await match({ roomCount: '2+1' })).toBeNull(); expect(await match({ roomCount: '2+1' }, { cardProfileCriteria: { values: { roomCount: ['3+1'] }, priorities: { roomCount: 'PREFERENCE' } } })).not.toBeNull(); });
  it.each([{ status: 'SATILDI' }, { isOffMarket: true }, { price: 0 }, { price: NaN }])('excludes an unavailable or invalid-price unit %j', async unit => { expect(await match(unit)).toBeNull(); });
});
