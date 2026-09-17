import { UnitType } from '@prisma/client';

export const CARD_PROFILE_CODES = [
  'DAIRE',
  'VILLA_MUSTAKIL',
  'ARSA_IMARLI',
  'SANAYI_ARSASI',
  'TARLA',
  'BAG',
  'BAHCE',
  'ZEYTINLIK',
  'DUKKAN',
  'OFIS',
  'FABRIKA',
  'DEPO',
  'OTEL_TURISTIK',
  'PROJE_INSAAT',
] as const;

export type CardProfileCode = (typeof CARD_PROFILE_CODES)[number];
export type CardOverrideLevel = 'Yok' | 'Hafif' | 'Özel' | 'Legacy';

export type CardProfileSlot = {
  key: string;
  label: string;
  sourceKeys: readonly string[];
};

export type CardProfileDefinition = {
  code: CardProfileCode;
  name: string;
  slots: readonly CardProfileSlot[];
  extraDetailFields: readonly string[];
  note: string;
};

export type UnitTypeCardProfileBinding = {
  unitType: UnitType;
  userLabel: string;
  profileCode: CardProfileCode;
  overridePackage: string;
  overrideLevel: CardOverrideLevel;
  note: string;
  legacyAliasOf?: UnitType;
};

function slot(
  key: string,
  label: string,
  sourceKeys: readonly string[] = [key],
): CardProfileSlot {
  return { key, label, sourceKeys };
}

