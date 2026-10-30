import { CRM_ROL_ESLEME, CrmTaslakAlanlari, HamCikarim } from "./lina-draft.types";
import { fuzzyEqual, LinaLocationValidation } from "./lina-location-validator.service";

const trNorm = (value: string): string =>
  String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();

// ---- Deterministik kısa komutlar (onay/iptal yalnız bunlarla; LLM kayıt tetikleyemez) ----
const CONFIRM_WORDS = /^(?:onayla|onayliyorum|kaydet|evet kaydet|evet onayla|tamam onayla|onay)[\s.!]*$/;
const CANCEL_WORDS = /^(?:iptal|iptal et|vazgectim|vazgec|taslagi iptal et)[\s.!]*$/;

// "İptal"/"Onayla" gibi Türkçe büyük harfli yazımlar için tr-TR küçültme + diyakritik temizliği.
const commandForm = (text: string): string => trNorm(String(text || ""));

export const isConfirmWord = (text: string): boolean => CONFIRM_WORDS.test(commandForm(text));
export const isCancelWord = (text: string): boolean => CANCEL_WORDS.test(commandForm(text));

// Taslak yokken bile CRM kaydı başlatmış olabilecek mesajları LLM'e göndermek için ucuz ön eleme (çıkarım değil).
const CRM_HINT = /(crm|musteri|müşteri|alici|alıcı|satici|satıcı|kiraci|kiracı|kiraya ver|talep|arıyor|ariyor|aramakta|almak isti|satmak isti|kaydet|kayit|kayıt|ekle|olustur|oluştur|tlf|telefon)/i;
export const mightBeCrmMessage = (text: string): boolean => CRM_HINT.test(String(text || ""));

// ---- Ad soyad doğrulama ----
const NAME_STOP = new Set([
  "satilik", "kiralik", "datilik", "daire", "villa", "arsa", "ev", "arayan", "ariyor", "arıyor", "aramakta", "musteri",
  "kaydi", "kayit", "crm", "ekle", "olustur", "bir", "ve", "icin", "yeni", "alici", "satici", "kiraci", "talep", "tlf", "telefon",
]);

export const validName = (value: string | null): string | null => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || /[\d[\]@]/.test(text)) return null;
  const words = text.split(" ");
  if (words.length > 4) return null;
  if (!words.every((w) => /^[\p{L}'’-]{2,}$/u.test(w))) return null;
  if (words.some((w) => NAME_STOP.has(trNorm(w)))) return null;
  return words.map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1)).join(" ");
};

export const validPhone = (value: string | null): string | null => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(?:90|0)?5\d{9}$/.test(digits) ? String(value).trim() : null;
};

export const validEmail = (value: string | null): string | null =>
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(String(value || "").trim()) ? String(value).trim() : null;

const ODA_LISTESI = ["1+0", "1+1", "2+1", "3+1", "4+1", "5+1", "5+2", "6+1", "6+2", "7+1"];

// "en az 4+1" -> 4+1 ve üzeri standart oda tipleri; kesin değerde tek oda tipi.
export const expandRooms = (oda: string | null, enAz: boolean): string[] => {
  if (!oda) return [];
  if (!enAz) return [oda];
  const index = ODA_LISTESI.indexOf(oda);
  return index >= 0 ? ODA_LISTESI.slice(index) : [oda];
};

export const normalizeRoom = (value: string | null): string | null => {
  const compact = String(value || "").replace(/\s+/g, "");
  return /^\d+\+\d+$/.test(compact) ? compact : null;
};

// ---- Birleştirme: yeni dolu değer eskinin üstüne yazar, null eskiyi silmez ----
export type MergeContext = {
  telefon: string | null; // jetondan çözülmüş gerçek değer
  email: string | null;
  konum: LinaLocationValidation | null; // yalnız bu turda konum bilgisi geldiyse
};

export const mergeDraft = (current: CrmTaslakAlanlari, ham: HamCikarim, ctx: MergeContext): CrmTaslakAlanlari => {
  const next: CrmTaslakAlanlari = { ...current, mahalleler: [...current.mahalleler], ozellikler: [...current.ozellikler] };

  const name = validName(ham.adSoyad);
  if (name) next.adSoyad = name;
  if (ctx.telefon) next.telefon = ctx.telefon;
  if (ctx.email) next.email = ctx.email;
  if (ham.rol) next.rol = ham.rol;
  if (ham.mulkTipi) next.mulkTipi = ham.mulkTipi;

  if (ctx.konum) {
    const ilDegisti = ctx.konum.il && current.il && !fuzzyEqual(ctx.konum.il, current.il);
    if (ilDegisti) {
      next.ilce = null;
      next.mahalleler = [];
    }
    if (ctx.konum.il) next.il = ctx.konum.il;
    if (ctx.konum.ilce) next.ilce = ctx.konum.ilce;
    const base = ham.mahalleDegistir || ilDegisti ? [] : next.mahalleler;
    next.mahalleler = [...new Set([...base, ...ctx.konum.mahalleler])];
  }

  const min = ham.butceMin ?? next.butceMin;
  const max = ham.butceMax ?? next.butceMax;
  if (min !== null && max !== null && min > max) {
    // Çelişki: yalnız bu turda gelen sınır geçerli sayılır.
    if (ham.butceMax !== null) { next.butceMax = max; next.butceMin = null; }
    else { next.butceMin = min; next.butceMax = null; }
  } else {
    next.butceMin = min;
    next.butceMax = max;
  }
  const aMin = ham.m2Min ?? next.m2Min;
  const aMax = ham.m2Max ?? next.m2Max;
  if (aMin !== null && aMax !== null && aMin > aMax) {
    if (ham.m2Max !== null) { next.m2Max = aMax; next.m2Min = null; }
    else { next.m2Min = aMin; next.m2Max = null; }
  } else {
    next.m2Min = aMin;
    next.m2Max = aMax;
  }

  const oda = normalizeRoom(ham.odaSayisi);
  if (oda) {
    next.odaSayisi = oda;
    next.odaEnAz = ham.odaEnAz === true;
  } else if (ham.odaEnAz !== null && next.odaSayisi) {
    next.odaEnAz = ham.odaEnAz;
  }

  const remove = new Set(ham.ozellikCikar.map(trNorm));
  next.ozellikler = [...new Set([...next.ozellikler, ...ham.ozellikler])].filter((f) => !remove.has(trNorm(f)));

  if (ham.not && !String(next.not || "").includes(ham.not)) {
    next.not = next.not ? `${next.not}; ${ham.not}` : ham.not;
  }
  return next;
};

