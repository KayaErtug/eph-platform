/**
 * EPH-70B2 — Ofis hak kuralları (SAF fonksiyonlar; DB yok). Kaynak: EPH_ODEME_SISTEMI.md §12 (KİLİTLİ), plan v2 (EPH-70A2).
 *
 * §0-B: Bu dosyada TİCARİ DEĞER YOKTUR. Fiyat, kullanıcı sayısı, PK, portföy, kademe, gün, limit hep SystemSetting'ten
 * (OFFICE_MEMBERSHIP_PACKAGES / OFFICE_ADDON_CONFIG / OFFICE_TRIAL_CONFIG / OFFICE_FREE_LIMITS) gelir. Ayar eksik/geçersizse
 * EntitlementConfigError fırlatılır; sessiz varsayılan YOKTUR (fail-closed: hak verilmez).
 * Anlam: limit `0` = kapalı, `null` = sınırsız (eski `<=0 → sınırsız` davranışı yeni yolda kullanılmaz).
 */

export class EntitlementConfigError extends Error {
  constructor(readonly setting: string, detail: string) {
    super(`${setting}: ${detail}`);
    this.name = 'EntitlementConfigError';
  }
}

export type Limit = number | null; // null = sınırsız

export interface OfficePackageRow {
  code: string; name: string; price: number | null; custom: boolean; active: boolean;
  totalUsers: number; portfolio: number; monthlyPk: number; crm: Limit;
  kardesOfis: boolean; ofisBoyDahil: number; ofisBoyEklenti: boolean;
  /** Ayardaki takım sınırı (F13); alan yoksa null — kodda yedek tablo YOKTUR (§0-B). */ maxTeams: number | null;
}
export interface AddonConfig {
  ekKullanici: { aylikFiyat: number; kisiBasiPortfoy: number; kisiBasiPk: number; enAzPaket: string; kademeler: number[] };
  ofisBoy: { aylikFiyat: number; koltukPerUrun: number; izinliPaketler: string[]; ofisBoyOzelUst: number | null };
}
export interface TrialConfig { gun: number; seviyePaketi: string; pk: number; kartIstenir: boolean; hatirlatmaGunleri: number[]; kardesOfis: boolean; ofisBoy: boolean }
export interface FreeLimits {
  kullanici: number; aktifPortfoy: number; crm: Limit; aylikPaketPk: number; havuzIlanMax: Limit; talepMax: Limit;
  linaGunluk: Limit; projeYonetimi: boolean; pasifGun: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nonNegInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const posInt = (v: unknown): v is number => nonNegInt(v) && v > 0;

function reqInt(setting: string, obj: Record<string, unknown>, key: string, positive = false): number {
  const v = obj[key];
  if (!(positive ? posInt(v) : nonNegInt(v))) throw new EntitlementConfigError(setting, `"${key}" ${positive ? 'pozitif' : 'negatif olmayan'} tam sayı olmalı.`);
  return v as number;
}
function limitOf(setting: string, obj: Record<string, unknown>, key: string): Limit {
  const v = obj[key];
  if (v === null) return null;
  if (!nonNegInt(v)) throw new EntitlementConfigError(setting, `"${key}" negatif olmayan tam sayı veya null (sınırsız) olmalı.`);
  return v;
}

/** OFFICE_MEMBERSHIP_PACKAGES: eski okuyucularla uyumlu dizi. crmCapacity eski verideki -1 / yok = sınırsız. */
export function parsePackageCatalog(raw: unknown): Map<string, OfficePackageRow> {
  const S = 'OFFICE_MEMBERSHIP_PACKAGES';
  if (!Array.isArray(raw)) throw new EntitlementConfigError(S, 'dizi olmalı.');
  const map = new Map<string, OfficePackageRow>();
  for (const item of raw) {
    if (!isObj(item) || typeof item.code !== 'string' || !item.code.trim()) throw new EntitlementConfigError(S, 'her satırda "code" olmalı.');
    const code = item.code.trim().toUpperCase();
    const custom = item.isCustomPrice === true;
    if (custom) { // Özel teklif: otomatik hak taşımaz; yalnız kod bilinsin
      map.set(code, { code, name: String(item.name ?? code), price: null, custom: true, active: item.active !== false, totalUsers: 0, portfolio: 0, monthlyPk: 0, crm: 0, kardesOfis: item.kardesOfis === true, ofisBoyDahil: 0, ofisBoyEklenti: false, maxTeams: null });
      continue;
    }
    const price = item.price;
    if (!nonNegInt(price) && !(typeof price === 'number' && Number.isFinite(price) && price >= 0)) throw new EntitlementConfigError(S, `${code}: "price" geçersiz.`);
    const crmRaw = item.crmCapacity;
    const crm: Limit = crmRaw === undefined || crmRaw === null || crmRaw === -1 ? null : nonNegInt(crmRaw) ? crmRaw : (() => { throw new EntitlementConfigError(S, `${code}: "crmCapacity" geçersiz.`); })();
    const row: OfficePackageRow = {
      code, name: String(item.name ?? code), price: price as number, custom: false, active: item.active !== false,
      totalUsers: reqInt(S, item, 'totalUsers', true), portfolio: reqInt(S, item, 'portfolioCapacity'), monthlyPk: reqInt(S, item, 'monthlyPk'), crm,
      kardesOfis: item.kardesOfis === true, ofisBoyDahil: item.ofisBoyDahil === undefined ? 0 : reqInt(S, item, 'ofisBoyDahil'), ofisBoyEklenti: item.ofisBoyEklenti === true,
      maxTeams: nonNegInt(item.maxTeams) ? item.maxTeams : null,
    };
    map.set(code, row);
  }
  return map;
}

export function parseAddonConfig(raw: unknown): AddonConfig {
  const S = 'OFFICE_ADDON_CONFIG';
  if (!isObj(raw) || !isObj(raw.ekKullanici) || !isObj(raw.ofisBoy)) throw new EntitlementConfigError(S, 'ekKullanici ve ofisBoy nesneleri zorunlu.');
  const e = raw.ekKullanici; const o = raw.ofisBoy;
  const kademeler = e.kademeler;
  if (!Array.isArray(kademeler) || kademeler.length === 0 || !kademeler.every(posInt)) throw new EntitlementConfigError(S, '"kademeler" pozitif tam sayı dizisi olmalı.');
  if (typeof e.enAzPaket !== 'string' || !e.enAzPaket.trim()) throw new EntitlementConfigError(S, '"enAzPaket" zorunlu.');
  if (!Array.isArray(o.izinliPaketler) || !o.izinliPaketler.every((c) => typeof c === 'string')) throw new EntitlementConfigError(S, '"izinliPaketler" metin dizisi olmalı.');
  const ozelUst = o.ofisBoyOzelUst;
  if (ozelUst !== null && ozelUst !== undefined && !posInt(ozelUst)) throw new EntitlementConfigError(S, '"ofisBoyOzelUst" pozitif tam sayı veya null olmalı.');
  return {
    ekKullanici: { aylikFiyat: reqInt(S, e, 'aylikFiyat', true), kisiBasiPortfoy: reqInt(S, e, 'kisiBasiPortfoy'), kisiBasiPk: reqInt(S, e, 'kisiBasiPk'), enAzPaket: e.enAzPaket.trim().toUpperCase(), kademeler: [...(kademeler as number[])].sort((a, b) => a - b) },
    ofisBoy: { aylikFiyat: reqInt(S, o, 'aylikFiyat', true), koltukPerUrun: reqInt(S, o, 'koltukPerUrun', true), izinliPaketler: (o.izinliPaketler as string[]).map((c) => c.trim().toUpperCase()), ofisBoyOzelUst: (ozelUst as number | null | undefined) ?? null },
  };
}

export function parseTrialConfig(raw: unknown): TrialConfig {
  const S = 'OFFICE_TRIAL_CONFIG';
  if (!isObj(raw)) throw new EntitlementConfigError(S, 'nesne olmalı.');
  if (typeof raw.seviyePaketi !== 'string' || !raw.seviyePaketi.trim()) throw new EntitlementConfigError(S, '"seviyePaketi" zorunlu.');
  if (typeof raw.kartIstenir !== 'boolean' || typeof raw.kardesOfis !== 'boolean' || typeof raw.ofisBoy !== 'boolean') throw new EntitlementConfigError(S, 'kartIstenir/kardesOfis/ofisBoy boolean olmalı.');
  if (!Array.isArray(raw.hatirlatmaGunleri) || !raw.hatirlatmaGunleri.every(posInt)) throw new EntitlementConfigError(S, '"hatirlatmaGunleri" pozitif tam sayı dizisi olmalı.');
  return { gun: reqInt(S, raw, 'gun', true), seviyePaketi: raw.seviyePaketi.trim().toUpperCase(), pk: reqInt(S, raw, 'pk'), kartIstenir: raw.kartIstenir, hatirlatmaGunleri: raw.hatirlatmaGunleri as number[], kardesOfis: raw.kardesOfis, ofisBoy: raw.ofisBoy };
}

export function parseFreeLimits(raw: unknown): FreeLimits {
  const S = 'OFFICE_FREE_LIMITS';
  if (!isObj(raw)) throw new EntitlementConfigError(S, 'nesne olmalı.');
  if (typeof raw.projeYonetimi !== 'boolean') throw new EntitlementConfigError(S, '"projeYonetimi" boolean olmalı.');
  return {
    kullanici: reqInt(S, raw, 'kullanici', true), aktifPortfoy: reqInt(S, raw, 'aktifPortfoy'), crm: limitOf(S, raw, 'crm'), aylikPaketPk: reqInt(S, raw, 'aylikPaketPk'),
    havuzIlanMax: limitOf(S, raw, 'havuzIlanMax'), talepMax: limitOf(S, raw, 'talepMax'), linaGunluk: limitOf(S, raw, 'linaGunluk'), projeYonetimi: raw.projeYonetimi, pasifGun: reqInt(S, raw, 'pasifGun', true),
  };
}

// ───────────────────────── Etkin hak hesabı ─────────────────────────

export type EntitlementState = 'UCRETLI' | 'DENEME' | 'UCRETSIZ';
export interface SubscriptionInput {
  paketKodu: string; durum: string; sureTuru: string; baslangicTarihi: Date; bitisTarihi: Date | null;
  hakSnapshot: unknown; snapshotBitis: Date | null; kaynakKanal: string | null;
}
export interface AddonInput { tur: 'EK_KULLANICI' | 'OFIS_BOY'; adet: number; durum: string; bitisTarihi: Date }
export interface TrialInput { baslangicTarihi: Date; bitisTarihi: Date; sonlandiTarihi: Date | null }

export interface OfficeEntitlements {
  officeId: string; state: EntitlementState; packageCode: string | null; packageName: string; endsAt: Date | null; channel: string | null;
  /** Ofis Boy HARİÇ kullanıcı sayısı (karar 18d). */ users: number;
  /** Danışman kontenjanı (sahip hariç) = users - 1. */ agents: number;
  ofisBoy: number; portfolio: number; crm: Limit; monthlyPk: number; kardesOfis: boolean;
  havuzIlanMax: Limit; talepMax: Limit; linaGunluk: Limit; projeYonetimi: boolean; pasifGun: number | null;
  ekKullaniciAdet: number; ofisBoyAddonAktif: boolean; snapshotApplied: boolean;
}

export interface ComputeInput {
  officeId: string; at: Date; catalog: Map<string, OfficePackageRow>; addon: AddonConfig; trial: TrialConfig; free: FreeLimits;
  subscription: SubscriptionInput | null; addons: AddonInput[]; trialRecord: TrialInput | null;
}

/** Abonelik şu an hak veriyor mu? Bozuk/NULL bitiş = hak YOK (F15), yalnız açık SURESIZ_OZEL süresiz sayılır. */
export function subscriptionLive(sub: Pick<SubscriptionInput, 'durum' | 'sureTuru' | 'bitisTarihi' | 'baslangicTarihi'>, at: Date): boolean {
  if (sub.durum !== 'AKTIF' && sub.durum !== 'GRACE') return false;
  if (sub.baslangicTarihi.getTime() > at.getTime()) return false;
  if (sub.sureTuru === 'SURESIZ_OZEL') return true;
  const end = sub.bitisTarihi;
  return !!end && Number.isFinite(end.getTime()) && end.getTime() > at.getTime();
}
export function addonLive(a: Pick<AddonInput, 'durum' | 'bitisTarihi'>, at: Date): boolean {
  return (a.durum === 'AKTIF' || a.durum === 'GRACE') && Number.isFinite(a.bitisTarihi.getTime()) && a.bitisTarihi.getTime() > at.getTime();
}

const maxLimit = (a: Limit, b: Limit): Limit => (a === null || b === null ? null : Math.max(a, b));

export function freeEntitlements(officeId: string, free: FreeLimits): OfficeEntitlements {
  return { officeId, state: 'UCRETSIZ', packageCode: null, packageName: 'Ücretsiz', endsAt: null, channel: null, users: free.kullanici, agents: Math.max(0, free.kullanici - 1), ofisBoy: 0,
    portfolio: free.aktifPortfoy, crm: free.crm, monthlyPk: free.aylikPaketPk, kardesOfis: false, havuzIlanMax: free.havuzIlanMax, talepMax: free.talepMax, linaGunluk: free.linaGunluk,
    projeYonetimi: free.projeYonetimi, pasifGun: free.pasifGun, ekKullaniciAdet: 0, ofisBoyAddonAktif: false, snapshotApplied: false };
}

/** Paket sırası: kullanıcı sayısı (DB'den) — "Bronz ve üstü" karşılaştırması için. */
export const packageRank = (catalog: Map<string, OfficePackageRow>, code: string): number => catalog.get(code.toUpperCase())?.totalUsers ?? -1;

export function computeEntitlements(i: ComputeInput): OfficeEntitlements {
  const { subscription: sub, at } = i;
  if (sub && subscriptionLive(sub, at)) {
    const code = sub.paketKodu.toUpperCase();
    const row = i.catalog.get(code);
    const snap = sub.hakSnapshot && typeof sub.hakSnapshot === 'object' ? (sub.hakSnapshot as Record<string, unknown>) : null;
    const snapLive = !!snap && !!sub.snapshotBitis && sub.snapshotBitis.getTime() > at.getTime();
    if (row && !row.custom) {
      let users = row.totalUsers; let portfolio = row.portfolio; let crm = row.crm; let monthlyPk = row.monthlyPk; let ofisBoy = row.ofisBoyDahil;
      let snapshotApplied = false;
      if (snapLive && snap) { // 18a: dönem içinde max(eski snapshot, yeni katalog)
        const n = (k: string) => (typeof snap[k] === 'number' ? (snap[k] as number) : null);
        const su = n('users'); const sp = n('portfolio'); const spk = n('monthlyPk'); const sb = n('ofisBoy');
        if (su !== null && su > users) { users = su; snapshotApplied = true; }
        if (sp !== null && sp > portfolio) { portfolio = sp; snapshotApplied = true; }
        if (spk !== null && spk > monthlyPk) { monthlyPk = spk; snapshotApplied = true; }
        if (sb !== null && sb > ofisBoy) { ofisBoy = sb; snapshotApplied = true; }
        if ('crm' in snap) { const sc = snap.crm === null ? null : typeof snap.crm === 'number' ? (snap.crm as number) : crm; const m = maxLimit(crm, sc); if (m !== crm) { crm = m; snapshotApplied = true; } }
      }
      // Ek kullanıcı: yalnız temel paket Bronz+ (DB'den enAzPaket) ve eklenti canlıyken
      let ek = 0; let ofisBoyAddon = false;
      const minRank = packageRank(i.catalog, i.addon.ekKullanici.enAzPaket);
      for (const a of i.addons) {
        if (!addonLive(a, at)) continue;
        if (a.tur === 'EK_KULLANICI' && minRank >= 0 && row.totalUsers >= minRank && i.addon.ekKullanici.kademeler.includes(a.adet)) ek += a.adet;
        if (a.tur === 'OFIS_BOY' && i.addon.ofisBoy.izinliPaketler.includes(code) && row.ofisBoyEklenti) ofisBoyAddon = true;
      }
      users += ek; portfolio += ek * i.addon.ekKullanici.kisiBasiPortfoy; monthlyPk += ek * i.addon.ekKullanici.kisiBasiPk;
      if (ofisBoyAddon) ofisBoy += i.addon.ofisBoy.koltukPerUrun;
      return { officeId: i.officeId, state: 'UCRETLI', packageCode: code, packageName: row.name, endsAt: sub.sureTuru === 'SURESIZ_OZEL' ? null : sub.bitisTarihi, channel: sub.kaynakKanal,
        users, agents: Math.max(0, users - 1), ofisBoy, portfolio, crm, monthlyPk, kardesOfis: row.kardesOfis, havuzIlanMax: null, talepMax: null, linaGunluk: null, projeYonetimi: true, pasifGun: null,
        ekKullaniciAdet: ek, ofisBoyAddonAktif: ofisBoyAddon, snapshotApplied };
    }
    // Katalogda satır yok (silinmiş/özel): yalnız canlı snapshot varsa onunla; yoksa fail-closed → aşağıda Ücretsiz'e düşer
    if (snapLive && snap && typeof snap.users === 'number' && typeof snap.portfolio === 'number') {
      return { officeId: i.officeId, state: 'UCRETLI', packageCode: code, packageName: String(snap.name ?? code), endsAt: sub.bitisTarihi, channel: sub.kaynakKanal,
        users: snap.users as number, agents: Math.max(0, (snap.users as number) - 1), ofisBoy: typeof snap.ofisBoy === 'number' ? (i.addon.ofisBoy.ofisBoyOzelUst !== null ? Math.min(snap.ofisBoy as number, i.addon.ofisBoy.ofisBoyOzelUst) : (snap.ofisBoy as number)) : 0, portfolio: snap.portfolio as number,
        crm: snap.crm === null ? null : typeof snap.crm === 'number' ? (snap.crm as number) : 0, monthlyPk: typeof snap.monthlyPk === 'number' ? (snap.monthlyPk as number) : 0,
        kardesOfis: row?.kardesOfis === true, // F14: Özel sözleşme satırındaki Kardeş Ofis hakkı koşulsuz kapatılmaz
        havuzIlanMax: null, talepMax: null, linaGunluk: null, projeYonetimi: true, pasifGun: null, ekKullaniciAdet: 0, ofisBoyAddonAktif: false, snapshotApplied: true };
    }
  }
  const t = i.trialRecord;
  if (t && !t.sonlandiTarihi && t.baslangicTarihi.getTime() <= at.getTime() && Number.isFinite(t.bitisTarihi.getTime()) && t.bitisTarihi.getTime() > at.getTime()) {
    const level = i.catalog.get(i.trial.seviyePaketi);
    if (!level) throw new EntitlementConfigError('OFFICE_TRIAL_CONFIG', `seviyePaketi "${i.trial.seviyePaketi}" katalogda yok.`);
    return { officeId: i.officeId, state: 'DENEME', packageCode: 'DENEME', packageName: 'Ofis Deneme', endsAt: t.bitisTarihi, channel: 'DENEME', users: level.totalUsers, agents: Math.max(0, level.totalUsers - 1),
      ofisBoy: i.trial.ofisBoy ? level.ofisBoyDahil : 0, portfolio: level.portfolio, crm: level.crm, monthlyPk: i.trial.pk, kardesOfis: i.trial.kardesOfis && level.kardesOfis,
      havuzIlanMax: null, talepMax: null, linaGunluk: null, projeYonetimi: true, pasifGun: null, ekKullaniciAdet: 0, ofisBoyAddonAktif: false, snapshotApplied: false };
  }
  return freeEntitlements(i.officeId, i.free);
}

// ───────────────────────── Satın alma uygunluğu (F10/F11) ─────────────────────────

export type PurchaseKind = 'PAKET' | 'EK_KULLANICI' | 'OFIS_BOY';
export type EligibilityCode =
  | 'OK' | 'OFFICE_NOT_FOUND' | 'OFFICE_AGENT_PURCHASE_FORBIDDEN' | 'PACKAGE_NOT_PURCHASABLE' | 'MEMBERSHIP_ACTIVE_OTHER_CHANNEL' | 'CHANNEL_UNKNOWN_REVIEW'
  | 'ADDON_REQUIRES_OFFICE_PACKAGE' | 'ADDON_TIER_INVALID' | 'ADDON_TIER_ALREADY_ACTIVE' | 'ADDON_NOT_ALLOWED_FOR_PACKAGE' | 'ADDON_INCLUDED_IN_PACKAGE' | 'AMOUNT_INVALID';

export interface EligibilityInput {
  office: { isActive: boolean; ownerUserId: string | null } | null; actorUserId: string; kind: PurchaseKind; packageCode?: string; adet?: number;
  channel: string; sourceKey: string | null; amount: number;
  catalog: Map<string, OfficePackageRow>; addon: AddonConfig;
  currentSub: Pick<SubscriptionInput, 'paketKodu' | 'durum' | 'sureTuru' | 'baslangicTarihi' | 'bitisTarihi' | 'kaynakKanal'> & { kaynakAbonelikAnahtari: string | null } | null;
  currentAddons: Array<AddonInput & { kaynakKanal: string; kaynakAbonelikAnahtari: string }>; at: Date;
  /** F01/F06: ilişkisel modelde canlı satır yokken eski (OFFICE_SUBSCRIPTION_* / KullaniciUyelikPaketi) kanalda aktif ücretli hak var. */ legacyPaidActive?: boolean;
}
export type EligibilityResult = { ok: true } | { ok: false; code: EligibilityCode; message: string };

const NON_STORE_CHANNELS = ['ADMIN', 'DENEME'];

export function checkPurchaseEligibility(i: EligibilityInput): EligibilityResult {
  const no = (code: EligibilityCode, message: string): EligibilityResult => ({ ok: false, code, message });
  if (!i.office || !i.office.isActive) return no('OFFICE_NOT_FOUND', 'Aktif ofis bulunamadı.');
  if (!i.office.ownerUserId || i.office.ownerUserId !== i.actorUserId) return no('OFFICE_AGENT_PURCHASE_FORBIDDEN', 'Ofis paketini yalnız ofis sahibi satın alabilir.');
  if (!Number.isFinite(i.amount) || i.amount <= 0) return no('AMOUNT_INVALID', 'Tutarı 0 olan işlem hak vermez.');
  const liveSub = i.currentSub && subscriptionLive(i.currentSub, i.at) && !NON_STORE_CHANNELS.includes(String(i.currentSub.kaynakKanal)) ? i.currentSub : null;
  const liveAny = i.currentSub && subscriptionLive(i.currentSub, i.at) ? i.currentSub : null;
  const sameSource = (key: string | null | undefined) => !!i.sourceKey && !!key && key === i.sourceKey;

  if (i.kind === 'PAKET') {
    const row = i.catalog.get(String(i.packageCode ?? '').toUpperCase());
    if (!row || !row.active || row.custom || row.price === null || row.price <= 0) return no('PACKAGE_NOT_PURCHASABLE', 'Bu paket satın alınamaz.');
    if (['UCRETSIZ', 'DENEME'].includes(row.code)) return no('PACKAGE_NOT_PURCHASABLE', 'Ücretsiz ve deneme paketi satın alınamaz.');
    if (!liveAny && i.legacyPaidActive) return no('CHANNEL_UNKNOWN_REVIEW', 'Ofisin eski kanalda aktif ücretli hakkı var; geçiş tamamlanmadan yeni paket yazılmaz (destek incelemesi).');
    if (liveSub) {
      if (!liveSub.kaynakKanal) return no('CHANNEL_UNKNOWN_REVIEW', 'Mevcut üyeliğin kaynağı belirsiz; destek incelemesi gerekir.');
      if (liveSub.kaynakKanal !== i.channel) return no('MEMBERSHIP_ACTIVE_OTHER_CHANNEL', 'Üyeliğiniz başka bir kanaldan aktif.');
      if (!sameSource(liveSub.kaynakAbonelikAnahtari)) return no('MEMBERSHIP_ACTIVE_OTHER_CHANNEL', 'Bu ofisin aktif üyeliği başka bir abonelik zincirinde.');
    }
    return { ok: true };
  }

  // Eklentiler: temel paket aynı ofiste canlı olmalı
  if (!liveAny) return no('ADDON_REQUIRES_OFFICE_PACKAGE', 'Eklenti için aktif ofis paketi gerekir.');
  const base = i.catalog.get(liveAny.paketKodu.toUpperCase());
  if (!base || base.custom) return no('ADDON_REQUIRES_OFFICE_PACKAGE', 'Eklenti için uygun ofis paketi gerekir.');
  const sameTur = i.currentAddons.filter((a) => a.tur === i.kind && addonLive(a, i.at));
  if (i.kind === 'EK_KULLANICI') {
    const minRank = packageRank(i.catalog, i.addon.ekKullanici.enAzPaket);
    if (minRank < 0 || base.totalUsers < minRank) return no('ADDON_REQUIRES_OFFICE_PACKAGE', 'Ek kullanıcı için en az Bronz paket gerekir.');
    if (!i.addon.ekKullanici.kademeler.includes(Number(i.adet))) return no('ADDON_TIER_INVALID', 'Geçersiz ek kullanıcı kademesi.');
  } else {
    if (base.ofisBoyDahil > 0 && !base.ofisBoyEklenti) return no('ADDON_INCLUDED_IN_PACKAGE', 'Bu pakette Ofis Boy zaten dahildir.');
    if (!i.addon.ofisBoy.izinliPaketler.includes(base.code) || !base.ofisBoyEklenti) return no('ADDON_NOT_ALLOWED_FOR_PACKAGE', 'Bu pakette Ofis Boy eklentisi alınamaz.');
  }
  // Tek etkin kademe/ürün (F08, karar 15): aynı abonelik zincirinde değişim YERİNE koyar; farklı zincir reddedilir
  for (const a of sameTur) {
    if (a.kaynakKanal !== i.channel || a.kaynakAbonelikAnahtari !== i.sourceKey) return no('ADDON_TIER_ALREADY_ACTIVE', 'Bu eklenti için aktif bir abonelik zaten var.');
  }
  return { ok: true };
}

/**
 * Üst paket daha ucuz mu? (F3 uyarısı; fiyatlar DB'den). Eklentili toplam aylık maliyet için, en az aynı kullanıcı/portföy/PK'yı veren ve toplamdan
 * ucuz/eşit olan paketlerin EN UCUZUNU döndürür (yalnız bir üst basamak değil — F15).
 */
export function cheaperUpperPackage(catalog: Map<string, OfficePackageRow>, addon: AddonConfig, baseCode: string, ekKullanici: number): OfficePackageRow | null {
  const base = catalog.get(baseCode.toUpperCase());
  if (!base || base.price === null || ekKullanici <= 0) return null;
  const cost = base.price + ekKullanici * addon.ekKullanici.aylikFiyat;
  const users = base.totalUsers + ekKullanici;
  const portfolio = base.portfolio + ekKullanici * addon.ekKullanici.kisiBasiPortfoy;
  const monthlyPk = base.monthlyPk + ekKullanici * addon.ekKullanici.kisiBasiPk;
  const candidates = [...catalog.values()]
    .filter((p) => !p.custom && p.active && p.price !== null && p.price > 0 && p.totalUsers > base.totalUsers && p.totalUsers >= users && p.portfolio >= portfolio && p.monthlyPk >= monthlyPk && cost >= (p.price as number))
    .sort((a, b) => (a.price as number) - (b.price as number) || b.totalUsers - a.totalUsers);
  return candidates[0] ?? null;
}