export const CARD_PROFILES: Record<CardProfileCode, CardProfileDefinition> = {
  DAIRE: {
    code: 'DAIRE',
    name: 'Daire',
    slots: [
      slot('roomCount', 'Oda Sayısı'),
      slot('netArea', 'Net m²'),
      slot('floor', 'Bulunduğu Kat', ['floorLabel', 'floor']),
      slot('buildingAge', 'Bina Yaşı'),
      slot('heatingType', 'Isınma Türü'),
      slot('parkingType', 'Otopark'),
      slot('facade', 'Cephe', ['facade', 'facades']),
      slot('elevatorStatus', 'Asansör', ['elevatorStatus', 'elevator']),
    ],
    extraDetailFields: ['grossArea', 'totalFloors'],
    note: 'Daire 8 temel bilgi standardı.',
  },
  VILLA_MUSTAKIL: {
    code: 'VILLA_MUSTAKIL',
    name: 'Villa / Müstakil',
    slots: [
      slot('roomCount', 'Oda Sayısı'),
      slot('netArea', 'Net Kapalı Alan m²'),
      slot('landArea', 'Arsa m²'),
      slot('structureType', 'Villa Tipi / Yapı Tipi', [
        'structureType',
        'villaType',
        'homeType',
        'buildingStyle',
      ]),
      slot('buildingAge', 'Bina Yaşı'),
      slot('poolType', 'Havuz'),
      slot('gardenStatus', 'Bahçe'),
      slot('parkingType', 'Otopark'),
    ],
    extraDetailFields: ['heatingType', 'siteStatus'],
    note:
      'Klasik kat sayısı kartın temel slotu değildir. Villa için Villa Tipi; müstakil ve diğer konut yapıları için Yapı Tipi kullanılır.',
  },
  ARSA_IMARLI: {
    code: 'ARSA_IMARLI',
    name: 'Arsa (İmarlı)',
    slots: [
      slot('area', 'm²'),
      slot('zoningType', 'İmar Türü'),
      slot('zoningKaks', 'Emsal (KAKS)'),
      slot('zoningTaks', 'TAKS'),
      slot('floorPermit', 'Kat İzni / Hmax', ['floorPermit', 'hmax']),
      slot('facade', 'Cephe', ['facade', 'facades']),
      slot('roadStatus', 'Yol Durumu', ['roadStatus', 'cadastralRoadStatus']),
      slot('infrastructureStatus', 'Altyapı Durumu'),
    ],
    extraDetailFields: ['adaNo', 'parselNo', 'electricityStatus', 'waterStatus'],
    note: 'Ada/parsel genel tanıtım kartında varsayılan olarak gösterilmez.',
  },
  SANAYI_ARSASI: {
    code: 'SANAYI_ARSASI',
    name: 'Sanayi Arsası',
    slots: [
      slot('area', 'm²'),
      slot('industrialZoning', 'Sanayi İmarı'),
      slot('zoningKaks', 'Emsal'),
      slot('electricityPower', 'Elektrik Gücü'),
      slot('naturalGasStatus', 'Doğalgaz'),
      slot('tirEntranceStatus', 'Tır Girişi'),
      slot('roadWidth', 'Yol Genişliği'),
      slot('osbDistance', 'OSB Yakınlığı'),
    ],
    extraDetailFields: [],
    note: 'Sanayi arsası 8 temel bilgi standardı.',
  },
  TARLA: {
    code: 'TARLA',
    name: 'Tarla',
    slots: [
      slot('area', 'm²'),
      slot('titleDeedType', 'Tapu Niteliği'),
      slot('agricultureType', 'Tarım Türü'),
      slot('waterStatus', 'Su Durumu'),
      slot('electricityStatus', 'Elektrik Durumu'),
      slot('roadFrontage', 'Yola Cephe'),
      slot('villageDistance', 'Köye Uzaklık'),
      slot('altitude', 'Rakım'),
    ],
    extraDetailFields: ['adaNo', 'parselNo', 'districtCenterDistance'],
    note: 'Ada/parsel kartta değil detayda tutulur.',
  },
  BAG: {
    code: 'BAG',
    name: 'Bağ',
    slots: [
      slot('area', 'm²'),
      slot('cropType', 'Ürün Türü'),
      slot('vineyardArea', 'Bağ Alanı'),
      slot('irrigationStatus', 'Sulama'),
      slot('electricityStatus', 'Elektrik'),
      slot('roadStatus', 'Yol'),
      slot('warehouseStatus', 'Depo'),
      slot('fencingStatus', 'Çit Durumu'),
    ],
    extraDetailFields: [],
    note: 'Bağ 8 temel bilgi standardı.',
  },
  BAHCE: {
    code: 'BAHCE',
    name: 'Bahçe',
    slots: [
      slot('area', 'm²'),
      slot('treeCount', 'Ağaç Sayısı'),
      slot('cropType', 'Ürün Türü'),
      slot('irrigationStatus', 'Sulama'),
      slot('electricityStatus', 'Elektrik'),
      slot('roadStatus', 'Yol'),
      slot('warehouseStatus', 'Depo'),
      slot('fencingStatus', 'Çevreleme Durumu'),
    ],
    extraDetailFields: [],
    note: 'Bahçe 8 temel bilgi standardı.',
  },
  ZEYTINLIK: {
    code: 'ZEYTINLIK',
    name: 'Zeytinlik',
    slots: [
      slot('area', 'm²'),
      slot('oliveTreeCount', 'Zeytin Ağacı Sayısı'),
      slot('averageTreeAge', 'Ağaç Yaş Ortalaması'),
      slot('irrigationStatus', 'Sulama'),
      slot('electricityStatus', 'Elektrik'),
      slot('roadStatus', 'Yol'),
      slot('yieldStatus', 'Verim Durumu'),
      slot('harvestInfo', 'Hasat Bilgisi'),
    ],
    extraDetailFields: [],
    note: 'Zeytinlik 8 temel bilgi standardı.',
  },
  DUKKAN: {
    code: 'DUKKAN',
    name: 'Dükkan / Mağaza',
    slots: [
      slot('area', 'm²'),
      slot('floor', 'Kat', ['floorLabel', 'floor']),
      slot('facade', 'Cephe', ['facade', 'facades']),
      slot('streetFrontageStatus', 'Cadde Üzeri'),
      slot('buildingAge', 'Bina Yaşı'),
      slot('heatingType', 'Isınma Türü'),
      slot('parkingType', 'Otopark'),
      slot('usageStatus', 'Kullanım Durumu'),
    ],
    extraDetailFields: [],
    note: 'Showroom benzeri alt türler kontrollü override kullanabilir.',
  },
  OFIS: {
    code: 'OFIS',
    name: 'Ofis / Büro',
    slots: [
      slot('area', 'm²'),
      slot('floor', 'Kat', ['floorLabel', 'floor']),
      slot('roomCount', 'Oda Sayısı'),
      slot('buildingAge', 'Bina Yaşı'),
      slot('heatingType', 'Isınma Türü'),
      slot('parkingType', 'Otopark'),
      slot('elevatorStatus', 'Asansör', ['elevatorStatus', 'elevator']),
      slot('usageStatus', 'Kullanım Durumu'),
    ],
    extraDetailFields: [],
    note: 'Home office / plaza katı alt türleri kontrollü override kullanabilir.',
  },
  FABRIKA: {
    code: 'FABRIKA',
    name: 'Fabrika / Üretim Tesisi',
    slots: [
      slot('closedArea', 'Kapalı Alan'),
      slot('openArea', 'Açık Alan'),
      slot('electricityPower', 'Elektrik Gücü'),
      slot('ceilingHeight', 'Tavan Yüksekliği'),
      slot('tirEntranceStatus', 'Tır Girişi'),
      slot('loadingRampStatus', 'Yükleme Rampası'),
      slot('officeArea', 'Ofis Alanı'),
      slot('fireSystemStatus', 'Yangın Sistemi'),
    ],
    extraDetailFields: [],
    note: 'Üretim ve lojistik karar bilgileri öne çıkar.',
  },
  DEPO: {
    code: 'DEPO',
    name: 'Depo / Antrepo',
    slots: [
      slot('closedArea', 'Kapalı Alan'),
      slot('openArea', 'Açık Alan'),
      slot('ceilingHeight', 'Tavan Yüksekliği'),
      slot('shelvingSystemStatus', 'Raf Sistemi'),
      slot('tirEntranceStatus', 'Tır Girişi'),
      slot('loadingArea', 'Yükleme Alanı'),
      slot('fireSystemStatus', 'Yangın Sistemi'),
      slot('securityStatus', 'Güvenlik'),
    ],
    extraDetailFields: [],
    note: 'Lojistik merkezi alt profili kontrollü override kullanabilir.',
  },
  OTEL_TURISTIK: {
    code: 'OTEL_TURISTIK',
    name: 'Otel / Turistik Tesis',
    slots: [
      slot('roomCount', 'Oda Sayısı'),
      slot('bedCount', 'Yatak Kapasitesi'),
      slot('tourismCategory', 'Yıldız / Sınıf'),
      slot('operatingStatus', 'Faaliyet Durumu'),
      slot('licenseStatus', 'Ruhsat Durumu'),
      slot('occupancyRate', 'Doluluk Oranı'),
      slot('locationType', 'Konum Türü'),
      slot('distanceInfo', 'Uzaklık Bilgisi'),
    ],
    extraDetailFields: ['annualTurnover'],
    note: 'Yıllık ciro hassas ticari veridir ve genel tanıtım kartında gösterilmez.',
  },
  PROJE_INSAAT: {
    code: 'PROJE_INSAAT',
    name: 'Proje / İnşaat',
    slots: [
      slot('unitCount', 'Toplam Bağımsız Bölüm'),
      slot('unitsForSale', 'Satıştaki Bölüm'),
      slot('deliveryDate', 'Teslim Tarihi'),
      slot('projectStatus', 'İnşaat Seviyesi'),
      slot('landArea', 'Arsa m²'),
      slot('totalFloors', 'Kat Sayısı'),
      slot('licenseStatus', 'Ruhsat Durumu'),
      slot('presaleStatus', 'Ön Satış Durumu'),
    ],
    extraDetailFields: [],
    note: 'Proje türüne göre alt profil kontrollü override kullanabilir.',
  },
};

