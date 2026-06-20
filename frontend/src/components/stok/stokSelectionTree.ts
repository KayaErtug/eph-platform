export type StokMainCategoryKey =
  | "KONUT"
  | "BINA"
  | "IS_YERI"
  | "ARAZI"
  | "KONUT_PROJELERI"
  | "TURISTIK_TESIS"
  | "DEVRE_MULK"
  | "OZEL_PORTFOY";

export type StokSelectionLevelKey = "level1" | "level2" | "level3";

export type StokSelectionOption = {
  key: string;
  label: string;
  premium?: boolean;
  children?: StokSelectionOption[];
};

export type StokSelectionPath = {
  mainCategoryKey: StokMainCategoryKey;
  mainCategoryLabel: string;
  subCategoryKey: string;
  subCategoryLabel: string;
  level1Key?: string;
  level1Label?: string;
  level2Key?: string;
  level2Label?: string;
  level3Key?: string;
  level3Label?: string;
  requiredFields: string[];
  optionalFields: string[];
  specialFields: string[];
  featurePresets: string[];
  cardTemplate: string;
  note?: string;
};

export type StokSelectionSubCategory = {
  key: string;
  label: string;
  level1Label: string;
  level2Label?: string;
  level3Label?: string;
  options: StokSelectionOption[];
  requiredFields: string[];
  optionalFields: string[];
  specialFields: string[];
  featurePresets: string[];
  cardTemplate: string;
  note?: string;
};

export type StokSelectionMainCategory = {
  key: StokMainCategoryKey;
  label: string;
  subCategories: StokSelectionSubCategory[];
};

const COMMON_OPTIONAL_FIELDS = [
  "description",
  "availableCreditAmount",
  "doorAccessInfo",
  "deedOwnerFullName",
  "deedOwnerPhone",
  "deedOwnerEmail",
];

const HOME_REQUIRED_FIELDS = ["roomCount", "area", "buildingAge", "price"];
const APARTMENT_REQUIRED_FIELDS = ["roomCount", "area", "buildingAge", "floor", "totalFloors", "price"];
const LAND_REQUIRED_FIELDS = ["area", "adaNo", "parselNo", "price"];
const COMMERCIAL_REQUIRED_FIELDS = ["area", "price"];
const BUILDING_REQUIRED_FIELDS = ["area", "buildingAge", "totalFloors", "price"];
const TOURISM_REQUIRED_FIELDS = ["roomCount", "bedCount", "area", "price"];

