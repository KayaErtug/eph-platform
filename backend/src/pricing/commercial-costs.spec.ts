import { COST_DEFAULTS, isManagedCommercialKey, parseCostValue, readCost } from './commercial-costs';

const fakeDb = (rows: Array<{ key: string; valueJson: unknown }>) => ({
  systemSetting: {
    findUnique: async ({ where }: { where: { key: string } }) => rows.find((row) => row.key === where.key) ?? null,
  },
}) as never;

describe('commercial-costs', () => {
  it('parses number, numeric string and {value}', () => {
    expect(parseCostValue(25)).toBe(25);
    expect(parseCostValue('10')).toBe(10);
    expect(parseCostValue({ value: 7 })).toBe(7);
    expect(parseCostValue(0)).toBe(0);
  });

  it('rejects invalid values', () => {
    expect(parseCostValue(-1)).toBeNull();
    expect(parseCostValue(1.5)).toBeNull();
    expect(parseCostValue('abc')).toBeNull();
    expect(parseCostValue(null)).toBeNull();
    expect(parseCostValue([])).toBeNull();
  });

  it('falls back to the built-in default when no setting exists', async () => {
    expect(await readCost(fakeDb([]), 'COST_HAVUZ_PORTFOY_YAYIN')).toBe(COST_DEFAULTS.COST_HAVUZ_PORTFOY_YAYIN);
  });

  it('prefers COST_* over legacy keys, then legacy, then default', async () => {
    const both = fakeDb([{ key: 'COST_OZEL_BILGI', valueJson: 30 }, { key: 'POOL_PRIVATE_INFO_COST', valueJson: 20 }]);
    expect(await readCost(both, 'COST_OZEL_BILGI', ['POOL_PRIVATE_INFO_COST'])).toBe(30);
    const legacyOnly = fakeDb([{ key: 'POOL_PRIVATE_INFO_COST', valueJson: { value: 20 } }]);
    expect(await readCost(legacyOnly, 'COST_OZEL_BILGI', ['POOL_PRIVATE_INFO_COST'])).toBe(20);
    const invalid = fakeDb([{ key: 'COST_OZEL_BILGI', valueJson: -5 }]);
    expect(await readCost(invalid, 'COST_OZEL_BILGI')).toBe(25);
  });

  it('allows a zero cost', async () => {
    expect(await readCost(fakeDb([{ key: 'COST_TALEP_ACIL_EK', valueJson: 0 }]), 'COST_TALEP_ACIL_EK')).toBe(0);
  });

  it('has no hard-coded backup for the scan tariff (§0-B) but stays admin-managed', () => {
    expect(COST_DEFAULTS).not.toHaveProperty('COST_ESLESME_TARAMA');
    expect(isManagedCommercialKey('COST_ESLESME_TARAMA')).toBe(true);
  });
});