function binding(
  userLabel: string,
  profileCode: CardProfileCode,
  overridePackage: string,
  overrideLevel: CardOverrideLevel,
  note: string,
  legacyAliasOf?: UnitType,
): Omit<UnitTypeCardProfileBinding, 'unitType'> {
  return {
    userLabel,
    profileCode,
    overridePackage,
    overrideLevel,
    note,
    ...(legacyAliasOf ? { legacyAliasOf } : {}),
  };
}

const CANONICAL_BINDING_DATA: Partial<
  Record<UnitType, Omit<UnitTypeCardProfileBinding, 'unitType'>>
> = {
  [UnitType.DAIRE]: binding('Daire', 'DAIRE', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.REZIDANS]: binding('Rezidans', 'DAIRE', 'RESIDENCE', 'Hafif', 'Daire profilinden türetilir; site/rezidans hizmetleri için 1-2 slot değişebilir.'),
  [UnitType.VILLA]: binding('Villa', 'VILLA_MUSTAKIL', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.YAZLIK]: binding('Yazlık', 'DAIRE', 'YAZLIK', 'Özel', 'Yazlık tipinde denize mesafe/site/havuz gibi karar alanları profile göre uyarlanır.'),
  [UnitType.VILLA_TERAS]: binding('Teraslı Villa', 'VILLA_MUSTAKIL', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.VILLA_GARDEN]: binding('Bahçeli Villa', 'VILLA_MUSTAKIL', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.DUBLEKS_VILLA]: binding('Dubleks Villa', 'VILLA_MUSTAKIL', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.TRIPLEKS_VILLA]: binding('Tripleks Villa', 'VILLA_MUSTAKIL', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.MUSTAK_EV]: binding('Müstakil Ev', 'VILLA_MUSTAKIL', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.KOY_EVI]: binding('Köy Evi', 'VILLA_MUSTAKIL', 'KIRSAL_KONUT', 'Hafif', 'Yol, su, elektrik ve arsa/bahçe bilgileri gerektiğinde 1-2 slotta öne alınır.'),
  [UnitType.TAS_EV]: binding('Taş Ev', 'VILLA_MUSTAKIL', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.AHSAP_EV]: binding('Ahşap Ev', 'VILLA_MUSTAKIL', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.PREFABRIK_EV]: binding('Prefabrik Ev', 'VILLA_MUSTAKIL', 'MODULER_KONUT', 'Özel', 'Yapı sistemi, ruhsat/kullanım ve altyapı alanları Villa/Müstakil profilinde özel varyant kullanır.'),
  [UnitType.CELIK_KONSTRUKSIYON]: binding('Çelik Konstrüksiyon Ev', 'VILLA_MUSTAKIL', 'MODULER_KONUT', 'Özel', 'Yapı sistemi, ruhsat/kullanım ve altyapı alanları Villa/Müstakil profilinde özel varyant kullanır.'),
  [UnitType.TINY_HOUSE]: binding('Tiny House', 'VILLA_MUSTAKIL', 'MODULER_KONUT', 'Özel', 'Yapı sistemi, ruhsat/kullanım ve altyapı alanları Villa/Müstakil profilinde özel varyant kullanır.'),
  [UnitType.BUNGALOV]: binding('Bungalov', 'VILLA_MUSTAKIL', 'MODULER_KONUT', 'Özel', 'Yapı sistemi, ruhsat/kullanım ve altyapı alanları Villa/Müstakil profilinde özel varyant kullanır.'),
  [UnitType.DAG_EVI]: binding('Dağ Evi', 'VILLA_MUSTAKIL', 'KIRSAL_KONUT', 'Hafif', 'Yol, su, elektrik ve arsa/bahçe bilgileri gerektiğinde 1-2 slotta öne alınır.'),
  [UnitType.YAYLA_EVI]: binding('Yayla Evi', 'VILLA_MUSTAKIL', 'KIRSAL_KONUT', 'Hafif', 'Yol, su, elektrik ve arsa/bahçe bilgileri gerektiğinde 1-2 slotta öne alınır.'),
  [UnitType.GOL_EVI]: binding('Göl Evi', 'VILLA_MUSTAKIL', 'KIRSAL_KONUT', 'Hafif', 'Yol, su, elektrik ve arsa/bahçe bilgileri gerektiğinde 1-2 slotta öne alınır.'),
  [UnitType.BAG_EVI]: binding('Bağ Evi', 'VILLA_MUSTAKIL', 'KIRSAL_KONUT', 'Hafif', 'Yol, su, elektrik ve arsa/bahçe bilgileri gerektiğinde 1-2 slotta öne alınır.'),
  [UnitType.CIFTLIK_EVI]: binding('Çiftlik Evi', 'VILLA_MUSTAKIL', 'KIRSAL_KONUT', 'Hafif', 'Yol, su, elektrik ve arsa/bahçe bilgileri gerektiğinde 1-2 slotta öne alınır.'),
  [UnitType.HOBI_BAHCESI_EVI]: binding('Hobi Bahçesi Evi', 'VILLA_MUSTAKIL', 'KIRSAL_KONUT', 'Hafif', 'Yol, su, elektrik ve arsa/bahçe bilgileri gerektiğinde 1-2 slotta öne alınır.'),
  [UnitType.MAGARA_EV]: binding('Mağara Ev', 'VILLA_MUSTAKIL', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.KOSK_YALI]: binding('Köşk / Yalı', 'VILLA_MUSTAKIL', 'PREMIUM_MUSTAKIL', 'Hafif', 'Villa/Müstakil profilinden türetilir; deniz/iskeletarihi yapı gibi nitelikler için slot değişebilir.'),
  [UnitType.YALI]: binding('Yalı', 'VILLA_MUSTAKIL', 'PREMIUM_MUSTAKIL', 'Hafif', 'Villa/Müstakil profilinden türetilir; deniz/iskeletarihi yapı gibi nitelikler için slot değişebilir.'),
  [UnitType.YALI_DAIRESI]: binding('Yalı Dairesi', 'DAIRE', 'PREMIUM_DAIRE', 'Hafif', 'Daire profilinden türetilir; teras/galeri/cephe gibi premium nitelikler öne alınabilir.'),
  [UnitType.KONAK]: binding('Konak', 'VILLA_MUSTAKIL', 'PREMIUM_MUSTAKIL', 'Hafif', 'Villa/Müstakil profilinden türetilir; deniz/iskeletarihi yapı gibi nitelikler için slot değişebilir.'),
  [UnitType.PENTHOUSE]: binding('Penthouse', 'DAIRE', 'PREMIUM_DAIRE', 'Hafif', 'Daire profilinden türetilir; teras/galeri/cephe gibi premium nitelikler öne alınabilir.'),
  [UnitType.LOFT]: binding('Loft', 'DAIRE', 'PREMIUM_DAIRE', 'Hafif', 'Daire profilinden türetilir; teras/galeri/cephe gibi premium nitelikler öne alınabilir.'),
  [UnitType.LOFT_DUBLEKS]: binding('Loft Dubleks', 'DAIRE', 'PREMIUM_DAIRE', 'Hafif', 'Daire profilinden türetilir; teras/galeri/cephe gibi premium nitelikler öne alınabilir.'),
  [UnitType.MARINA_RESIDENCE]: binding('Marina Residence', 'DAIRE', 'RESIDENCE', 'Hafif', 'Daire profilinden türetilir; site/rezidans hizmetleri için 1-2 slot değişebilir.'),
  [UnitType.GOLF_RESIDENCE]: binding('Golf Residence', 'DAIRE', 'RESIDENCE', 'Hafif', 'Daire profilinden türetilir; site/rezidans hizmetleri için 1-2 slot değişebilir.'),
  [UnitType.SAHIL_RESIDENCE]: binding('Sahil Residence', 'DAIRE', 'RESIDENCE', 'Hafif', 'Daire profilinden türetilir; site/rezidans hizmetleri için 1-2 slot değişebilir.'),
  [UnitType.DAG_RESIDENCE]: binding('Dağ Residence', 'DAIRE', 'RESIDENCE', 'Hafif', 'Daire profilinden türetilir; site/rezidans hizmetleri için 1-2 slot değişebilir.'),
  [UnitType.SKY_RESIDENCE]: binding('Sky Residence', 'DAIRE', 'RESIDENCE', 'Hafif', 'Daire profilinden türetilir; site/rezidans hizmetleri için 1-2 slot değişebilir.'),
  [UnitType.OZEL_HAVUZLU_VILLA]: binding('Özel Havuzlu Villa', 'VILLA_MUSTAKIL', 'LUKS_VILLA', 'Hafif', 'Alt türün isminde sabit olan özellik tekrar edilmez; yerine başka kritik karar bilgisi gösterilebilir.'),
  [UnitType.OZEL_ISKELELI_VILLA]: binding('Özel İskeleli Villa', 'VILLA_MUSTAKIL', 'LUKS_VILLA', 'Hafif', 'Alt türün isminde sabit olan özellik tekrar edilmez; yerine başka kritik karar bilgisi gösterilebilir.'),
  [UnitType.AKILLI_VILLA]: binding('Akıllı Villa', 'VILLA_MUSTAKIL', 'LUKS_VILLA', 'Hafif', 'Alt türün isminde sabit olan özellik tekrar edilmez; yerine başka kritik karar bilgisi gösterilebilir.'),
  [UnitType.ULTRA_LUKS_VILLA]: binding('Ultra Lüks Villa', 'VILLA_MUSTAKIL', 'LUKS_VILLA', 'Hafif', 'Alt türün isminde sabit olan özellik tekrar edilmez; yerine başka kritik karar bilgisi gösterilebilir.'),
  [UnitType.DUKKAN_MAGAZA]: binding('Dükkan / Mağaza', 'DUKKAN', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.OFIS_BURO]: binding('Ofis / Büro', 'OFIS', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.FABRIKA_URETIM_TESISI]: binding('Fabrika / Üretim Tesisi', 'FABRIKA', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.ATOLYE]: binding('Atölye', 'FABRIKA', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.TICARI_ISLETME]: binding('Ticari İşletme', 'DUKKAN', 'TICARI_ISLETME', 'Özel', 'Faaliyet türü seçilmeden tek 8\'li yeterli değildir; işletme alt türüne göre özel varyant kullanılır.'),
  [UnitType.HOME_OFFICE]: binding('Home Office', 'OFIS', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.PLAZA_KATI]: binding('Plaza Katı', 'OFIS', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.SHOWROOM]: binding('Showroom', 'DUKKAN', 'SHOWROOM', 'Hafif', 'Dükkan/Mağaza profilinden türetilir; vitrin/cephe/tavan yüksekliği öne alınabilir.'),
  [UnitType.IS_HANI_KATI]: binding('İş Hanı Katı', 'OFIS', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.IS_MERKEZI]: binding('İş Merkezi', 'OFIS', 'IS_MERKEZI', 'Hafif', 'Ofis/Büro profilinden türetilir; toplam kat/bağımsız bölüm/otopark bilgileri öne alınabilir.'),
  [UnitType.PAYLASIMLI_OFIS]: binding('Paylaşımlı Ofis', 'OFIS', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.DEPO_ANTREPO]: binding('Depo / Antrepo', 'DEPO', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.LOJISTIK_MERKEZI]: binding('Lojistik Merkezi', 'DEPO', 'LOJISTIK_MERKEZI', 'Hafif', 'Depo/Antrepo profilinden türetilir; rampa/kapı sayısı ve saha kapasitesi öne alınabilir.'),
  [UnitType.FABRIKA_ATOLYE]: binding('Fabrika / Atölye', 'FABRIKA', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.URETIM_TESISI]: binding('Üretim Tesisi', 'FABRIKA', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.AKARYAKIT_ISTASYONU]: binding('Akaryakıt İstasyonu', 'DUKKAN', 'AKARYAKIT', 'Özel', 'Pompa/ada sayısı, tank kapasitesi, yol cephesi, lisans ve market alanı odaklı özel varyant kullanır.'),
  [UnitType.OTEL_PANSIYON]: binding('Otel / Pansiyon', 'OTEL_TURISTIK', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.APART_OTEL]: binding('Apart Otel', 'OTEL_TURISTIK', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.OTEL]: binding('Otel', 'OTEL_TURISTIK', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.BUTIK_OTEL]: binding('Butik Otel', 'OTEL_TURISTIK', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.MOTEL]: binding('Motel', 'OTEL_TURISTIK', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.PANSIYON]: binding('Pansiyon', 'OTEL_TURISTIK', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.KAMP_YERI]: binding('Kamp Yeri', 'OTEL_TURISTIK', 'KAMP_YERI', 'Özel', 'Parsel/alan, ünite kapasitesi, altyapı, duş/WC, elektrik-su ve ruhsat odaklı özel varyant kullanır.'),
  [UnitType.TATIL_KOYU]: binding('Tatil Köyü', 'OTEL_TURISTIK', 'TATIL_KOYU', 'Özel', 'Otel/Turistik profile bağlıdır; toplam ünite, yatak, arsa, havuz/plaj, aktivite ve ruhsat odaklı varyant kullanır.'),
  [UnitType.RESTORAN]: binding('Restoran', 'DUKKAN', 'RESTORAN_KAFE', 'Özel', 'Kapalı/açık alan, oturma kapasitesi, mutfak, baca, teras ve ruhsat odaklı özel varyant kullanır.'),
  [UnitType.KAFE]: binding('Kafe', 'DUKKAN', 'RESTORAN_KAFE', 'Özel', 'Kapalı/açık alan, oturma kapasitesi, mutfak, baca, teras ve ruhsat odaklı özel varyant kullanır.'),
  [UnitType.DUGUN_SALONU]: binding('Düğün Salonu', 'DUKKAN', 'DUGUN_ETKINLIK', 'Özel', 'Kapasite, açık/kapalı alan, sahne, servis, otopark ve ruhsat odaklı özel varyant kullanır.'),
  [UnitType.SPOR_TESISI]: binding('Spor Tesisi', 'DUKKAN', 'SPOR_TESISI', 'Özel', 'Tesis türü, kapalı/açık alan, kapasite, soyunma, otopark ve ruhsat odaklı özel varyant kullanır.'),
  [UnitType.OKUL_EGITIM_TESISI]: binding('Okul / Eğitim Tesisi', 'DUKKAN', 'EGITIM_TESISI', 'Özel', 'Derslik, öğrenci kapasitesi, kapalı/açık alan, bahçe, servis ve ruhsat odaklı özel varyant kullanır.'),
  [UnitType.HASTANE_SAGLIK_TESISI]: binding('Hastane / Sağlık Tesisi', 'DUKKAN', 'SAGLIK_TESISI', 'Özel', 'Yatak/oda, kapalı alan, otopark, erişim, teknik altyapı ve ruhsat odaklı özel varyant kullanır.'),
  [UnitType.KOMPLE_BINA]: binding('Komple Bina', 'OFIS', 'KOMPLE_BINA', 'Özel', 'Ofis/Büro ana profiline bağlıdır; toplam kapalı alan, kat, bağımsız bölüm, kullanım, asansör ve otopark odaklı özel varyant kullanır.'),
  [UnitType.ARSA]: binding('Arsa', 'ARSA_IMARLI', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.KONUT_ARSASI]: binding('Konut Arsası', 'ARSA_IMARLI', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.VILLA_ARSASI]: binding('Villa Arsası', 'ARSA_IMARLI', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.TICARI_ARSA]: binding('Ticari Arsa', 'ARSA_IMARLI', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.SANAYI_ARSASI]: binding('Sanayi Arsası', 'SANAYI_ARSASI', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.TURIZM_IMARLI_ARSA]: binding('Turizm İmarlı Arsa', 'ARSA_IMARLI', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.TARLA]: binding('Tarla', 'TARLA', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.BAHCE]: binding('Bahçe', 'BAHCE', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.BAG]: binding('Bağ', 'BAG', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.ZEYTINLIK]: binding('Zeytinlik', 'ZEYTINLIK', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.MEYVE_BAHCESI]: binding('Meyve Bahçesi', 'BAHCE', 'MEYVE_BAHCESI', 'Hafif', 'Bahçe profilinden türetilir; ağaç türü/yaşı/verim bilgileri önceliklendirilebilir.'),
  [UnitType.SERA]: binding('Sera', 'TARLA', 'SERA', 'Özel', 'Tarla ana profiline bağlıdır; sera alanı, sera tipi, su/sulama, ısıtma ve enerji odaklı özel varyant kullanır.'),
  [UnitType.BESI_CIFTLIGI]: binding('Besi Çiftliği', 'TARLA', 'BESI_CIFTLIGI', 'Özel', 'Tarla ana profiline bağlıdır; kapalı alan, hayvan kapasitesi, su, yem/depo ve ulaşım odaklı özel varyant kullanır.'),
  [UnitType.ORMAN_ARAZISI]: binding('Orman Arazisi', 'TARLA', 'ORMAN_ARAZISI', 'Özel', 'Tarla ana profiline bağlıdır; orman niteliği, yol, eğim, kullanım/kısıt bilgileri odaklı özel varyant kullanır.'),
  [UnitType.ADA]: binding('Ada', 'ARSA_IMARLI', 'ADA_OZEL', 'Özel', 'Ada; Arsa (İmarlı) ana profiline bağlıdır ancak kıyı, iskele, su/enerji ve ana karaya mesafe odaklı özel varyant kullanır.'),
  [UnitType.DEVRE_MULK]: binding('Devre Mülk', 'DAIRE', 'DEVRE_MULK', 'Özel', 'Dönem/hafta kullanım hakkı ve tesis bilgisi için özel 8\'li varyant gerekir.'),
  [UnitType.TURISTIK_TESIS]: binding('Turistik Tesis', 'OTEL_TURISTIK', 'TURISTIK_TESIS', 'Özel', 'Tesis alt türüne göre 8\'li varyant zorunludur; generic otel alanları körlemesine kullanılmaz.'),
  [UnitType.KONUT_PROJESI]: binding('Konut Projesi', 'PROJE_INSAAT', 'DEFAULT', 'Yok', 'Ana profil aynen kullanılır.'),
  [UnitType.VILLA_PROJESI]: binding('Villa Projesi', 'PROJE_INSAAT', 'VILLA_PROJESI', 'Hafif', 'Proje profilinde villa tipi/stok ve arsa bilgisi öne alınabilir.'),
  [UnitType.REZIDANS_PROJESI]: binding('Rezidans Projesi', 'PROJE_INSAAT', 'REZIDANS_PROJESI', 'Hafif', 'Proje profilinde rezidans hizmetleri ve ünite tipleri öne alınabilir.'),
  [UnitType.KARMA_PROJE]: binding('Karma Proje', 'PROJE_INSAAT', 'TICARI_KARMA_PROJE', 'Hafif', 'Proje tipine göre stok ve kullanım karması 1-2 slotta öne alınabilir.'),
  [UnitType.AVM_PROJESI]: binding('AVM Projesi', 'PROJE_INSAAT', 'TICARI_KARMA_PROJE', 'Hafif', 'Proje tipine göre stok ve kullanım karması 1-2 slotta öne alınabilir.'),
  [UnitType.TICARI_PROJE]: binding('Ticari Proje', 'PROJE_INSAAT', 'TICARI_KARMA_PROJE', 'Hafif', 'Proje tipine göre stok ve kullanım karması 1-2 slotta öne alınabilir.'),
};

