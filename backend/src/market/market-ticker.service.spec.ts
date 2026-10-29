import { MarketTickerService, parseTcmb } from './market-ticker.service';

const xml = (date: string, usd: string, eur: string, gbp: string) => `<Tarih_Date Tarih="${date}" Date="x">
<Currency Kod="USD"><Unit>1</Unit><ForexSelling>${usd}</ForexSelling></Currency>
<Currency Kod="EUR"><Unit>1</Unit><ForexSelling>${eur}</ForexSelling></Currency>
<Currency Kod="GBP"><Unit>1</Unit><ForexSelling>${gbp}</ForexSelling></Currency>
<Currency Kod="JPY"><Unit>100</Unit><ForexSelling>30</ForexSelling></Currency></Tarih_Date>`;

const body = (text: string) => ({ ok: true, status: 200, text: async () => text });
const gold = JSON.stringify({ GRA: { Selling: 6400, Change: 1.5 }, CEYREKALTIN: { Selling: 10600, Change: 0.5 } });
const bist = JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: 11000, chartPreviousClose: 10000 } }] } });

function service(setting: unknown = null) {
  const prisma: any = { systemSetting: { findUnique: jest.fn(async () => setting) } };
  return new MarketTickerService(prisma);
}

describe('Piyasa ticker (EPH-28)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.EVDS_API_KEY;
    delete process.env.EVDS_KONUT_SERIES;
  });

  it('TCMB XML ayrıştırılır, Unit ile bölünür', () => {
    const { date, rates } = parseTcmb(xml('27.10.2026', '50', '55', '66'));
    expect(date.toISOString()).toBe('2026-10-27T00:00:00.000Z');
    expect(rates).toEqual({ USD: 50, EUR: 55, GBP: 66, JPY: 0.3 });
  });

  it('kalemler, önceki gün kapanışına göre değişim ve manuel kredi faizi', async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url.endsWith('today.xml')) return body(xml('27.10.2026', '51', '55', '66'));
      if (url.includes('26102026')) return body(xml('26.10.2026', '50', '55', '60'));
      if (url.includes('truncgil')) return body(gold);
      if (url.includes('yahoo')) return body(bist);
      throw new Error('beklenmeyen ' + url);
    }) as any;
    const s = service({ valueJson: { value: 2.89 }, updatedAt: new Date('2026-10-20T00:00:00Z') });
    const t = await s.getTicker();
    expect(t.items.map(i => i.code)).toEqual(['USD', 'EUR', 'GBP', 'GRAM_ALTIN', 'CEYREK_ALTIN', 'BIST100']);
    expect(t.items.find(i => i.code === 'USD')).toMatchObject({ value: 51, changePct: 2, source: 'TCMB' });
    expect(t.items.find(i => i.code === 'GBP')?.changePct).toBe(10);
    expect(t.items.find(i => i.code === 'BIST100')).toMatchObject({ value: 11000, changePct: 10 });
    expect(t.loan).toMatchObject({ monthlyRatePct: 2.89, source: 'Yönetici' });
  });

  it('kaynak hata verirse son başarılı değer döner; bulunamayan kalem uydurulmaz; kredi yoksa null', async () => {
    const ok = jest.fn(async (url: string) => {
      if (url.endsWith('today.xml')) return body(xml('27.10.2026', '51', '55', '66'));
      if (url.includes('truncgil')) return body(gold);
      throw new Error('kapalı');
    });
    global.fetch = ok as any;
    const s = service(null);
    const first = await s.getTicker();
    expect(first.items.map(i => i.code)).not.toContain('BIST100');
    expect(first.loan).toBeNull();
    global.fetch = jest.fn(async () => { throw new Error('ağ yok'); }) as any;
    await s.refresh();
    const second = await s.getTicker();
    expect(second.items.find(i => i.code === 'USD')?.value).toBe(51);
    expect(second.updatedAt).toBe(first.updatedAt);
  });

  it('EVDS anahtarı ve seri kodu yoksa çağrılmaz; varsa yıllık oran aya çevrilir', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      calls.push(url);
      if (url.includes('evds')) return body(JSON.stringify({ items: [{ TP_X: '36' }, { TP_X: '36,0' }, { TP_X: '30' }] }));
      throw new Error('kapalı');
    }) as any;
    await service().refresh();
    expect(calls.some(c => c.includes('evds'))).toBe(false);
    process.env.EVDS_API_KEY = 'k';
    process.env.EVDS_KONUT_SERIES = 'TP.X';
    const s = service();
    expect((await s.getTicker()).loan).toMatchObject({ monthlyRatePct: 2.5, source: 'TCMB EVDS' });
  });
});