export const STOK_SELECTION_TREE: StokSelectionMainCategory[] = [
  {
    key: "KONUT",
    label: "Konut",
    subCategories: [
      {
        key: "DAIRE",
        label: "Daire",
        level1Label: "Daire Tipi",
        level2Label: "Kullanım Durumu",
        options: [
          { key: "NORMAL_DAIRE", label: "Normal Daire" },
          { key: "BAHCE_KATI_DAIRE", label: "Bahçe Katı Daire", premium: true },
          { key: "ARA_KAT_DAIRE", label: "Ara Kat Daire" },
          { key: "GIRIS_KAT_DAIRE", label: "Giriş Kat Daire" },
          { key: "CATI_DUBLEKSI", label: "Çatı Dubleksi", premium: true },
          { key: "TERS_DUBLEKS", label: "Ters Dubleks" },
        ],
        requiredFields: APARTMENT_REQUIRED_FIELDS,
        optionalFields: ["number", "adaNo", "parselNo", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["heatingType", "parkingType", "bathroomCount", "usageStatus"],
        featurePresets: ["konut", "apartment", "parking", "heating"],
        cardTemplate: "apartment",
      },
      {
        key: "REZIDANS",
        label: "Rezidans",
        level1Label: "Rezidans Tipi",
        level2Label: "Hizmet Tipi",
        options: [
          { key: "STANDART_REZIDANS", label: "Standart Rezidans" },
          { key: "SERVISLI_REZIDANS", label: "Servisli Rezidans", premium: true },
          { key: "OTEL_KONSEPT_REZIDANS", label: "Otel Konsept Rezidans", premium: true },
          { key: "LUKS_REZIDANS", label: "Lüks Rezidans", premium: true },
        ],
        requiredFields: APARTMENT_REQUIRED_FIELDS,
        optionalFields: ["number", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["heatingType", "parkingType", "bathroomCount", "serviceType"],
        featurePresets: ["konut", "residence", "luxury", "security", "parking"],
        cardTemplate: "residence",
      },
      {
        key: "VILLA",
        label: "Villa",
        level1Label: "Villa Tipi",
        level2Label: "Nizam Tipi",
        level3Label: "Havuz Tipi",
        options: [
          {
            key: "TEK_KATLI_VILLA",
            label: "Tek Katlı Villa",
            children: [
              { key: "AYRIK_NIZAM", label: "Ayrık Nizam" },
              { key: "IKIZ_VILLA", label: "İkiz Villa" },
              { key: "BITISIK_NIZAM", label: "Bitişik Nizam" },
            ],
          },
          {
            key: "DUBLEKS_VILLA",
            label: "Dubleks Villa",
            children: [
              { key: "AYRIK_NIZAM", label: "Ayrık Nizam" },
              { key: "IKIZ_VILLA", label: "İkiz Villa" },
              { key: "BITISIK_NIZAM", label: "Bitişik Nizam" },
            ],
          },
          {
            key: "TRIPLEKS_VILLA",
            label: "Tripleks Villa",
            premium: true,
            children: [
              { key: "AYRIK_NIZAM", label: "Ayrık Nizam" },
              { key: "IKIZ_VILLA", label: "İkiz Villa" },
              { key: "BITISIK_NIZAM", label: "Bitişik Nizam" },
            ],
          },
          {
            key: "FOURPLEX_VILLA",
            label: "Fourplex Villa",
            premium: true,
            children: [
              { key: "AYRIK_NIZAM", label: "Ayrık Nizam" },
              { key: "IKIZ_VILLA", label: "İkiz Villa" },
              { key: "BITISIK_NIZAM", label: "Bitişik Nizam" },
            ],
          },
        ],
        requiredFields: HOME_REQUIRED_FIELDS,
        optionalFields: ["number", "gardenArea", "landArea", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["villaType", "layoutType", "poolType", "heatingType", "parkingType", "bathroomCount"],
        featurePresets: ["konut", "villa", "garden", "pool", "parking", "luxury"],
        cardTemplate: "villa",
        note: "Villa için bulunduğu kat alanı gösterilmez; villa tipi ve nizam tipi ana seçim ağacından gelir.",
      },
      {
        key: "YAZLIK",
        label: "Yazlık",
        level1Label: "Yazlık Türü",
        level2Label: "Kullanım Şekli",
        options: [
          { key: "YAZLIK_DAIRE", label: "Yazlık Daire" },
          { key: "YAZLIK_VILLA", label: "Yazlık Villa", premium: true },
          { key: "YAZLIK_MUSTAKIL_EV", label: "Yazlık Müstakil Ev" },
          { key: "YAZLIK_REZIDANS", label: "Yazlık Rezidans", premium: true },
        ],
        requiredFields: HOME_REQUIRED_FIELDS,
        optionalFields: ["number", "seasonUsage", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["summerHouseType", "buildingStyle", "heatingType", "parkingType"],
        featurePresets: ["konut", "summer", "view", "parking", "pool"],
        cardTemplate: "summer_house",
      },
      {
        key: "MUSTAK_EV",
        label: "Müstakil Ev",
        level1Label: "Ev Tipi",
        level2Label: "Nizam Tipi",
        options: [
          { key: "TEK_KATLI_EV", label: "Tek Katlı Ev" },
          { key: "DUBLEKS_EV", label: "Dubleks Ev" },
          { key: "TRIPLEKS_EV", label: "Tripleks Ev" },
        ],
        requiredFields: HOME_REQUIRED_FIELDS,
        optionalFields: ["number", "gardenArea", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["homeType", "layoutType", "heatingType", "parkingType", "bathroomCount"],
        featurePresets: ["konut", "detached", "garden", "parking"],
        cardTemplate: "detached_house",
      },
      {
        key: "KOY_EVI",
        label: "Köy Evi",
        level1Label: "Yapı Tipi",
        level2Label: "Restorasyon Durumu",
        options: [
          { key: "TAS_EV", label: "Taş Ev" },
          { key: "AHSAP_EV", label: "Ahşap Ev" },
          { key: "KERPIC_EV", label: "Kerpiç Ev" },
          { key: "BUNGALOV", label: "Bungalov" },
          { key: "RESTORE_EDILMIS", label: "Restore Edilmiş", premium: true },
          { key: "RESTORASYON_GEREKLI", label: "Restorasyon Gerekli" },
        ],
        requiredFields: ["roomCount", "area", "price"],
        optionalFields: ["buildingAge", "number", "landArea", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["buildingStyle", "heatingType", "parkingType"],
        featurePresets: ["konut", "rural", "landInfrastructure", "view"],
        cardTemplate: "rural_house",
      },
      {
        key: "DAG_EVI_YAYLA_EVI",
        label: "Dağ Evi / Yayla Evi",
        level1Label: "Yapı Tipi",
        level2Label: "Ulaşım Durumu",
        options: [
          { key: "TAS_DAG_EVI", label: "Taş Ev" },
          { key: "AHSAP_DAG_EVI", label: "Ahşap Ev" },
          { key: "BUNGALOV_DAG_EVI", label: "Bungalov" },
          { key: "YAYLA_EVI", label: "Yayla Evi" },
        ],
        requiredFields: ["roomCount", "area", "price"],
        optionalFields: ["buildingAge", "number", "landArea", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["buildingStyle", "accessSeason", "heatingType", "parkingType"],
        featurePresets: ["konut", "mountain", "rural", "view", "transport"],
        cardTemplate: "mountain_house",
      },
    ],
  },
  {
    key: "BINA",
    label: "Bina",
    subCategories: [
      {
        key: "APARTMAN",
        label: "Apartman",
        level1Label: "Apartman Tipi",
        level2Label: "Nizam Tipi",
        options: [
          { key: "KOMPLE_APARTMAN", label: "Komple Apartman" },
          { key: "APARTMAN_BLOGU", label: "Apartman Bloğu" },
          { key: "TEK_PARSEL_APARTMAN", label: "Tek Parsel Apartman" },
        ],
        requiredFields: BUILDING_REQUIRED_FIELDS,
        optionalFields: ["unitCount", "adaNo", "parselNo", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["buildingUsage", "layoutType", "heatingType", "parkingType"],
        featurePresets: ["building", "apartment_building", "parking", "transport"],
        cardTemplate: "building",
      },
      {
        key: "KOMPLE_BINA",
        label: "Komple Bina",
        level1Label: "Bina Kullanım Tipi",
        options: [
          { key: "KONUT_AGIRLIKLI", label: "Konut Ağırlıklı" },
          { key: "TICARI_AGIRLIKLI", label: "Ticari Ağırlıklı" },
          { key: "KARMA_KULLANIM", label: "Karma Kullanım" },
        ],
        requiredFields: BUILDING_REQUIRED_FIELDS,
        optionalFields: ["unitCount", "adaNo", "parselNo", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["buildingUsage", "heatingType", "parkingType"],
        featurePresets: ["building", "commercial", "parking"],
        cardTemplate: "building",
      },
      {
        key: "IS_HANI",
        label: "İş Hanı",
        level1Label: "İş Hanı Tipi",
        options: [
          { key: "IS_HANI", label: "İş Hanı" },
          { key: "PASAJ", label: "Pasaj" },
          { key: "TICARI_BLOK", label: "Ticari Blok" },
        ],
        requiredFields: ["area", "totalFloors", "price"],
        optionalFields: ["unitCount", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["buildingUsage", "parkingType"],
        featurePresets: ["building", "commercial", "front", "transport"],
        cardTemplate: "commercial_building",
      },
      {
        key: "PLAZA_BINA",
        label: "Plaza Bina",
        level1Label: "Plaza Sınıfı",
        options: [
          { key: "A_SINIFI", label: "A Sınıfı", premium: true },
          { key: "B_SINIFI", label: "B Sınıfı" },
          { key: "C_SINIFI", label: "C Sınıfı" },
        ],
        requiredFields: ["area", "totalFloors", "price"],
        optionalFields: ["unitCount", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["plazaClass", "parkingType", "heatingType"],
        featurePresets: ["building", "plaza", "commercial", "security", "parking"],
        cardTemplate: "plaza_building",
      },
      {
        key: "REZIDANS_BINA",
        label: "Rezidans Bina",
        level1Label: "Rezidans Bina Tipi",
        options: [
          { key: "KOMPLE_REZIDANS", label: "Komple Rezidans", premium: true },
          { key: "REZIDANS_BLOGU", label: "Rezidans Bloğu" },
        ],
        requiredFields: ["area", "totalFloors", "price"],
        optionalFields: ["unitCount", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["buildingUsage", "parkingType", "heatingType"],
        featurePresets: ["building", "residence", "luxury", "parking"],
        cardTemplate: "residence_building",
      },
      {
        key: "OTEL_BINASI",
        label: "Otel Binası",
        level1Label: "Otel Bina Durumu",
        options: [
          { key: "FAAL_OTEL", label: "Faal Otel" },
          { key: "BOS_OTEL_BINASI", label: "Boş Otel Binası" },
          { key: "DONUSUME_UYGUN", label: "Dönüşüme Uygun" },
        ],
        requiredFields: ["roomCount", "area", "totalFloors", "price"],
        optionalFields: ["bedCount", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["hotelBuildingStatus", "parkingType"],
        featurePresets: ["building", "tourism", "commercial", "parking"],
        cardTemplate: "hotel_building",
      },
    ],
  },
  {
    key: "IS_YERI",
    label: "İşyeri",
    subCategories: [
      {
        key: "FABRIKA_URETIM_TESISI",
        label: "Fabrika / Üretim Tesisi",
        level1Label: "Sanayi Yapı Tipi",
        level2Label: "Kullanım Durumu",
        options: [
          { key: "FABRIKA", label: "Fabrika" },
          { key: "URETIM_TESISI", label: "Üretim Tesisi" },
          { key: "IMALATHANE", label: "İmalathane" },
        ],
        requiredFields: ["area", "openArea", "price"],
        optionalFields: ["closedArea", "number", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["industrialBuildingType", "usageStatus", "parkingType"],
        featurePresets: ["commercial", "industrial", "landInfrastructure", "transport"],
        cardTemplate: "factory",
      },
      {
        key: "ATOLYE",
        label: "Atölye",
        level1Label: "Atölye Tipi",
        options: [
          { key: "URETIM_ATOLYESI", label: "Üretim Atölyesi" },
          { key: "TAMIR_ATOLYESI", label: "Tamir Atölyesi" },
          { key: "DEPOLU_ATOLYE", label: "Depolu Atölye" },
        ],
        requiredFields: COMMERCIAL_REQUIRED_FIELDS,
        optionalFields: ["number", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["workshopType", "usageStatus", "parkingType"],
        featurePresets: ["commercial", "industrial"],
        cardTemplate: "workshop",
      },
      {
        key: "TICARI_ISLETME",
        label: "Ticari İşletme",
        level1Label: "İşletme Tipi",
        options: [
          { key: "DEVREN", label: "Devren" },
          { key: "AKTIF_ISLETME", label: "Aktif İşletme" },
          { key: "BOS_TICARI_ALAN", label: "Boş Ticari Alan" },
        ],
        requiredFields: COMMERCIAL_REQUIRED_FIELDS,
        optionalFields: ["number", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["businessType", "usageStatus", "parkingType"],
        featurePresets: ["commercial", "location", "front"],
        cardTemplate: "business",
      },
      {
        key: "DEPO_ANTREPO",
        label: "Depo / Antrepo",
        level1Label: "Depo Tipi",
        options: [
          { key: "DEPO", label: "Depo" },
          { key: "ANTREPO", label: "Antrepo" },
          { key: "SOGUK_HAVA_DEPOSU", label: "Soğuk Hava Deposu" },
          { key: "LOJISTIK_DEPO", label: "Lojistik Depo" },
        ],
        requiredFields: COMMERCIAL_REQUIRED_FIELDS,
        optionalFields: ["openArea", "closedArea", "number", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["warehouseType", "loadingArea", "parkingType"],
        featurePresets: ["commercial", "warehouse", "transport", "industrial"],
        cardTemplate: "warehouse",
      },
      {
        key: "DUKKAN_MAGAZA",
        label: "Dükkan / Mağaza",
        level1Label: "Dükkan Tipi",
        options: [
          { key: "DUKKAN", label: "Dükkan" },
          { key: "MAGAZA", label: "Mağaza" },
          { key: "SHOWROOM", label: "Showroom", premium: true },
          { key: "DEPOLU_DUKKAN", label: "Depolu Dükkan" },
        ],
        requiredFields: COMMERCIAL_REQUIRED_FIELDS,
        optionalFields: ["floor", "number", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["shopType", "usageStatus", "parkingType"],
        featurePresets: ["commercial", "front", "location", "transport"],
        cardTemplate: "shop",
      },
      {
        key: "OFIS_BURO",
        label: "Ofis / Büro",
        level1Label: "Ofis Tipi",
        options: [
          { key: "BURO", label: "Büro" },
          { key: "PLAZA_OFIS", label: "Plaza Ofis", premium: true },
          { key: "HOME_OFFICE", label: "Home Office" },
          { key: "KAT_OFISI", label: "Kat Ofisi" },
        ],
        requiredFields: ["roomCount", "area", "floor", "price"],
        optionalFields: ["number", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["officeType", "usageStatus", "parkingType", "heatingType"],
        featurePresets: ["commercial", "office", "interior", "parking"],
        cardTemplate: "office",
      },
      {
        key: "BENZIN_ISTASYONU",
        label: "Benzin İstasyonu",
        level1Label: "İstasyon Tipi",
        options: [
          { key: "AKARYAKIT", label: "Akaryakıt" },
          { key: "LPG", label: "LPG" },
          { key: "AKARYAKIT_LPG", label: "Akaryakıt + LPG" },
          { key: "DINLENME_TESISI", label: "Dinlenme Tesisi", premium: true },
        ],
        requiredFields: ["area", "closedArea", "price"],
        optionalFields: ["openArea", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["stationType", "usageStatus", "parkingType"],
        featurePresets: ["commercial", "station", "transport", "front"],
        cardTemplate: "station",
      },
    ],
  },
  {
    key: "ARAZI",
    label: "Arazi",
    subCategories: [
      {
        key: "ARSA",
        label: "Arsa",
        level1Label: "İmar Durumu",
        level2Label: "Parsel Durumu",
        options: [
          { key: "KONUT_IMARLI", label: "Konut İmarlı" },
          { key: "TICARI_IMARLI", label: "Ticari İmarlı" },
          { key: "SANAYI_IMARLI", label: "Sanayi İmarlı" },
          { key: "VILLA_IMARLI", label: "Villa İmarlı" },
          { key: "TURIZM_IMARLI", label: "Turizm İmarlı" },
        ],
        requiredFields: LAND_REQUIRED_FIELDS,
        optionalFields: ["pafta", "roadStatus", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["zoningType", "parcelStatus", "roadStatus"],
        featurePresets: ["land", "zoning", "landInfrastructure", "front"],
        cardTemplate: "land",
      },
      {
        key: "TARLA",
        label: "Tarla",
        level1Label: "Tarla Tipi",
        level2Label: "Yol Durumu",
        options: [
          { key: "SULU_TARLA", label: "Sulu Tarla" },
          { key: "KURU_TARLA", label: "Kuru Tarla" },
          { key: "EKILI_TARLA", label: "Ekili Tarla" },
          { key: "BOS_TARLA", label: "Boş Tarla" },
        ],
        requiredFields: LAND_REQUIRED_FIELDS,
        optionalFields: ["pafta", "roadStatus", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["fieldType", "roadStatus"],
        featurePresets: ["land", "agriculture", "landInfrastructure"],
        cardTemplate: "field",
      },
      {
        key: "BAG",
        label: "Bağ",
        level1Label: "Bağ Tipi",
        options: [
          { key: "UZUM_BAGI", label: "Üzüm Bağı" },
          { key: "HOBI_BAGI", label: "Hobi Bağı" },
          { key: "BAG_EVI_OLAN", label: "Bağ Evi Olan" },
        ],
        requiredFields: LAND_REQUIRED_FIELDS,
        optionalFields: ["pafta", "roadStatus", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["vineyardType", "roadStatus"],
        featurePresets: ["land", "agriculture", "rural"],
        cardTemplate: "vineyard",
      },
      {
        key: "BAHCE",
        label: "Bahçe",
        level1Label: "Bahçe Tipi",
        options: [
          { key: "MEYVE_BAHCESI", label: "Meyve Bahçesi" },
          { key: "HOBI_BAHCESI", label: "Hobi Bahçesi" },
          { key: "SEBZE_BAHCESI", label: "Sebze Bahçesi" },
          { key: "KARISIK_BAHCE", label: "Karışık Bahçe" },
        ],
        requiredFields: LAND_REQUIRED_FIELDS,
        optionalFields: ["pafta", "roadStatus", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["gardenType", "roadStatus"],
        featurePresets: ["land", "agriculture", "rural"],
        cardTemplate: "garden_land",
      },
      {
        key: "ZEYTINLIK",
        label: "Zeytinlik",
        level1Label: "Zeytinlik Tipi",
        options: [
          { key: "BAKIMLI_ZEYTINLIK", label: "Bakımlı Zeytinlik" },
          { key: "GENC_ZEYTINLIK", label: "Genç Zeytinlik" },
          { key: "VERIMLI_ZEYTINLIK", label: "Verimli Zeytinlik" },
        ],
        requiredFields: LAND_REQUIRED_FIELDS,
        optionalFields: ["pafta", "roadStatus", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["oliveGroveType", "roadStatus"],
        featurePresets: ["land", "agriculture", "rural"],
        cardTemplate: "olive_grove",
      },
    ],
  },
  {
    key: "KONUT_PROJELERI",
    label: "Konut Projeleri",
    subCategories: [
      {
        key: "KONUT_PROJESI",
        label: "Konut Projesi",
        level1Label: "Proje Tipi",
        level2Label: "Proje Durumu",
        options: [
          { key: "APARTMAN_PROJESI", label: "Apartman Projesi" },
          { key: "SITE_PROJESI", label: "Site Projesi" },
          { key: "KARMA_KONUT_PROJESI", label: "Karma Konut Projesi" },
        ],
        requiredFields: ["area", "price"],
        optionalFields: ["roomCount", "unitCount", "deliveryDate", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["projectStatus", "heatingType", "parkingType"],
        featurePresets: ["project", "konut", "exterior", "parking"],
        cardTemplate: "project",
      },
      {
        key: "REZIDANS_PROJESI",
        label: "Rezidans Projesi",
        level1Label: "Rezidans Proje Tipi",
        level2Label: "Proje Durumu",
        options: [
          { key: "STANDART_REZIDANS_PROJESI", label: "Standart Rezidans Projesi" },
          { key: "LUKS_REZIDANS_PROJESI", label: "Lüks Rezidans Projesi", premium: true },
          { key: "KARMA_REZIDANS_PROJESI", label: "Karma Rezidans Projesi" },
        ],
        requiredFields: ["area", "price"],
        optionalFields: ["roomCount", "unitCount", "deliveryDate", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["projectStatus", "parkingType"],
        featurePresets: ["project", "residence", "luxury", "parking"],
        cardTemplate: "project_residence",
      },
      {
        key: "VILLA_PROJESI",
        label: "Villa Projesi",
        level1Label: "Villa Proje Tipi",
        level2Label: "Nizam Tipi",
        level3Label: "Proje Durumu",
        options: [
          { key: "TEK_KATLI_VILLA_PROJESI", label: "Tek Katlı Villa Projesi" },
          { key: "DUBLEKS_VILLA_PROJESI", label: "Dubleks Villa Projesi" },
          { key: "TRIPLEKS_VILLA_PROJESI", label: "Tripleks Villa Projesi" },
          { key: "KARMA_VILLA_PROJESI", label: "Karma Villa Projesi" },
        ],
        requiredFields: ["area", "price"],
        optionalFields: ["roomCount", "unitCount", "deliveryDate", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["villaType", "layoutType", "projectStatus", "parkingType"],
        featurePresets: ["project", "villa", "garden", "parking"],
        cardTemplate: "project_villa",
      },
    ],
  },
  {
    key: "TURISTIK_TESIS",
    label: "Turistik Tesis",
    subCategories: [
      {
        key: "OTEL",
        label: "Otel",
        level1Label: "Otel Alt Tipi",
        level2Label: "Tesis Durumu",
        options: [
          { key: "OTEL", label: "Otel" },
          { key: "APART_OTEL", label: "Apart Otel" },
          { key: "BUTIK_OTEL", label: "Butik Otel", premium: true },
          { key: "MOTEL", label: "Motel" },
          { key: "TERMAL_OTEL", label: "Termal Otel", premium: true },
        ],
        requiredFields: TOURISM_REQUIRED_FIELDS,
        optionalFields: ["openArea", "closedArea", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["hotelSubType", "facilityStatus", "parkingType"],
        featurePresets: ["tourism", "hotel", "view", "parking"],
        cardTemplate: "hotel",
      },
      {
        key: "PANSIYON",
        label: "Pansiyon",
        level1Label: "Pansiyon Tipi",
        options: [
          { key: "AILE_PANSIYONU", label: "Aile Pansiyonu" },
          { key: "BUTIK_PANSIYON", label: "Butik Pansiyon" },
          { key: "APART_PANSIYON", label: "Apart Pansiyon" },
        ],
        requiredFields: TOURISM_REQUIRED_FIELDS,
        optionalFields: ["openArea", "closedArea", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["pensionType", "parkingType"],
        featurePresets: ["tourism", "hotel", "view"],
        cardTemplate: "pension",
      },
      {
        key: "KAMP_YERI",
        label: "Kamp Yeri",
        level1Label: "Kamp Tipi",
        options: [
          { key: "CADIR_KAMPI", label: "Çadır Kampı" },
          { key: "KARAVAN_KAMPI", label: "Karavan Kampı" },
          { key: "KARMA_KAMP", label: "Karma Kamp" },
          { key: "GLAMPING", label: "Glamping", premium: true },
        ],
        requiredFields: ["openArea", "price"],
        optionalFields: ["closedArea", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["campType", "parkingType"],
        featurePresets: ["tourism", "camp", "landInfrastructure", "view"],
        cardTemplate: "camp",
      },
      {
        key: "TATIL_KOYU",
        label: "Tatil Köyü",
        level1Label: "Tesis Tipi",
        options: [
          { key: "TATIL_KOYU", label: "Tatil Köyü" },
          { key: "BUNGALOV_TESISI", label: "Bungalov Tesisi", premium: true },
          { key: "RESORT_TESIS", label: "Resort Tesis", premium: true },
        ],
        requiredFields: ["openArea", "closedArea", "roomCount", "price"],
        optionalFields: ["bedCount", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["resortType", "parkingType"],
        featurePresets: ["tourism", "resort", "luxury", "view"],
        cardTemplate: "resort",
      },
      {
        key: "DEVRE_MULK",
        label: "Devre Mülk",
        level1Label: "Dönem Tipi",
        level2Label: "Kullanım Hakkı",
        options: [
          { key: "YAZ_DONEMI", label: "Yaz Dönemi" },
          { key: "KIS_DONEMI", label: "Kış Dönemi" },
          { key: "BAYRAM_DONEMI", label: "Bayram Dönemi" },
          { key: "ESNEK_DONEM", label: "Esnek Dönem" },
        ],
        requiredFields: ["roomCount", "area", "price"],
        optionalFields: ["period", "usageRight", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["periodType", "usageRight"],
        featurePresets: ["tourism", "timeshare", "view"],
        cardTemplate: "timeshare",
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
        level1Label: "Devre Tipi",
        level2Label: "Dönem Tipi",
        level3Label: "Kullanım Hakkı",
        options: [
          { key: "YAZLIK_DEVRE", label: "Yazlık Devre" },
          { key: "TERMAL_DEVRE", label: "Termal Devre" },
          { key: "OTEL_DEVRE", label: "Otel Devre" },
          { key: "TATIL_KOYU_DEVRE", label: "Tatil Köyü Devre" },
        ],
        requiredFields: ["roomCount", "area", "price"],
        optionalFields: ["period", "usageRight", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["timeshareType", "periodType", "usageRight"],
        featurePresets: ["timeshare", "tourism", "view", "transport"],
        cardTemplate: "timeshare",
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
        level1Label: "Premium Tipi",
        level2Label: "Sunum Tipi",
        level3Label: "Portföy Seviyesi",
        options: [
          { key: "ULTRA_LUKS", label: "Ultra Lüks", premium: true },
          { key: "YATIRIMLIK_PREMIUM", label: "Yatırımlık Premium", premium: true },
          { key: "DENIZ_SIFIR", label: "Denize Sıfır", premium: true },
          { key: "PANORAMIK_MANZARA", label: "Panoramik Manzara", premium: true },
          { key: "OZEL_ADA", label: "Özel Ada", premium: true },
          { key: "GOL_CIFTLIK_PORTFOYU", label: "Göl / Çiftlik Portföyü", premium: true },
          { key: "GIZLI_PORTFOY", label: "Gizli Portföy", premium: true },
        ],
        requiredFields: ["area", "price"],
        optionalFields: ["portfolioStory", "privateNote", ...COMMON_OPTIONAL_FIELDS],
        specialFields: ["presentationType", "portfolioLevel"],
        featurePresets: ["premium", "luxury", "view", "eph"],
        cardTemplate: "premium",
      },
    ],
  },
];

export function getSelectionMainCategory(mainCategoryKey?: string) {
  return (
    STOK_SELECTION_TREE.find((category) => category.key === mainCategoryKey) ||
    STOK_SELECTION_TREE[0]
  );
}

export function getSelectionSubCategory(mainCategoryKey?: string, subCategoryKey?: string) {
  const mainCategory = getSelectionMainCategory(mainCategoryKey);

  return (
    mainCategory.subCategories.find((subCategory) => subCategory.key === subCategoryKey) ||
    mainCategory.subCategories[0]
  );
}

export function getLevel1Options(mainCategoryKey?: string, subCategoryKey?: string) {
  return getSelectionSubCategory(mainCategoryKey, subCategoryKey).options;
}

export function getLevel2Options(
  mainCategoryKey?: string,
  subCategoryKey?: string,
  level1Key?: string,
) {
  const level1 = getLevel1Options(mainCategoryKey, subCategoryKey).find(
    (option) => option.key === level1Key,
  );

  return level1?.children || [];
}

export function getLevel3Options(
  mainCategoryKey?: string,
  subCategoryKey?: string,
  level1Key?: string,
  level2Key?: string,
) {
  const level2 = getLevel2Options(mainCategoryKey, subCategoryKey, level1Key).find(
    (option) => option.key === level2Key,
  );

  return level2?.children || [];
}

export function getSelectionPath(params: {
  mainCategoryKey?: string;
  subCategoryKey?: string;
  level1Key?: string;
  level2Key?: string;
  level3Key?: string;
}): StokSelectionPath {
  const mainCategory = getSelectionMainCategory(params.mainCategoryKey);
  const subCategory = getSelectionSubCategory(mainCategory.key, params.subCategoryKey);
  const level1 = subCategory.options.find((option) => option.key === params.level1Key) || subCategory.options[0];
  const level2Options = level1?.children || [];
  const level2 = level2Options.find((option) => option.key === params.level2Key) || level2Options[0];
  const level3Options = level2?.children || [];
  const level3 = level3Options.find((option) => option.key === params.level3Key) || level3Options[0];

  return {
    mainCategoryKey: mainCategory.key,
    mainCategoryLabel: mainCategory.label,
    subCategoryKey: subCategory.key,
    subCategoryLabel: subCategory.label,
    level1Key: level1?.key,
    level1Label: level1?.label,
    level2Key: level2?.key,
    level2Label: level2?.label,
    level3Key: level3?.key,
    level3Label: level3?.label,
    requiredFields: subCategory.requiredFields,
    optionalFields: subCategory.optionalFields,
    specialFields: subCategory.specialFields,
    featurePresets: subCategory.featurePresets,
    cardTemplate: subCategory.cardTemplate,
    note: subCategory.note,
  };
}

export function shouldShowSelectionField(
  params: {
    mainCategoryKey?: string;
    subCategoryKey?: string;
    level1Key?: string;
    level2Key?: string;
    level3Key?: string;
  },
  fieldKey: string,
) {
  const path = getSelectionPath(params);

  return path.requiredFields.includes(fieldKey) || path.optionalFields.includes(fieldKey);
}

export function getSelectionFeaturePresets(params: {
  mainCategoryKey?: string;
  subCategoryKey?: string;
  level1Key?: string;
  level2Key?: string;
  level3Key?: string;
}) {
  return getSelectionPath(params).featurePresets;
}