const LEGACY_BINDING_DATA: Partial<
  Record<UnitType, Omit<UnitTypeCardProfileBinding, 'unitType'>>
> = {
  [UnitType.STUDYO]: binding(
    'Stüdyo',
    'DAIRE',
    'LEGACY_ALIAS',
    'Legacy',
    'Eski UnitType; Daire CardProfile standardını kullanır.',
    UnitType.DAIRE,
  ),
  [UnitType.MARKET]: binding(
    'Market',
    'DUKKAN',
    'LEGACY_ALIAS',
    'Legacy',
    'Eski UnitType; Dükkan / Mağaza CardProfile standardını kullanır.',
    UnitType.DUKKAN_MAGAZA,
  ),
  [UnitType.TERAS_LOFT]: binding(
    'Teras Loft',
    'DAIRE',
    'PREMIUM_DAIRE',
    'Legacy',
    'Eski UnitType; Loft/Daire CardProfile standardını kullanır.',
    UnitType.LOFT,
  ),
  [UnitType.DUBLEKS]: binding(
    'Dubleks',
    'DAIRE',
    'PREMIUM_DAIRE',
    'Legacy',
    'Eski UnitType; bağımsız bölüm Daire CardProfile standardını kullanır.',
    UnitType.DAIRE,
  ),
  [UnitType.TRIPLEKS]: binding(
    'Tripleks',
    'DAIRE',
    'PREMIUM_DAIRE',
    'Legacy',
    'Eski UnitType; bağımsız bölüm Daire CardProfile standardını kullanır.',
    UnitType.DAIRE,
  ),
  [UnitType.MUAYENEHANE]: binding(
    'Muayenehane',
    'OFIS',
    'LEGACY_ALIAS',
    'Legacy',
    'Eski UnitType; Ofis / Büro CardProfile standardını kullanır.',
    UnitType.OFIS_BURO,
  ),
  [UnitType.KLINIK]: binding(
    'Klinik',
    'OFIS',
    'LEGACY_ALIAS',
    'Legacy',
    'Eski UnitType; Ofis / Büro CardProfile standardını kullanır.',
    UnitType.OFIS_BURO,
  ),
  [UnitType.OTEL_ODASI]: binding(
    'Otel Odası',
    'OTEL_TURISTIK',
    'LEGACY_ALIAS',
    'Legacy',
    'Eski UnitType; Otel / Turistik Tesis CardProfile standardını kullanır.',
    UnitType.OTEL,
  ),
};

