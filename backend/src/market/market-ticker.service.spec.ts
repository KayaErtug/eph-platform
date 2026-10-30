import { MarketTickerService, parseTcmb } from './market-ticker.service';

const xml = (date: string, usd: string, eur: string, gbp: string) => `<Tarih_Date Tarih="${date}" Date="x">
<Currency Kod="USD"><Unit>1</Unit><ForexSelling>${usd}</ForexSelling></Currency>
<Currency Kod="EUR"><Unit>1</Unit><ForexSelling>${eur}</ForexSelling></Currency>
<Currency Kod="GBP"><Unit>1</Unit><ForexSelling>${gbp}</ForexSelling></Currency>
<Currency Kod="JPY"><Unit>100</Unit><ForexSelling>30</ForexSelling></Currency></Tarih_Date>`;

const body = (text: string) => ({ ok: true, status: 200, text: async () => text });
const gold = JSON.stringify({ GRA: { Selling: 6400, Change: 1.5 }, CEYREKALTIN: { Selling: 10600, Change: 0.5 }, YARIMALTIN: { Selling: 21200, Change: 0.4 }, TAMALTIN: { Selling: 42400, Change: 0.3 }, ONS: { Selling: 3300.5, Change: -0.2 } });
const bist = JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: 11000, chartPreviousClose: 10000 } }] } });

function service(setting: unknown = null, extra: Record<string, any> = {}) {
  const prisma: any = {
    systemSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key.startsWith('MARKET_TUKETICI_') ? extra.consumer?.[where.key] ?? null : where.key === 'MARKET_KONUT_FAIZ_KAYNAK' ? extra.source ?? null : setting)),
      findMany: jest.fn(async () => extra.manual ?? []),
    },
  };
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
    expect(t.items.map(i => i.code)).toEqual(['USD', 'EUR', 'GBP', 'GRAM_ALTIN', 'CEYREK_ALTIN', 'YARIM_ALTIN', 'TAM_ALTIN', 'ONS_ALTIN', 'BIST100']);
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

  it('elle değer otomatik kaynağı geçersiz kılar; kredi kaynağı metni kullanılır (EPH-28B)', async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url.endsWith('today.xml')) return body(xml('27.10.2026', '51', '55', '66'));
      if (url.includes('truncgil')) return body(gold);
      if (url.includes('yahoo')) return body(bist);
      throw new Error('kapalı');
    }) as any;
    const at = new Date('2026-10-29T08:00:00Z');
    const s = service({ valueJson: { value: 2.74 }, updatedAt: at }, {
      source: { valueJson: { value: 'Akbank İlk Evim' } },
      manual: [{ key: 'MARKET_MANUAL_CEYREK_ALTIN', valueJson: { value: 10425 }, updatedAt: at }],
    });
    const t = await s.getTicker();
    expect(t.items.find(i => i.code === 'CEYREK_ALTIN')).toEqual({ code: 'CEYREK_ALTIN', label: 'Çeyrek Altın', value: 10425, unit: '₺', changePct: null, source: 'Yönetici' });
    expect(t.items.find(i => i.code === 'GRAM_ALTIN')?.source).toBe('Truncgil');
    expect(t.loan).toMatchObject({ monthlyRatePct: 2.74, source: 'Akbank İlk Evim', updatedAt: at.toISOString() });
    const empty = await service({ valueJson: 2.5, updatedAt: at }, { source: { valueJson: { value: '  ' } } }).getTicker();
    expect(empty.loan?.source).toBe('Yönetici');
  });
  describe('EPH-63 altın kalemleri ve tüketici kredisi', () => {
    const at = new Date('2026-10-30T09:00:00Z');
    const mock = () => {
      global.fetch = jest.fn(async (url: string) => {
        if (url.includes('today.xml')) return body(xml('29.10.2026', '50', '55', '66')) as any;
        if (url.includes('truncgil')) return body(gold) as any;
        if (url.includes('yahoo')) return body(bist) as any;
        return { ok: false, status: 404, text: async () => '' } as any;
      }) as any;
    };

    it('yarım/tam/ons altın döner, ons dolar birimli; Truncgil isteği User-Agent taşır', async () => {
      mock();
      const t = await service().getTicker();
      expect(t.items.find(i => i.code === 'YARIM_ALTIN')).toMatchObject({ value: 21200, unit: '₺', source: 'Truncgil' });
      expect(t.items.find(i => i.code === 'TAM_ALTIN')?.value).toBe(42400);
      expect(t.items.find(i => i.code === 'ONS_ALTIN')).toMatchObject({ value: 3300.5, unit: '$', changePct: -0.2 });
      const call = (global.fetch as jest.Mock).mock.calls.find(c => String(c[0]).includes('truncgil'));
      expect(call[1].headers['User-Agent']).toBeTruthy();
    });

    it('MARKET_MANUAL_ONS_ALTIN otomatik değerin yerine geçer', async () => {
      mock();
      const t = await service(null, { manual: [{ key: 'MARKET_MANUAL_ONS_ALTIN', valueJson: { value: 3400 }, updatedAt: at }] }).getTicker();
      expect(t.items.find(i => i.code === 'ONS_ALTIN')).toEqual({ code: 'ONS_ALTIN', label: 'Ons Altın', value: 3400, unit: '$', changePct: null, source: 'Yönetici' });
    });

    it('tüketici ayarı yoksa alanlar dönmez (varsayılan uydurulmaz)', async () => {
      mock();
      expect((await service().getTicker()).loan).toBeNull();
    });

    it('tüketici faizi, kaynak, KKDF ve BSMV mobilin beklediği alan adlarıyla loan içinde döner; 0 vergi geçerlidir', async () => {
      mock();
      const consumer = {
        MARKET_TUKETICI_FAIZ_AYLIK: { valueJson: { value: 3.19 }, updatedAt: at },
        MARKET_TUKETICI_FAIZ_KAYNAK: { valueJson: { value: 'Test Banka' }, updatedAt: at },
        MARKET_TUKETICI_KKDF_PCT: { valueJson: { value: 0 }, updatedAt: at },
        MARKET_TUKETICI_BSMV_PCT: { valueJson: { value: '15' }, updatedAt: at },
      };
      const t = await service(null, { consumer }).getTicker();
      expect(t.loan).toEqual({ monthlyRatePct: null, source: null, updatedAt: null, consumerMonthlyRatePct: 3.19, consumerSource: 'Test Banka', consumerUpdatedAt: at.toISOString(), kkdfPct: 0, bsmvPct: 15 });
    });

    it('geçersiz vergi (negatif, 100 üstü, metin) yok sayılır', async () => {
      mock();
      const consumer = {
        MARKET_TUKETICI_KKDF_PCT: { valueJson: { value: -1 }, updatedAt: at },
        MARKET_TUKETICI_BSMV_PCT: { valueJson: { value: 'abc' }, updatedAt: at },
      };
      expect((await service(null, { consumer }).getTicker()).loan).toBeNull();
    });
  });
});