// ---- Zorunlu alan kapısı ----
export const hasTalepOrContact = (a: CrmTaslakAlanlari): boolean =>
  Boolean(
    a.telefon || a.email || a.il || a.ilce || a.mahalleler.length || a.mulkTipi ||
      a.butceMin !== null || a.butceMax !== null || a.m2Min !== null || a.m2Max !== null ||
      a.odaSayisi || a.ozellikler.length,
  );

export const missingRequired = (a: CrmTaslakAlanlari): string[] => {
  const missing: string[] = [];
  const words = String(a.adSoyad || "").split(" ").filter(Boolean);
  if (words.length === 0) missing.push("müşterinin adı ve soyadı");
  else if (words.length < 2) missing.push("müşterinin soyadı");
  if (!a.rol) missing.push("rolü (alıcı, satıcı, kiracı veya kiraya veren)");
  if (!hasTalepOrContact(a)) missing.push("talep bilgisi (konum, bütçe, mülk tipi...) veya iletişim bilgisi (telefon/e-posta)");
  return missing;
};

// ---- Gösterim ----
const money = (v: number): string => `${new Intl.NumberFormat("tr-TR").format(v)} TL`;

export const describeFields = (a: CrmTaslakAlanlari, mulkEtiketi: (t: string) => string): string[] => {
  const lines: string[] = [];
  if (a.adSoyad) lines.push(`Ad Soyad: ${a.adSoyad}`);
  if (a.rol) lines.push(`Rol: ${a.rol}`);
  if (a.telefon) lines.push(`Telefon: ${a.telefon}`);
  if (a.email) lines.push(`E-posta: ${a.email}`);
  if (a.mulkTipi) lines.push(`Mülk tipi: ${mulkEtiketi(a.mulkTipi)}`);
  const konum = [a.il, a.ilce].filter(Boolean).join(" / ");
  if (konum) lines.push(`Konum: ${konum}`);
  if (a.mahalleler.length) lines.push(`Mahalle: ${a.mahalleler.join(", ")}`);
  if (a.butceMin !== null || a.butceMax !== null) {
    lines.push(
      `Bütçe: ${a.butceMin !== null && a.butceMax !== null ? `${money(a.butceMin)} - ${money(a.butceMax)}` : a.butceMax !== null ? `en fazla ${money(a.butceMax)}` : `en az ${money(a.butceMin as number)}`}`,
    );
  }
  if (a.m2Min !== null || a.m2Max !== null) {
    lines.push(
      `Metrekare: ${a.m2Min !== null && a.m2Max !== null ? `${a.m2Min} - ${a.m2Max} m²` : a.m2Min !== null ? `en az ${a.m2Min} m²` : `en fazla ${a.m2Max} m²`}`,
    );
  }
  if (a.odaSayisi) lines.push(`Oda: ${a.odaEnAz ? "en az " : ""}${a.odaSayisi}`);
  if (a.ozellikler.length) lines.push(`Özellikler: ${a.ozellikler.join(", ")}`);
  if (a.not) lines.push(`Not: ${a.not}`);
  return lines;
};

export const roleToIntent = (rol: CrmTaslakAlanlari["rol"]): "SATIN_ALMA" | "KIRALAMA" | "BELIRSIZ" =>
  rol === "alıcı" ? "SATIN_ALMA" : rol === "kiracı" ? "KIRALAMA" : "BELIRSIZ";

export const isDemandRole = (rol: CrmTaslakAlanlari["rol"]): boolean => rol === "alıcı" || rol === "kiracı";

export const roleEnum = (rol: NonNullable<CrmTaslakAlanlari["rol"]>) => CRM_ROL_ESLEME[rol];

export const splitName = (adSoyad: string): { firstName: string; lastName: string } => {
  const words = adSoyad.split(" ").filter(Boolean);
  const lastName = words.length > 1 ? (words.pop() as string) : "";
  return { firstName: words.join(" "), lastName };
};

// ---- LLM'in gerçekleşmemiş kayıt iddiası ----
const WRITE_CLAIM = /(kaydettim|kaydedildi|not ettim|not aldım|not aldim|ekledim|eklendi|oluşturdum|olusturdum|oluşturuldu|olusturuldu|CRM['’]?e (?:ekledim|kaydettim))/i;

export const NO_WRITE_NOTICE =
  "Not: Henüz hiçbir kayıt oluşturulmadı. Müşteriyi CRM'e eklemek için bilgileri yazın; taslağı hazırlayıp onayınıza sunarım.";

// Gerçek bir yazma sonucu yokken LLM cevabında "kaydettim/not ettim" geçerse düzeltme notu ekler.
export const guardWriteClaims = (reply: string): string =>
  WRITE_CLAIM.test(reply) && !reply.includes(NO_WRITE_NOTICE) ? `${reply.trim()}\n\n${NO_WRITE_NOTICE}` : reply;