function attachUnitType(
  data: Partial<Record<UnitType, Omit<UnitTypeCardProfileBinding, 'unitType'>>>,
) {
  return Object.fromEntries(
    Object.entries(data).map(([unitType, value]) => [
      unitType,
      {
        ...(value as Omit<UnitTypeCardProfileBinding, 'unitType'>),
        unitType: unitType as UnitType,
      },
    ]),
  ) as Partial<Record<UnitType, UnitTypeCardProfileBinding>>;
}

export const CANONICAL_UNIT_TYPE_CARD_PROFILE_BINDINGS =
  attachUnitType(CANONICAL_BINDING_DATA);

export const LEGACY_UNIT_TYPE_CARD_PROFILE_BINDINGS =
  attachUnitType(LEGACY_BINDING_DATA);

export const UNIT_TYPE_CARD_PROFILE_BINDINGS: Partial<
  Record<UnitType, UnitTypeCardProfileBinding>
> = {
  ...CANONICAL_UNIT_TYPE_CARD_PROFILE_BINDINGS,
  ...LEGACY_UNIT_TYPE_CARD_PROFILE_BINDINGS,
};

export const NON_PUBLISHABLE_UNIT_TYPES = [UnitType.DIGER] as const;

export const VILLA_TYPE_OPTIONS = [
  'Tek Katlı Villa',
  'Dubleks Villa',
  'Tripleks Villa',
  '4 Katlı Villa',
] as const;

