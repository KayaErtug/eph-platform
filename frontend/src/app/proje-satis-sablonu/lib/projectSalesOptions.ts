export const FACADE_GEOMETRY_OPTIONS = [
  { value: "TEK_CEPHELI_STANDART", label: "Tek cepheli proje" },
  { value: "CIFT_CEPHELI_STANDART", label: "Çift cepheli proje" },
  { value: "UC_CEPHELI_STANDART", label: "Üç cepheli proje" },
  { value: "DORT_CEPHELI_STANDART", label: "Dört cepheli proje" },
];

export const ADVANCED_GEOMETRY_OPTIONS = [
  { value: "DIKDORTGEN", label: "Dikdörtgen yapı" },
  { value: "KARE", label: "Kare yapı" },
  { value: "L_PLAN", label: "L plan" },
  { value: "U_PLAN", label: "U plan" },
  {
    value: "BIRDEN_FAZLA_STANDART_BLOK",
    label: "Birden fazla standart blok",
  },
  { value: "BESGEN", label: "Beşgen yapı" },
  { value: "ALTIGEN", label: "Altıgen yapı" },
  { value: "YILDIZ", label: "Yıldız plan" },
  { value: "DAIRESEL", label: "Dairesel yapı" },
  { value: "KIRIK_CEPHELI", label: "Kırık cepheli yapı" },
  { value: "COK_KANATLI", label: "Çok kanatlı yapı" },
  { value: "BAGLANTILI_KULELER", label: "Bağlantılı kuleler" },
  { value: "OZEL_KARMASIK", label: "Özel / karmaşık geometri" },
];

export const COMPLEX_GEOMETRIES = new Set([
  "BESGEN",
  "ALTIGEN",
  "YILDIZ",
  "DAIRESEL",
  "KIRIK_CEPHELI",
  "COK_KANATLI",
  "BAGLANTILI_KULELER",
  "OZEL_KARMASIK",
]);

export const UNIT_TYPE_OPTIONS = [
  { value: "DAIRE", label: "Daire" },
  { value: "STUDYO", label: "Stüdyo" },
  { value: "REZIDANS", label: "Rezidans" },
  { value: "VILLA", label: "Villa" },
  { value: "MUSTAK_EV", label: "Müstakil Ev" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "LOFT", label: "Loft" },
  { value: "TERAS_LOFT", label: "Teras Loft" },
  { value: "DUBLEKS", label: "Dubleks" },
  { value: "TRIPLEKS", label: "Tripleks" },
  { value: "DUKKAN_MAGAZA", label: "Dükkan / Mağaza" },
  { value: "MARKET", label: "Market" },
  { value: "OFIS_BURO", label: "Ofis / Büro" },
  { value: "HOME_OFFICE", label: "Home Office" },
  { value: "DEPO_ANTREPO", label: "Depo / Antrepo" },
  { value: "ATOLYE", label: "Atölye" },
  { value: "SHOWROOM", label: "Showroom" },
  { value: "MUAYENEHANE", label: "Muayenehane" },
  { value: "KLINIK", label: "Klinik" },
  { value: "OTEL_ODASI", label: "Otel Odası" },
];

export const COMMERCIAL_PURPOSE_OPTIONS = [
  { value: "SATISA_SUNULACAK", label: "Satışa sunulacak" },
  { value: "KIRAYA_VERILECEK", label: "Kiraya verilecek" },
  {
    value: "SATIS_VEYA_KIRALAMA_STOGU",
    label: "Satış veya kiralama stoku",
  },
  { value: "ARSA_SAHIBINE_AYRILMIS", label: "Arsa sahibine ayrılmış" },
  { value: "FIRMA_KULLANIMINA_AYRILMIS", label: "Firma kullanımına ayrılmış" },
  { value: "SITE_ISLETMESINE_AYRILMIS", label: "Site işletmesine ayrılmış" },
  { value: "SATIS_DISI", label: "Satış dışı" },
];

export const SALES_COMMERCIAL_PURPOSES = new Set([
  "SATISA_SUNULACAK",
  "KIRAYA_VERILECEK",
  "SATIS_VEYA_KIRALAMA_STOGU",
]);

