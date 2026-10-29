import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export type TickerItem = { code: string; label: string; value: number; unit: string; changePct: number | null; source: string };
type Loan = { monthlyRatePct: number; source: string; updatedAt: string };
type Cached<T> = { data: T; at: string };

export const MARKET_LOAN_SETTING_KEY = 'MARKET_KONUT_FAIZ_AYLIK';
export const MARKET_LOAN_SOURCE_KEY = 'MARKET_KONUT_FAIZ_KAYNAK';
export const MARKET_MANUAL_PREFIX = 'MARKET_MANUAL_';
export const MARKET_CODES = ['USD', 'EUR', 'GBP', 'GRAM_ALTIN', 'CEYREK_ALTIN', 'BIST100'] as const;
const LABELS: Record<string, { label: string; unit: string }> = {
  USD: { label: 'Dolar', unit: '₺' },
  EUR: { label: 'Euro', unit: '₺' },
  GBP: { label: 'Sterlin', unit: '₺' },
  GRAM_ALTIN: { label: 'Gram Altın', unit: '₺' },
  CEYREK_ALTIN: { label: 'Çeyrek Altın', unit: '₺' },
  BIST100: { label: 'BIST 100', unit: 'puan' },
};

// Ayar değeri: düz sayı/metin ya da { value }.
export function settingValue(raw: unknown): unknown {
  return raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw ? (raw as { value: unknown }).value : raw;
}
const positive = (raw: unknown) => {
  const v = settingValue(raw);
  const n = typeof v === 'string' ? (v.trim() === '' ? NaN : Number(v.replace(',', '.'))) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const FETCH_TIMEOUT_MS = 10_000;
const TCMB_BASE = 'https://www.tcmb.gov.tr/kurlar';
const FX = [
  { code: 'USD', label: 'Dolar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'Sterlin' },
];

const round = (n: number, d = 4) => Number(n.toFixed(d));
const pct = (now: number, prev: number) => (prev > 0 ? round(((now - prev) / prev) * 100, 2) : null);

async function getText(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

// TCMB XML: kod → ForexSelling (Unit ile bölünmüş). Tarih dd.MM.yyyy.
export function parseTcmb(xml: string) {
  const date = /Tarih="(\d{2})\.(\d{2})\.(\d{4})"/.exec(xml);
  const rates: Record<string, number> = {};
  for (const block of xml.match(/<Currency [\s\S]*?<\/Currency>/g) || []) {
    const code = /Kod="([A-Z]{3})"/.exec(block)?.[1];
    const unit = Number(/<Unit>(\d+)<\/Unit>/.exec(block)?.[1] || 1);
    const sell = Number(/<ForexSelling>([\d.]+)<\/ForexSelling>/.exec(block)?.[1]);
    if (code && Number.isFinite(sell) && sell > 0) rates[code] = sell / unit;
  }
  if (!date) throw new Error('TCMB tarih okunamadı');
  return { date: new Date(Date.UTC(+date[3], +date[2] - 1, +date[1])), rates };
}

@Injectable()
export class MarketTickerService implements OnModuleInit {
  private readonly log = new Logger(MarketTickerService.name);
  private items = new Map<string, Cached<TickerItem>>();
  private evds: Cached<number> | null = null;
  private refreshing: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.refresh();
  }

  @Cron('0 */15 * * * *')
  refresh(): Promise<void> {
    this.refreshing ??= this.run().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  private keep(item: TickerItem) {
    this.items.set(item.code, { data: item, at: new Date().toISOString() });
  }

  private async run() {
    await Promise.all([this.fx(), this.gold(), this.bist(), this.loanEvds()].map(p => p.catch(e => this.log.warn(String(e?.message || e)))));
  }

  private async fx() {
    const today = parseTcmb(await getText(`${TCMB_BASE}/today.xml`));
    // Önceki iş günü kapanışı: bülten tarihinden geriye en fazla 7 gün, ilk bulunan arşiv dosyası.
    let prev: Record<string, number> | null = null;
    for (let back = 1; back <= 7 && !prev; back++) {
      const d = new Date(today.date.getTime() - back * 86_400_000);
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      try {
        prev = parseTcmb(await getText(`${TCMB_BASE}/${d.getUTCFullYear()}${mm}/${dd}${mm}${d.getUTCFullYear()}.xml`)).rates;
      } catch {
        prev = null;
      }
    }
    for (const { code, label } of FX) {
      const value = today.rates[code];
      if (value) this.keep({ code, label, value: round(value), unit: '₺', changePct: prev?.[code] ? pct(value, prev[code]) : null, source: 'TCMB' });
    }
  }

  // Ücretsiz, anahtarsız: Truncgil Finans (serbest piyasa satış fiyatı, Change = kaynağın günlük değişimi).
  private async gold() {
    const json = JSON.parse(await getText('https://finans.truncgil.com/v4/today.json'));
    for (const [code, key, label] of [['GRAM_ALTIN', 'GRA', 'Gram Altın'], ['CEYREK_ALTIN', 'CEYREKALTIN', 'Çeyrek Altın']] as const) {
      const row = json?.[key];
      const value = Number(row?.Selling);
      if (value > 0) this.keep({ code, label, value: round(value, 2), unit: '₺', changePct: Number.isFinite(Number(row?.Change)) ? Number(row.Change) : null, source: 'Truncgil' });
    }
  }

  // Yahoo Finance chart ucu (resmi olmayan, anahtarsız). changePct = önceki gün kapanışına göre.
  private async bist() {
    const json = JSON.parse(await getText('https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?range=5d&interval=1d', { 'User-Agent': 'Mozilla/5.0' }));
    const meta = json?.chart?.result?.[0]?.meta;
    const value = Number(meta?.regularMarketPrice);
    const prev = Number(meta?.chartPreviousClose);
    if (!(value > 0)) throw new Error('BIST 100 verisi yok');
    this.keep({ code: 'BIST100', label: 'BIST 100', value: round(value, 2), unit: 'puan', changePct: prev > 0 ? pct(value, prev) : null, source: 'Yahoo Finance' });
  }

  // EVDS yalnız anahtar VE seri kodu ayarlıysa çağrılır (seri kodu .env'de EVDS_KONUT_SERIES). Değer yıllık %, aylığa /12 ile çevrilir.
  private async loanEvds() {
    const key = process.env.EVDS_API_KEY?.trim();
    const series = process.env.EVDS_KONUT_SERIES?.trim();
    if (!key || !series) return;
    const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
    const end = new Date();
    const url = `https://evds3.tcmb.gov.tr/service/evds/series=${encodeURIComponent(series)}&startDate=${fmt(new Date(end.getTime() - 60 * 86_400_000))}&endDate=${fmt(end)}&type=json`;
    const items: Record<string, unknown>[] = JSON.parse(await getText(url, { key })).items || [];
    const field = series.replace(/\./g, '_');
    const last = [...items].reverse().map(i => Number(i[field])).find(n => Number.isFinite(n) && n > 0);
    if (!last) throw new Error('EVDS konut faizi verisi yok');
    this.evds = { data: round(last / 12, 2), at: new Date().toISOString() };
  }

  private async loan(): Promise<Loan | null> {
    const [row, src] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: MARKET_LOAN_SETTING_KEY }, select: { valueJson: true, updatedAt: true } }),
      this.prisma.systemSetting.findUnique({ where: { key: MARKET_LOAN_SOURCE_KEY }, select: { valueJson: true } }),
    ]);
    const manual = row ? positive(row.valueJson) : null;
    if (row && manual !== null) {
      const text = settingValue(src?.valueJson);
      const source = typeof text === 'string' && text.trim() ? text.trim() : 'Yönetici';
      return { monthlyRatePct: manual, source, updatedAt: row.updatedAt.toISOString() };
    }
    return this.evds ? { monthlyRatePct: this.evds.data, source: 'TCMB EVDS', updatedAt: this.evds.at } : null;
  }

  // MARKET_MANUAL_<KOD> varsa otomatik kaynağın yerine geçer.
  private async manualItems() {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: MARKET_CODES.map(c => MARKET_MANUAL_PREFIX + c) } },
      select: { key: true, valueJson: true, updatedAt: true },
    });
    const out = new Map<string, { item: TickerItem; at: string }>();
    for (const r of rows) {
      const code = r.key.slice(MARKET_MANUAL_PREFIX.length);
      const value = positive(r.valueJson);
      if (value === null || !LABELS[code]) continue;
      out.set(code, { item: { code, ...LABELS[code], value, changePct: null, source: 'Yönetici' }, at: r.updatedAt.toISOString() });
    }
    return out;
  }

  async getTicker() {
    if (!this.items.size) await this.refresh();
    const manual = await this.manualItems();
    const cached = [...this.items.values()];
    const items = MARKET_CODES.map(code => manual.get(code)?.item ?? this.items.get(code)?.data).filter((i): i is TickerItem => Boolean(i));
    const loan = await this.loan();
    const times = [...cached.map(c => c.at), ...[...manual.values()].map(m => m.at), ...(loan ? [loan.updatedAt] : [])].sort();
    return { updatedAt: times.length ? times[times.length - 1] : null, items, loan };
  }
}