export const HOME_TYPE_OPTIONS = [
  'Tek Katlı Ev',
  'Dubleks Ev',
  'Tripleks Ev',
] as const;

const VILLA_STRUCTURE_LABEL_TYPES = new Set<UnitType>([
  UnitType.VILLA,
  UnitType.VILLA_TERAS,
  UnitType.VILLA_GARDEN,
  UnitType.DUBLEKS_VILLA,
  UnitType.TRIPLEKS_VILLA,
  UnitType.OZEL_HAVUZLU_VILLA,
  UnitType.OZEL_ISKELELI_VILLA,
  UnitType.AKILLI_VILLA,
  UnitType.ULTRA_LUKS_VILLA,
]);

const INFERRED_STRUCTURE_TYPES: Partial<Record<UnitType, string>> = {
  [UnitType.DUBLEKS_VILLA]: 'Dubleks Villa',
  [UnitType.TRIPLEKS_VILLA]: 'Tripleks Villa',
  [UnitType.TAS_EV]: 'Taş Ev',
  [UnitType.AHSAP_EV]: 'Ahşap Ev',
  [UnitType.PREFABRIK_EV]: 'Prefabrik Ev',
  [UnitType.CELIK_KONSTRUKSIYON]: 'Çelik Konstrüksiyon Ev',
  [UnitType.TINY_HOUSE]: 'Tiny House',
  [UnitType.BUNGALOV]: 'Bungalov',
  [UnitType.DAG_EVI]: 'Dağ Evi',
  [UnitType.YAYLA_EVI]: 'Yayla Evi',
  [UnitType.GOL_EVI]: 'Göl Evi',
  [UnitType.BAG_EVI]: 'Bağ Evi',
  [UnitType.CIFTLIK_EVI]: 'Çiftlik Evi',
  [UnitType.HOBI_BAHCESI_EVI]: 'Hobi Bahçesi Evi',
  [UnitType.MAGARA_EV]: 'Mağara Ev',
  [UnitType.KOSK_YALI]: 'Köşk / Yalı',
  [UnitType.YALI]: 'Yalı',
  [UnitType.KONAK]: 'Konak',
};