export const PROJECT_SPACE_TYPE_OPTIONS = [
  { value: "KAPALI_HAVUZ", label: "Kapalı Havuz" },
  { value: "ACIK_HAVUZ", label: "Açık Havuz" },
  { value: "SAUNA", label: "Sauna" },
  { value: "SPA", label: "Spa" },
  { value: "HAMAM", label: "Hamam" },
  { value: "BUHAR_ODASI", label: "Buhar Odası" },
  { value: "SPOR_SALONU", label: "Spor Salonu" },
  { value: "KRES", label: "Kreş" },
  { value: "COCUK_OYUN_ALANI", label: "Çocuk Oyun Alanı" },
  { value: "SINEMA_SALONU", label: "Sinema Salonu" },
  { value: "HOBI_ODASI", label: "Hobi Odası" },
  { value: "TOPLANTI_SALONU", label: "Toplantı Salonu" },
  { value: "KUTUPHANE", label: "Kütüphane" },
  { value: "ORTAK_TERAS", label: "Ortak Teras" },
  { value: "LOBI", label: "Lobi" },
  { value: "RESEPSIYON", label: "Resepsiyon" },
  { value: "SITE_YONETIM_OFISI", label: "Site Yönetim Ofisi" },
  { value: "ORTAK_BAHCE", label: "Ortak Bahçe" },
  { value: "SITE_MARKETI", label: "Site Marketi" },
  { value: "KAFETERYA", label: "Kafeterya" },
  { value: "DINLENME_SALONU", label: "Dinlenme Salonu" },
  { value: "MISAFIR_SALONU", label: "Misafir Salonu" },
  { value: "ELEKTRIK_ODASI", label: "Elektrik Odası" },
  { value: "MEKANIK_ODA", label: "Mekanik Oda" },
  { value: "JENERATOR_ODASI", label: "Jeneratör Odası" },
  { value: "SU_DEPOSU", label: "Su Deposu" },
  { value: "SIGINAK", label: "Sığınak" },
  { value: "GUVENLIK_ODASI", label: "Güvenlik Odası" },
  { value: "PERSONEL_ODASI", label: "Personel Odası" },
  { value: "COP_ODASI", label: "Çöp Odası" },
  { value: "TEKNIK_DEPO", label: "Teknik Depo" },
  { value: "KAPALI_OTOPARK", label: "Kapalı Otopark" },
  { value: "ACIK_OTOPARK", label: "Açık Otopark" },
  { value: "SERVIS_ALANI", label: "Servis Alanı" },
  { value: "YURUYUS_PARKURU", label: "Yürüyüş Parkuru" },
  { value: "BASKETBOL_SAHASI", label: "Basketbol Sahası" },
  { value: "TENIS_KORTU", label: "Tenis Kortu" },
  { value: "COCUK_PARKI", label: "Çocuk Parkı" },
  { value: "PEYZAJ_ALANI", label: "Peyzaj Alanı" },
  { value: "DINLENME_ALANI", label: "Dinlenme Alanı" },
  { value: "SUS_HAVUZU", label: "Süs Havuzu" },
  { value: "DIGER", label: "Diğer" },
];

export const SPACE_LEGAL_STATUS_OPTIONS = [
  { value: "ORTAK_KULLANIM_ALANI", label: "Ortak Kullanım Alanı" },
  { value: "BAGIMSIZ_BOLUM_EKLENTISI", label: "Bağımsız Bölüm Eklentisi" },
  { value: "TEKNIK_HIZMET_ALANI", label: "Teknik / Hizmet Alanı" },
  { value: "ACIK_ALAN_SOSYAL_DONATI", label: "Açık Alan / Sosyal Donatı" },
];

export const SPACE_COMMERCIAL_PURPOSE_OPTIONS = [
  {
    value: "ORTAK_KULLANIMA_AYRILMIS",
    label: "Ortak kullanıma ayrılmış",
  },
  { value: "TEKNIK_KULLANIM", label: "Teknik kullanım" },
  {
    value: "FIRMA_KULLANIMINA_AYRILMIS",
    label: "Firma kullanımına ayrılmış",
  },
  {
    value: "SITE_ISLETMESINE_AYRILMIS",
    label: "Site işletmesine ayrılmış",
  },
  { value: "SATIS_DISI", label: "Satış dışı" },
];

export const TECHNICAL_SPACE_TYPES = new Set([
  "ELEKTRIK_ODASI",
  "MEKANIK_ODA",
  "JENERATOR_ODASI",
  "SU_DEPOSU",
  "SIGINAK",
  "GUVENLIK_ODASI",
  "PERSONEL_ODASI",
  "COP_ODASI",
  "TEKNIK_DEPO",
  "SERVIS_ALANI",
]);

export const OPEN_AMENITY_SPACE_TYPES = new Set([
  "ACIK_HAVUZ",
  "ORTAK_BAHCE",
  "ACIK_OTOPARK",
  "YURUYUS_PARKURU",
  "BASKETBOL_SAHASI",
  "TENIS_KORTU",
  "COCUK_PARKI",
  "PEYZAJ_ALANI",
  "DINLENME_ALANI",
  "SUS_HAVUZU",
  "COCUK_OYUN_ALANI",
]);

export const NO_FACADE_OPTION = "Cephesi Yok / Kör Cephe";

export const FACADE_OPTIONS = [
  "Kuzey",
  "Güney",
  "Doğu",
  "Batı",
  "Kuzeydoğu",
  "Kuzeybatı",
  "Güneydoğu",
  "Güneybatı",
  NO_FACADE_OPTION,
];

export const SALES_STATUS_OPTIONS = [
  { value: "SATILIK", label: "Satılık" },
  { value: "KIRALIK", label: "Kiralık" },
  { value: "ON_SATIS", label: "Ön satış" },
  { value: "YAKINDA_SATISTA", label: "Yakında satışta" },
  { value: "INSAAT_HALINDE", label: "İnşaat halinde" },
  { value: "TESLIME_HAZIR", label: "Teslime hazır" },
  { value: "HEMEN_TESLIM", label: "Hemen teslim" },
  { value: "REZERVE", label: "Rezerve" },
  { value: "OPSIYONLU", label: "Opsiyonlu" },
  { value: "SATILDI", label: "Satıldı" },
  { value: "KIRALANDII", label: "Kiralandı" },
  { value: "PROJE_ASAMASI", label: "Proje aşaması" },
  { value: "PASIF", label: "Pasif" },
];

