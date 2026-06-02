export type StokMainCategoryKey =
  | "KONUT"
  | "IS_YERI"
  | "ARAZI"
  | "KONUT_PROJELERI"
  | "BINA"
  | "DEVRE_MULK"
  | "TURISTIK_TESIS"
  | "OZEL_PORTFOY";

export type StokFieldType = "text" | "number" | "select" | "textarea" | "boolean";

export type StokTechnicalField = {
  key: string;
  label: string;
  type: StokFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type StokDetailType = {
  key: string;
  label: string;
  premium?: boolean;
};

export type StokSubCategory = {
  key: string;
  label: string;
  detailTypes: StokDetailType[];
  technicalFields: StokTechnicalField[];
  featureGroups: string[];
  areaRule: {
    min: number;
    max: number;
    label: string;
  };
};

export type StokMainCategory = {
  key: StokMainCategoryKey;
  label: string;
  subCategories: StokSubCategory[];
};

const FLOOR_FIELDS: StokTechnicalField[] = [
  { key: "roomCount", label: "Oda / Plan Tipi", type: "text", placeholder: "Örn: 3+1, 2+1, Loft" },
  { key: "floorLabel", label: "Bulunduğu Kat", type: "text", placeholder: "Örn: 3. Kat, Bahçe Dubleksi" },
  { key: "buildingFloorCount", label: "Toplam Kat Sayısı", type: "number", placeholder: "Örn: 8" },
  { key: "buildingAge", label: "Bina Yaşı", type: "select", options: ["0", "1-5", "6-10", "11-15", "16-20", "21-30", "31 ve üzeri"] },
  { key: "bathroomCount", label: "Banyo Sayısı", type: "select", options: ["Yok", "1", "2", "3", "4", "5 ve üzeri"] },
  { key: "netArea", label: "Net m²", type: "number", placeholder: "Örn: 145" },
  { key: "grossArea", label: "Brüt m²", type: "number", placeholder: "Örn: 190" },
];

const LAND_FIELDS: StokTechnicalField[] = [
  { key: "ada", label: "Ada", type: "text", placeholder: "Örn: 123" },
  { key: "parsel", label: "Parsel", type: "text", placeholder: "Örn: 45" },
  { key: "pafta", label: "Pafta", type: "text", placeholder: "Varsa" },
  { key: "deedStatus", label: "Tapu Durumu", type: "select", options: ["Müstakil Tapu", "Hisseli Tapu", "Kat İrtifakı", "Kat Mülkiyeti", "Tahsis", "Zilliyet", "Bilinmiyor"] },
  { key: "zoningStatus", label: "İmar Durumu", type: "select", options: ["Konut İmarlı", "Villa İmarlı", "Ticari İmarlı", "Sanayi İmarlı", "Turizm İmarlı", "Konut + Ticaret", "Tarla", "Bağ & Bahçe", "Zeytinlik", "Sera", "Sit Alanı", "İmarsız", "Özel Kullanım"] },
  { key: "roadStatus", label: "Yol Durumu", type: "select", options: ["Yola Cepheli", "Kadastral Yolu Var", "Yol Yakın", "Yol Yok"] },
  { key: "slope", label: "Eğim Durumu", type: "select", options: ["Düz", "Az Eğimli", "Eğimli", "Teraslı", "Bilinmiyor"] },
];

const COMMERCIAL_FIELDS: StokTechnicalField[] = [
  { key: "netArea", label: "Net m²", type: "number", placeholder: "Örn: 80" },
  { key: "grossArea", label: "Brüt m²", type: "number", placeholder: "Örn: 120" },
  { key: "floorLabel", label: "Bulunduğu Kat", type: "text", placeholder: "Örn: Dükkan Girişi, Plaza Katı" },
  { key: "ceilingHeight", label: "Tavan Yüksekliği", type: "text", placeholder: "Örn: 4.5 m" },
  { key: "frontage", label: "Cephe Genişliği", type: "text", placeholder: "Örn: 12 m" },
  { key: "usageStatus", label: "Kullanım Durumu", type: "select", options: ["Boş", "Kiracılı", "Mal Sahibi Kullanıyor", "Devren", "Yeni"] },
];

const TOURISM_FIELDS: StokTechnicalField[] = [
  { key: "roomCount", label: "Oda Sayısı", type: "number", placeholder: "Örn: 35" },
  { key: "bedCapacity", label: "Yatak Kapasitesi", type: "number", placeholder: "Örn: 80" },
  { key: "openArea", label: "Açık Alan m²", type: "number", placeholder: "Örn: 1200" },
  { key: "closedArea", label: "Kapalı Alan m²", type: "number", placeholder: "Örn: 2500" },
  { key: "starRating", label: "Yıldız / Sınıf", type: "select", options: ["Butik", "1 Yıldız", "2 Yıldız", "3 Yıldız", "4 Yıldız", "5 Yıldız", "Özel Belgeli"] },
  { key: "licenseStatus", label: "Ruhsat Durumu", type: "select", options: ["Ruhsatlı", "Ruhsat Sürecinde", "Ruhsat Yok", "Bilinmiyor"] },
];

export const STOK_CATEGORY_TREE: StokMainCategory[] = [
  {
    key: "KONUT",
    label: "Konut",
    subCategories: [
      {
        key: "DAIRE",
        label: "Daire",
        detailTypes: [
          { key: "STANDART_DAIRE", label: "Daire" },
          { key: "HAVUZLU_DAIRE", label: "Havuzlu Daire", premium: true },
          { key: "OZEL_HAVUZLU_DAIRE", label: "Özel Havuzlu Daire", premium: true },
          { key: "TERAS_HAVUZLU_DAIRE", label: "Teras Havuzlu Daire", premium: true },
          { key: "DUBLEKS", label: "Dubleks" },
          { key: "TERS_DUBLEKS", label: "Ters Dubleks" },
          { key: "BAHCE_DUBLEKSI", label: "Bahçe Dubleksi", premium: true },
          { key: "CATI_DUBLEKSI", label: "Çatı Dubleksi" },
          { key: "CATI_TERAS", label: "Çatı Teras", premium: true },
          { key: "ARAKAT", label: "Ara Kat" },
          { key: "YUKSEK_GIRIS", label: "Yüksek Giriş" },
        ],
        technicalFields: FLOOR_FIELDS,
        featureGroups: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury", "eph"],
        areaRule: { min: 20, max: 1000, label: "Daire" },
      },
      {
        key: "REZIDANS",
        label: "Rezidans",
        detailTypes: [
          { key: "REZIDANS", label: "Rezidans" },
          { key: "MARINA_RESIDENCE", label: "Marina Residence", premium: true },
          { key: "GOLF_RESIDENCE", label: "Golf Residence", premium: true },
          { key: "SKY_RESIDENCE", label: "Sky Residence", premium: true },
          { key: "SKY_POOL_RESIDENCE", label: "Sky Pool Residence", premium: true },
          { key: "AKILLI_REZIDANS", label: "Akıllı Rezidans", premium: true },
        ],
        technicalFields: FLOOR_FIELDS,
        featureGroups: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury", "eph"],
        areaRule: { min: 20, max: 1500, label: "Rezidans" },
      },
      {
        key: "VILLA",
        label: "Villa",
        detailTypes: [
          { key: "MUSTAKIL_VILLA", label: "Müstakil Villa" },
          { key: "IKIZ_VILLA", label: "İkiz Villa" },
          { key: "SIRA_VILLA", label: "Sıra Villa" },
          { key: "DUBLEKS_VILLA", label: "Dubleks Villa" },
          { key: "TRIPLEKS_VILLA", label: "Tripleks Villa" },
          { key: "ULTRA_LUKS_VILLA", label: "Ultra Lüks Villa", premium: true },
          { key: "AKILLI_VILLA", label: "Akıllı Villa", premium: true },
          { key: "OZEL_ISKELELI_VILLA", label: "Özel İskeleli Villa", premium: true },
        ],
        technicalFields: [
          ...FLOOR_FIELDS,
          { key: "gardenArea", label: "Bahçe Alanı m²", type: "number", placeholder: "Örn: 450" },
          { key: "pool", label: "Havuz", type: "select", options: ["Yok", "Ortak Havuz", "Özel Havuz", "Sonsuzluk Havuzu"] },
        ],
        featureGroups: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury", "eph"],
        areaRule: { min: 50, max: 5000, label: "Villa" },
      },
      {
        key: "YALI_KOSK_KONAK",
        label: "Yalı / Köşk / Konak",
        detailTypes: [
          { key: "YALI", label: "Yalı", premium: true },
          { key: "YALI_DAIRESI", label: "Yalı Dairesi", premium: true },
          { key: "KOSK", label: "Köşk", premium: true },
          { key: "KONAK", label: "Konak", premium: true },
          { key: "CIFTLIK_EVI", label: "Çiftlik Evi" },
          { key: "YAZLIK", label: "Yazlık" },
        ],
        technicalFields: FLOOR_FIELDS,
        featureGroups: ["interior", "exterior", "location", "transport", "front", "view", "accessibility", "luxury", "eph"],
        areaRule: { min: 50, max: 10000, label: "Yalı / köşk / konak" },
      },
    ],
  },
  {
    key: "IS_YERI",
    label: "İş Yeri",
    subCategories: [
      {
        key: "DUKKAN_MAGAZA",
        label: "Dükkan & Mağaza",
        detailTypes: [
          { key: "CADDE_UZERI", label: "Cadde Üzeri" },
          { key: "KOSE_KONUM", label: "Köşe Konum" },
          { key: "DEPOLU", label: "Depolu" },
          { key: "KIRACILI", label: "Kiracılı" },
          { key: "DEVREN", label: "Devren" },
        ],
        technicalFields: COMMERCIAL_FIELDS,
        featureGroups: ["commercial", "location", "transport", "front", "eph"],
        areaRule: { min: 10, max: 10000, label: "Dükkan / mağaza" },
      },
      {
        key: "OFIS_BURO",
        label: "Ofis & Büro",
        detailTypes: [
          { key: "OFIS", label: "Ofis" },
          { key: "HOME_OFFICE", label: "Home Office" },
          { key: "PLAZA_KATI", label: "Plaza Katı" },
          { key: "PLAZA_KATI_OFISI", label: "Plaza Katı & Ofisi" },
        ],
        technicalFields: COMMERCIAL_FIELDS,
        featureGroups: ["commercial", "interior", "exterior", "location", "transport", "front", "eph"],
        areaRule: { min: 10, max: 10000, label: "Ofis" },
      },
      {
        key: "SANAYI_DEPO",
        label: "Sanayi / Depo / Fabrika",
        detailTypes: [
          { key: "FABRIKA", label: "Fabrika & Üretim Tesisi" },
          { key: "ATOLYE", label: "Atölye" },
          { key: "DEPO_ANTREPO", label: "Depo & Antrepo" },
          { key: "LOJISTIK_MERKEZI", label: "Lojistik Merkezi" },
          { key: "IMALATHANE", label: "İmalathane" },
        ],
        technicalFields: [
          ...COMMERCIAL_FIELDS,
          { key: "power", label: "Elektrik Gücü", type: "text", placeholder: "Örn: 380V / 500 kVA" },
          { key: "loadingArea", label: "Yükleme Alanı", type: "select", options: ["Var", "Yok", "Tır Girişli", "Rampa Var"] },
        ],
        featureGroups: ["commercial", "landInfrastructure", "transport", "eph"],
        areaRule: { min: 50, max: 100000, label: "Sanayi / depo / fabrika" },
      },
      {
        key: "HIZMET_ISLETMESI",
        label: "Hizmet İşletmesi",
        detailTypes: [
          { key: "AKARYAKIT_ISTASYONU", label: "Akaryakıt İstasyonu" },
          { key: "RESTORAN", label: "Restoran" },
          { key: "KAFE_BAR", label: "Kafe & Bar" },
          { key: "DUGUN_SALONU", label: "Düğün Salonu" },
          { key: "SPOR_TESISI", label: "Spor Tesisi" },
          { key: "HAMAM_SAUNA_SPA", label: "Hamam, Sauna, Spa" },
          { key: "OKUL_EGITIM", label: "Okul / Eğitim Tesisi" },
          { key: "HASTANE_SAGLIK", label: "Hastane / Sağlık Tesisi" },
          { key: "YURT", label: "Yurt" },
        ],
        technicalFields: COMMERCIAL_FIELDS,
        featureGroups: ["commercial", "location", "transport", "luxury", "eph"],
        areaRule: { min: 20, max: 50000, label: "Hizmet işletmesi" },
      },
    ],
  },
  {
    key: "ARAZI",
    label: "Arazi",
    subCategories: [
      {
        key: "IMARLI_ARSA",
        label: "İmarlı Arsa",
        detailTypes: [
          { key: "KONUT_IMARLI", label: "Konut İmarlı" },
          { key: "VILLA_IMARLI", label: "Villa İmarlı" },
          { key: "TICARI_IMARLI", label: "Ticari İmarlı" },
          { key: "SANAYI_IMARLI", label: "Sanayi İmarlı" },
          { key: "TURIZM_IMARLI", label: "Turizm İmarlı" },
          { key: "KONUT_TICARET", label: "Konut + Ticaret" },
          { key: "KARMA_IMARLI", label: "Karma İmarlı" },
        ],
        technicalFields: LAND_FIELDS,
        featureGroups: ["landInfrastructure", "zoning", "front", "view", "location", "transport", "eph"],
        areaRule: { min: 50, max: 1000000, label: "İmarlı arsa" },
      },
      {
        key: "TARLA_BAG_BAHCE",
        label: "Tarla / Bağ / Bahçe",
        detailTypes: [
          { key: "TARLA", label: "Tarla" },
          { key: "SULU_TARIM", label: "Sulu Tarım Arazisi" },
          { key: "KURU_TARIM", label: "Kuru Tarım Arazisi" },
          { key: "BAG", label: "Bağ" },
          { key: "BAHCE", label: "Bahçe" },
          { key: "ZEYTINLIK", label: "Zeytinlik" },
          { key: "MEYVE_BAHCESI", label: "Meyve Bahçesi" },
          { key: "SERA", label: "Sera" },
          { key: "CIFTLIK", label: "Çiftlik" },
        ],
        technicalFields: LAND_FIELDS,
        featureGroups: ["landInfrastructure", "zoning", "front", "view", "location", "transport", "eph"],
        areaRule: { min: 100, max: 10000000, label: "Tarla / bağ / bahçe" },
      },
      {
        key: "OZEL_ARAZI",
        label: "Özel Kullanım Arazisi",
        detailTypes: [
          { key: "SIT_ALANI", label: "Sit Alanı" },
          { key: "SAGLIK", label: "Sağlık" },
          { key: "EGITIM", label: "Eğitim" },
          { key: "SPOR_ALANI", label: "Spor Alanı" },
          { key: "ENERJI_DEPOLAMA", label: "Enerji Depolama" },
          { key: "OZEL_KULLANIM", label: "Özel Kullanım" },
          { key: "KAT_KARSILIGI", label: "Kat Karşılığı" },
        ],
        technicalFields: LAND_FIELDS,
        featureGroups: ["landInfrastructure", "zoning", "front", "view", "location", "transport", "eph"],
        areaRule: { min: 50, max: 10000000, label: "Özel kullanım arazisi" },
      },
    ],
  },
  {
    key: "KONUT_PROJELERI",
    label: "Konut Projeleri",
    subCategories: [
      {
        key: "PROJE",
        label: "Konut Projesi",
        detailTypes: [
          { key: "SITE_PROJESI", label: "Site Projesi" },
          { key: "REZIDANS_PROJESI", label: "Rezidans Projesi", premium: true },
          { key: "VILLA_PROJESI", label: "Villa Projesi", premium: true },
          { key: "KARMA_PROJE", label: "Karma Proje" },
          { key: "MARKALI_KONUT", label: "Markalı Konut Projesi", premium: true },
        ],
        technicalFields: [
          { key: "unitCount", label: "Bağımsız Bölüm Sayısı", type: "number" },
          { key: "blockCount", label: "Blok Sayısı", type: "number" },
          { key: "deliveryDate", label: "Teslim Tarihi", type: "text", placeholder: "Örn: 2027 Q4" },
          { key: "landArea", label: "Arsa Alanı m²", type: "number" },
        ],
        featureGroups: ["exterior", "location", "transport", "luxury", "eph"],
        areaRule: { min: 100, max: 10000000, label: "Konut projesi" },
      },
    ],
  },
  {
    key: "BINA",
    label: "Bina",
    subCategories: [
      {
        key: "KOMPLE_BINA",
        label: "Komple Bina",
        detailTypes: [
          { key: "KONUT_BINASI", label: "Konut Binası" },
          { key: "TICARI_BINA", label: "Ticari Bina" },
          { key: "KARMA_BINA", label: "Karma Bina" },
          { key: "PLAZA", label: "Plaza" },
        ],
        technicalFields: [
          { key: "buildingFloorCount", label: "Kat Sayısı", type: "number" },
          { key: "unitCount", label: "Bağımsız Bölüm Sayısı", type: "number" },
          { key: "grossArea", label: "Toplam m²", type: "number" },
          { key: "buildingAge", label: "Bina Yaşı", type: "text" },
        ],
        featureGroups: ["exterior", "commercial", "location", "transport", "front", "eph"],
        areaRule: { min: 100, max: 100000, label: "Bina" },
      },
    ],
  },
  {
    key: "DEVRE_MULK",
    label: "Devre Mülk",
    subCategories: [
      {
        key: "DEVRE_MULK",
        label: "Devre Mülk",
        detailTypes: [
          { key: "YAZLIK_DEVRE", label: "Yazlık Devre" },
          { key: "TERMAL_DEVRE", label: "Termal Devre" },
          { key: "OTEL_DEVRE", label: "Otel Devre" },
        ],
        technicalFields: [
          { key: "period", label: "Dönem", type: "text", placeholder: "Örn: Temmuz 2. Hafta" },
          { key: "roomCount", label: "Oda Sayısı", type: "text" },
          { key: "usageRight", label: "Kullanım Hakkı", type: "text" },
        ],
        featureGroups: ["interior", "exterior", "location", "transport", "view", "eph"],
        areaRule: { min: 10, max: 1000, label: "Devre mülk" },
      },
    ],
  },
  {
    key: "TURISTIK_TESIS",
    label: "Turistik Tesis",
    subCategories: [
      {
        key: "OTEL_TESIS",
        label: "Otel / Turistik Tesis",
        detailTypes: [
          { key: "OTEL", label: "Otel" },
          { key: "APART_OTEL", label: "Apart Otel" },
          { key: "BUTIK_OTEL", label: "Butik Otel", premium: true },
          { key: "MOTEL", label: "Motel" },
          { key: "PANSIYON", label: "Pansiyon" },
          { key: "KAMP_YERI", label: "Kamp Yeri / Mocamp" },
          { key: "TATIL_KOYU", label: "Tatil Köyü", premium: true },
        ],
        technicalFields: TOURISM_FIELDS,
        featureGroups: ["tourism", "exterior", "location", "transport", "view", "luxury", "eph"],
        areaRule: { min: 50, max: 100000, label: "Turistik tesis" },
      },
    ],
  },
  {
    key: "OZEL_PORTFOY",
    label: "Özel Portföy",
    subCategories: [
      {
        key: "PREMIUM_PORTFOY",
        label: "Premium Portföy",
        detailTypes: [
          { key: "ULTRA_LUKS", label: "Ultra Lüks" , premium: true},
          { key: "YATIRIMLIK_PREMIUM", label: "Yatırımlık Premium", premium: true },
          { key: "DENIZ_SIFIR", label: "Denize Sıfır", premium: true },
          { key: "PANORAMIK", label: "Panoramik Manzara", premium: true },
          { key: "OZEL_ADA", label: "Özel Ada", premium: true },
          { key: "GOL_CIFTLIK", label: "Göl / Çiftlik Portföyü", premium: true },
        ],
        technicalFields: [
          { key: "portfolioStory", label: "Portföy Hikayesi", type: "textarea", placeholder: "Bu portföyü özel yapan detayları yazınız." },
          { key: "privateNote", label: "Gizli Not", type: "textarea", placeholder: "Sadece ofis içi kullanım" },
        ],
        featureGroups: ["luxury", "view", "eph", "location", "transport"],
        areaRule: { min: 10, max: 10000000, label: "Özel portföy" },
      },
    ],
  },
];

export function getMainCategory(key?: string) {
  return STOK_CATEGORY_TREE.find((category) => category.key === key) || STOK_CATEGORY_TREE[0];
}

export function getSubCategory(mainKey?: string, subKey?: string) {
  const main = getMainCategory(mainKey);
  return main.subCategories.find((sub) => sub.key === subKey) || main.subCategories[0];
}

export function getDetailType(mainKey?: string, subKey?: string, detailKey?: string) {
  const sub = getSubCategory(mainKey, subKey);
  return sub.detailTypes.find((detail) => detail.key === detailKey) || sub.detailTypes[0];
}