export function normalizePropertyCardValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const text = value.trim();
  const normalized = text.toLocaleLowerCase('tr-TR');

  if (
    normalized === 'fourplex villa' ||
    normalized === 'fourplex' ||
    normalized === '4 katli villa' ||
    normalized === '4 katlı villa'
  ) {
    return '4 Katlı Villa';
  }

  return text;
}

export function getCardProfileBinding(
  unitType: UnitType,
): UnitTypeCardProfileBinding | null {
  return UNIT_TYPE_CARD_PROFILE_BINDINGS[unitType] ?? null;
}

export function getCardProfileDefinition(
  profileCode: CardProfileCode,
): CardProfileDefinition {
  return CARD_PROFILES[profileCode];
}

export function getCanonicalCardProfileBindingCount() {
  return Object.keys(CANONICAL_UNIT_TYPE_CARD_PROFILE_BINDINGS).length;
}

export function getUnmappedUnitTypes() {
  return (Object.values(UnitType) as UnitType[]).filter(
    (unitType) => !UNIT_TYPE_CARD_PROFILE_BINDINGS[unitType],
  );
}

export function getStructureTypeSlotLabel(unitType: UnitType) {
  return VILLA_STRUCTURE_LABEL_TYPES.has(unitType)
    ? 'Villa Tipi'
    : 'Yapı Tipi';
}

export function resolveStructureTypeValue(
  unitType: UnitType,
  values: Record<string, unknown>,
) {
  const inferred = INFERRED_STRUCTURE_TYPES[unitType];
  if (inferred) return inferred;

  const raw =
    values.structureType ??
    values.villaType ??
    values.homeType ??
    values.buildingStyle;

  const normalized = normalizePropertyCardValue(raw);
  return normalized === null || normalized === undefined
    ? ''
    : String(normalized).trim();
}
