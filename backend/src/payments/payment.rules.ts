import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';

export const PAYMENT_SETTINGS_KEY = 'EPH_PAYMENT_SETTINGS_V1';
export const jsonObject = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

export function money(value: unknown): string {
  try {
    const amount = new Prisma.Decimal(String(value));
    if (!amount.isFinite() || amount.lte(0) || amount.gt(10000000) || amount.decimalPlaces() > 2) throw new Error();
    return amount.toFixed(2);
  } catch {
    throw new BadRequestException('Geçersiz ödeme tutarı.');
  }
}

export function equalMoney(left: unknown, right: unknown): boolean {
  try { return money(left) === money(right); } catch { return false; }
}

export function addMonthClamped(base: Date): Date {
  const result = new Date(base);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}

export function digest(value: unknown): string {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical);
    if (item && typeof item === 'object') return Object.fromEntries(Object.keys(item).sort().map((key) => [key, canonical((item as Record<string, unknown>)[key])]));
    return item;
  };
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export const DEFAULT_PAYMENT_TERMS = {
  seller: {
    name: 'MOB RESTORAN KAFE KAFETERYA GIDA ORGANİZASYON İNŞAAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
    address: 'Siteler Mah. Bursa Cad. Deniz Apt. No: 27/A, Pamukkale / Denizli',
    taxOffice: 'Pamukkale', taxNumber: '6221758768', registryNumber: 'Denizli – 43290',
    email: 'info@emlakportfoyhavuzu.com', phone: '+90 507 779 48 75',
  },
  delivery: 'Üyelik ve PK dijital hizmettir; fiziksel teslimat yapılmaz. Başarılı tahsilat sunucuda doğrulandığında satın alınan haklar aynı EPH hesabına tanımlanır. Doğrulama sürüyorsa yeniden ödeme yapmadan Ödemelerim ekranından durumu kontrol edin. Hak tanımlaması tamamlanmayan işlemler destek tarafından incelenir.',
  refunds: 'İade talebi Ödemelerim ekranından veya satıcının iletişim kanallarından iletilir. Kullanılmış PK, verilmiş hizmet, üyelik süresi ve işlemin hukuki niteliği değerlendirilerek sonuç bildirilir. Emredici mevzuattan doğan haklar saklıdır. Onaylanan kart iadeleri asıl ödeme kanalına yapılır; karta yansıma süresi bankaya bağlıdır.',
  sales: 'Satıcı ve alıcı bilgileri, seçilen ürün, dahil haklar ve vergi dahil toplam tutar ödeme öncesinde gösterilir ve siparişte saklanır. PK parasal bir cüzdan veya nakde çevrilebilir elektronik para değildir. Üyelik satın alımı bir aylık dönem içindir; bu akış otomatik kart tahsilatı başlatmaz. Yenilemede dönem sonu esas alınır; yükseltmede kullanılmamış üyelik süresi korunur. Daha düşük pakete geçiş bu ödeme akışında sunulmaz. Müşteri ödeme yükümlülüğünü ödeme sayfasındaki onayla kabul eder.',
  privacy: 'Faturalandırma ve ödeme için gerekli kimlik, iletişim ve adres bilgileri ödeme hizmetinin sunulması amacıyla işlenir ve iyzico ile paylaşılır. Kart numarası, son kullanma tarihi ve güvenlik kodu EPH formunda toplanmaz veya EPH kayıtlarına yazılmaz. Ayrıntılar Gizlilik Politikası ve KVKK sayfalarındadır.',
};

export function termsVersion(terms: unknown): string { return digest(terms); }
