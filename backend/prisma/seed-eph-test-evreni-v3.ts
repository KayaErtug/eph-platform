import { PrismaClient } from '@prisma/client';
import type { Role, UnitStatus, UnitType, CustomerStatus, CustomerRole, CustomerPurchaseIntent, CustomerInterestPriority, PortfolioApprovalStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const R = {
  EMLAKCI: 'EMLAKCI',
  MUTEAHHIT: 'MUTEAHHIT',
  INSAAT_FIRMASI: 'INSAAT_FIRMASI',
} as const satisfies Record<string, Role>;

const U = {
  DAIRE: 'DAIRE',
  REZIDANS: 'REZIDANS',
  VILLA: 'VILLA',
  MUSTAK_EV: 'MUSTAK_EV',
  ARSA: 'ARSA',
  KONUT_ARSASI: 'KONUT_ARSASI',
  VILLA_ARSASI: 'VILLA_ARSASI',
  TICARI_ARSA: 'TICARI_ARSA',
  SANAYI_ARSASI: 'SANAYI_ARSASI',
  TARLA: 'TARLA',
  DUKKAN_MAGAZA: 'DUKKAN_MAGAZA',
  OFIS_BURO: 'OFIS_BURO',
  FABRIKA_URETIM_TESISI: 'FABRIKA_URETIM_TESISI',
  DEPO_ANTREPO: 'DEPO_ANTREPO',
  OTEL: 'OTEL',
  AKARYAKIT_ISTASYONU: 'AKARYAKIT_ISTASYONU',
} as const satisfies Record<string, UnitType>;

const US = {
  SATILIK: 'SATILIK',
  KIRALIK: 'KIRALIK',
} as const satisfies Record<string, UnitStatus>;

const CS = {
  YENI_LEAD: 'YENI_LEAD',
  ILK_GORUSME: 'ILK_GORUSME',
  PORTFOLYO_GONDERILDI: 'PORTFOLYO_GONDERILDI',
  YER_GOSTERIMI: 'YER_GOSTERIMI',
  TEKLIF_SURECI: 'TEKLIF_SURECI',
  PAZARLIK: 'PAZARLIK',
  KAPANDI: 'KAPANDI',
  KAYBEDILDI: 'KAYBEDILDI',
} as const satisfies Record<string, CustomerStatus>;

const CR = {
  ALICI: 'ALICI',
  KIRACI: 'KIRACI',
  YATIRIMCI: 'YATIRIMCI',
} as const satisfies Record<string, CustomerRole>;

const CPI = {
  SATIN_ALMA: 'SATIN_ALMA',
  KIRALAMA: 'KIRALAMA',
  YATIRIM: 'YATIRIM',
  ARSA_GELISTIRME: 'ARSA_GELISTIRME',
} as const satisfies Record<string, CustomerPurchaseIntent>;

const CIP = {
  NORMAL: 'NORMAL',
  YUKSEK: 'YUKSEK',
  ACIL: 'ACIL',
} as const satisfies Record<string, CustomerInterestPriority>;

const PAS = {
  ONAYLANDI: 'ONAYLANDI',
  HAVUZDA: 'HAVUZDA',
} as const satisfies Record<string, PortfolioApprovalStatus>;

const TEST_PASSWORD = '112233';
const CITY = 'Denizli';
const DISTRICT = 'Pamukkale';
const IMAGE_BASE = '/gorseller';

type Segment = 'SUPER_YILDIZ' | 'GUCLU' | 'ORTA' | 'YENI';
type OfficeKey = 'gokturk' | 'pamukkale' | 'selcuklu';
type PortfolioBucket = 'KONUT' | 'ARSA' | 'DIGER';

type AdvisorPlan = {
  officeKey: OfficeKey;
  firstName: string;
  lastName: string;
  email: string;
  segment: Segment;
  crmCount: number;
  portfolioCount: number;
  poolCount: number;
};

type OfficePlan = {
  key: OfficeKey;
  name: string;
  city: string;
  owner: { firstName: string; lastName: string; email: string };
  leader: { firstName: string; lastName: string; email: string };
};

type DeveloperPlan = {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  projectCount: number;
  companyName: string;
};

const offices: OfficePlan[] = [
  {
    key: 'gokturk',
    name: 'Göktürk Gayrimenkul',
    city: CITY,
    owner: { firstName: 'Bumin', lastName: 'Kağan', email: 'bumin.kagan@test.com' },
    leader: { firstName: 'Mukan', lastName: 'Kağan', email: 'mukan.kagan@test.com' },
  },
  {
    key: 'pamukkale',
    name: 'Pamukkale Emlak',
    city: CITY,
    owner: { firstName: 'İlteriş', lastName: 'Kağan', email: 'ilteris.kagan@test.com' },
    leader: { firstName: 'Bilge', lastName: 'Kağan', email: 'bilge.kagan@test.com' },
  },
  {
    key: 'selcuklu',
    name: 'Selçuklu Gayrimenkul',
    city: CITY,
    owner: { firstName: 'Alp', lastName: 'Arslan', email: 'alp.arslan@test.com' },
    leader: { firstName: 'Melikşah', lastName: 'Selçuklu', email: 'meliksah.selcuklu@test.com' },
  },
];

const advisorPlans: AdvisorPlan[] = [
  { officeKey: 'gokturk', firstName: 'Alex', lastName: 'De Souza', email: 'alex.desouza@test.com', segment: 'SUPER_YILDIZ', crmCount: 88, portfolioCount: 58, poolCount: 20 },
  { officeKey: 'gokturk', firstName: 'Gheorghe', lastName: 'Hagi', email: 'gheorghe.hagi@test.com', segment: 'SUPER_YILDIZ', crmCount: 79, portfolioCount: 52, poolCount: 18 },
  { officeKey: 'gokturk', firstName: 'Sergen', lastName: 'Yalçın', email: 'sergen.yalcin@test.com', segment: 'GUCLU', crmCount: 63, portfolioCount: 43, poolCount: 15 },
  { officeKey: 'gokturk', firstName: 'Tuncay', lastName: 'Şanlı', email: 'tuncay.sanli@test.com', segment: 'GUCLU', crmCount: 56, portfolioCount: 38, poolCount: 13 },
  { officeKey: 'gokturk', firstName: 'Okan', lastName: 'Buruk', email: 'okan.buruk@test.com', segment: 'GUCLU', crmCount: 49, portfolioCount: 35, poolCount: 12 },
  { officeKey: 'gokturk', firstName: 'Arda', lastName: 'Turan', email: 'arda.turan@test.com', segment: 'GUCLU', crmCount: 44, portfolioCount: 31, poolCount: 11 },
  { officeKey: 'gokturk', firstName: 'Volkan', lastName: 'Demirel', email: 'volkan.demirel@test.com', segment: 'ORTA', crmCount: 31, portfolioCount: 22, poolCount: 8 },
  { officeKey: 'gokturk', firstName: 'Pascal', lastName: 'Nouma', email: 'pascal.nouma@test.com', segment: 'ORTA', crmCount: 28, portfolioCount: 20, poolCount: 7 },
  { officeKey: 'gokturk', firstName: 'Mert', lastName: 'Nobre', email: 'mert.nobre@test.com', segment: 'ORTA', crmCount: 24, portfolioCount: 18, poolCount: 6 },
  { officeKey: 'gokturk', firstName: 'Ümit', lastName: 'Karan', email: 'umit.karan@test.com', segment: 'ORTA', crmCount: 22, portfolioCount: 16, poolCount: 5 },
  { officeKey: 'gokturk', firstName: 'İlhan', lastName: 'Mansız', email: 'ilhan.mansiz@test.com', segment: 'ORTA', crmCount: 19, portfolioCount: 14, poolCount: 5 },
  { officeKey: 'gokturk', firstName: 'Rıza', lastName: 'Çalımbay', email: 'riza.calimbay@test.com', segment: 'YENI', crmCount: 12, portfolioCount: 8, poolCount: 3 },
  { officeKey: 'gokturk', firstName: 'Tanju', lastName: 'Çolak', email: 'tanju.colak@test.com', segment: 'YENI', crmCount: 9, portfolioCount: 6, poolCount: 2 },
  { officeKey: 'gokturk', firstName: 'Şifo', lastName: 'Mehmet', email: 'sifo.mehmet@test.com', segment: 'YENI', crmCount: 7, portfolioCount: 5, poolCount: 2 },

  { officeKey: 'pamukkale', firstName: 'Lefter', lastName: 'Küçükandonyadis', email: 'lefter.kucukandonyadis@test.com', segment: 'SUPER_YILDIZ', crmCount: 82, portfolioCount: 55, poolCount: 19 },
  { officeKey: 'pamukkale', firstName: 'Metin', lastName: 'Oktay', email: 'metin.oktay@test.com', segment: 'GUCLU', crmCount: 61, portfolioCount: 42, poolCount: 14 },
  { officeKey: 'pamukkale', firstName: 'Can', lastName: 'Bartu', email: 'can.bartu@test.com', segment: 'GUCLU', crmCount: 53, portfolioCount: 36, poolCount: 12 },
  { officeKey: 'pamukkale', firstName: 'Rüştü', lastName: 'Reçber', email: 'rustu.recber@test.com', segment: 'GUCLU', crmCount: 46, portfolioCount: 32, poolCount: 11 },
  { officeKey: 'pamukkale', firstName: 'Alpay', lastName: 'Özalan', email: 'alpay.ozalan@test.com', segment: 'ORTA', crmCount: 29, portfolioCount: 21, poolCount: 7 },
  { officeKey: 'pamukkale', firstName: 'Bülent', lastName: 'Korkmaz', email: 'bulent.korkmaz@test.com', segment: 'ORTA', crmCount: 24, portfolioCount: 18, poolCount: 6 },
  { officeKey: 'pamukkale', firstName: 'Emre', lastName: 'Belözoğlu', email: 'emre.belozoglu@test.com', segment: 'ORTA', crmCount: 21, portfolioCount: 15, poolCount: 5 },
  { officeKey: 'pamukkale', firstName: 'Fatih', lastName: 'Tekke', email: 'fatih.tekke@test.com', segment: 'ORTA', crmCount: 17, portfolioCount: 12, poolCount: 4 },
  { officeKey: 'pamukkale', firstName: 'Hakan', lastName: 'Şükür', email: 'hakan.sukur@test.com', segment: 'YENI', crmCount: 11, portfolioCount: 7, poolCount: 2 },
  { officeKey: 'pamukkale', firstName: 'Yattara', lastName: 'Reis', email: 'yattara.reis@test.com', segment: 'YENI', crmCount: 6, portfolioCount: 4, poolCount: 1 },

  { officeKey: 'selcuklu', firstName: 'Batigol', lastName: 'Usta', email: 'batigol.usta@test.com', segment: 'SUPER_YILDIZ', crmCount: 94, portfolioCount: 63, poolCount: 22 },
  { officeKey: 'selcuklu', firstName: 'Maradona', lastName: 'Dayı', email: 'maradona.dayi@test.com', segment: 'SUPER_YILDIZ', crmCount: 86, portfolioCount: 57, poolCount: 20 },
  { officeKey: 'selcuklu', firstName: 'Zidane', lastName: 'Abi', email: 'zidane.abi@test.com', segment: 'GUCLU', crmCount: 67, portfolioCount: 45, poolCount: 16 },
  { officeKey: 'selcuklu', firstName: 'Ronaldinho', lastName: 'Başkan', email: 'ronaldinho.baskan@test.com', segment: 'GUCLU', crmCount: 59, portfolioCount: 40, poolCount: 14 },
  { officeKey: 'selcuklu', firstName: 'Roberto', lastName: 'Carlos', email: 'roberto.carlos@test.com', segment: 'GUCLU', crmCount: 51, portfolioCount: 34, poolCount: 12 },
  { officeKey: 'selcuklu', firstName: 'Pirlo', lastName: 'Maestro', email: 'pirlo.maestro@test.com', segment: 'ORTA', crmCount: 33, portfolioCount: 22, poolCount: 8 },
  { officeKey: 'selcuklu', firstName: 'Del Piero', lastName: 'Bey', email: 'delpiero.bey@test.com', segment: 'ORTA', crmCount: 27, portfolioCount: 19, poolCount: 7 },
  { officeKey: 'selcuklu', firstName: 'Totti', lastName: 'Kaptan', email: 'totti.kaptan@test.com', segment: 'ORTA', crmCount: 23, portfolioCount: 16, poolCount: 5 },
  { officeKey: 'selcuklu', firstName: 'Maldini', lastName: 'Reis', email: 'maldini.reis@test.com', segment: 'ORTA', crmCount: 19, portfolioCount: 14, poolCount: 5 },
  { officeKey: 'selcuklu', firstName: 'Buffon', lastName: 'Baba', email: 'buffon.baba@test.com', segment: 'YENI', crmCount: 13, portfolioCount: 9, poolCount: 3 },
  { officeKey: 'selcuklu', firstName: 'Kaka', lastName: 'Bey', email: 'kaka.bey@test.com', segment: 'YENI', crmCount: 8, portfolioCount: 5, poolCount: 2 },
  { officeKey: 'selcuklu', firstName: 'Nesta', lastName: 'Komutan', email: 'nesta.komutan@test.com', segment: 'YENI', crmCount: 5, portfolioCount: 3, poolCount: 1 },
];

const developerPlans: DeveloperPlan[] = [
  { firstName: 'Ersun', lastName: 'Yanal', email: 'ersun.yanal@test.com', role: R.MUTEAHHIT, projectCount: 2, companyName: 'Ersun Yanal Yapı' },
  { firstName: 'Mesut', lastName: 'Bakkal', email: 'mesut.bakkal@test.com', role: R.MUTEAHHIT, projectCount: 2, companyName: 'Mesut Bakkal İnşaat' },
  { firstName: 'Boksör Ayı', lastName: 'Hamza', email: 'boksorayi.hamza@test.com', role: R.MUTEAHHIT, projectCount: 2, companyName: 'Hamza Beton' },
  { firstName: 'Deli', lastName: 'Bahtiyar', email: 'deli.bahtiyar@test.com', role: R.MUTEAHHIT, projectCount: 2, companyName: 'Bahtiyar Yapı' },
  { firstName: 'Bahriyeli', lastName: 'Köfteci', email: 'bahriyeli.kofteci@test.com', role: R.MUTEAHHIT, projectCount: 2, companyName: 'Bahriyeli Konut' },
  { firstName: 'KML', lastName: 'İnşaat', email: 'kml.insaat@test.com', role: R.INSAAT_FIRMASI, projectCount: 3, companyName: 'KML İnşaat' },
  { firstName: 'Terzioğlu', lastName: 'İnşaat', email: 'terzioglu.insaat@test.com', role: R.INSAAT_FIRMASI, projectCount: 3, companyName: 'Terzioğlu İnşaat' },
  { firstName: 'Uzun', lastName: 'İnşaat', email: 'uzun.insaat@test.com', role: R.INSAAT_FIRMASI, projectCount: 3, companyName: 'Uzun İnşaat' },
];



const homeUnitTypes: UnitType[] = [U.DAIRE, U.REZIDANS, U.VILLA, U.MUSTAK_EV];
const landUnitTypes: UnitType[] = [U.ARSA, U.KONUT_ARSASI, U.VILLA_ARSASI, U.TICARI_ARSA, U.SANAYI_ARSASI];
const landAndFarmUnitTypes: UnitType[] = [...landUnitTypes, U.TARLA];
const commercialUnitTypes: UnitType[] = [U.DUKKAN_MAGAZA, U.OFIS_BURO, U.FABRIKA_URETIM_TESISI, U.DEPO_ANTREPO, U.OTEL, U.AKARYAKIT_ISTASYONU];
const industrialUnitTypes: UnitType[] = [U.FABRIKA_URETIM_TESISI, U.DEPO_ANTREPO];
const specialCommercialUnitTypes: UnitType[] = [U.OTEL, U.AKARYAKIT_ISTASYONU];
const smallCommercialUnitTypes: UnitType[] = [U.DUKKAN_MAGAZA, U.OFIS_BURO];

const neighborhoods = [
  { name: 'Çamlık', saleM2: 112500, rent3Plus1: 45000 },
  { name: 'Servergazi', saleM2: 100000, rent3Plus1: 40000 },
  { name: 'Gerzele', saleM2: 85000, rent3Plus1: 39000 },
  { name: 'Selçuk Bey', saleM2: 75000, rent3Plus1: 30000 },
  { name: 'Karahasanlı', saleM2: 70000, rent3Plus1: 30000 },
  { name: 'Yeni Şafak', saleM2: 70000, rent3Plus1: 32000 },
  { name: 'Başkarcı', saleM2: 85000, rent3Plus1: 42000 },
  { name: 'Çakmak', saleM2: 65000, rent3Plus1: 25000 },
  { name: 'Bereketli', saleM2: 70000, rent3Plus1: 25000 },
];

const customerFirstNames = ['Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Murat', 'Hasan', 'Hüseyin', 'Yusuf', 'Emre', 'Kaan', 'Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Emine', 'Hatice', 'Merve', 'Derya', 'Selin', 'Buse'];
const customerLastNames = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Aydın', 'Özkan', 'Arslan', 'Doğan', 'Korkmaz', 'Koç', 'Polat', 'Aslan', 'Erdoğan', 'Yıldız', 'Aksoy', 'Bulut', 'Kaplan', 'Keskin', 'Avcı'];
const professions = ['Öğretmen', 'Doktor', 'Mühendis', 'Esnaf', 'Avukat', 'Emekli', 'Memur', 'Muhasebeci', 'Tüccar', 'Sanayici', 'Yatırımcı', 'Eczacı'];
const sources = ['Referans', 'WhatsApp', 'Telefon', 'Saha Görüşmesi', 'Tabela', 'Sosyal Medya', 'Web Sitesi', 'Eski Müşteri'];
const roomOptions = ['1+1', '2+1', '3+1', '4+1', '5+1'];
const homeFeatures = ['Asansör', 'Kapalı Otopark', 'Güvenlik', 'Site İçerisinde', 'Yerden Isıtma', 'Jeneratör'];
const landFeatures = ['Köşe Parsel', 'Yola Cephe', 'İmarlı', 'Manzaralı', 'Elektrik Yakın', 'Su Yakın'];
const commercialFeatures = ['Ana Cadde', 'Tabela Değeri', 'Yüksek Tavan', 'Depolu', 'Mutfak', 'WC'];

const otherTypes: UnitType[] = [
  U.TARLA,
  U.DUKKAN_MAGAZA,
  U.OFIS_BURO,
  U.FABRIKA_URETIM_TESISI,
  U.DEPO_ANTREPO,
  U.OTEL,
  U.AKARYAKIT_ISTASYONU,
];

function slugify(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deterministicPhone(seed: number, prefix = '555') {
  const suffix = String(1000000 + seed).slice(-7);
  return `05${prefix}${suffix}`;
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function getPortfolioBuckets(total: number) {
  const konut = Math.round(total * 0.5);
  const arsa = Math.round(total * 0.3);
  const diger = total - konut - arsa;
  const buckets: PortfolioBucket[] = [];
  for (let i = 0; i < konut; i += 1) buckets.push('KONUT');
  for (let i = 0; i < arsa; i += 1) buckets.push('ARSA');
  for (let i = 0; i < diger; i += 1) buckets.push('DIGER');
  return buckets;
}

function getUnitType(bucket: PortfolioBucket, index: number): UnitType {
  if (bucket === 'KONUT') {
    const homeTypes: UnitType[] = [U.DAIRE, U.DAIRE, U.DAIRE, U.REZIDANS, U.VILLA, U.MUSTAK_EV];
    return pick(homeTypes, index);
  }
  if (bucket === 'ARSA') {
    const landTypes: UnitType[] = [U.ARSA, U.KONUT_ARSASI, U.VILLA_ARSASI, U.TICARI_ARSA, U.SANAYI_ARSASI];
    return pick(landTypes, index);
  }
  return pick(otherTypes, index);
}

function getFeatures(type: UnitType, index: number) {
  if (landAndFarmUnitTypes.includes(type)) {
    return [pick(landFeatures, index), pick(landFeatures, index + 2)].filter(Boolean);
  }
  if (commercialUnitTypes.includes(type)) {
    return [pick(commercialFeatures, index), pick(commercialFeatures, index + 2)].filter(Boolean);
  }
  return [pick(homeFeatures, index), pick(homeFeatures, index + 2)].filter(Boolean);
}

function getArea(type: UnitType, index: number) {
  if (landUnitTypes.includes(type)) return 300 + ((index * 37) % 1700);
  if (type === U.TARLA) return 1500 + ((index * 211) % 12000);
  if (commercialUnitTypes.includes(type)) return 500 + ((index * 73) % 3500);
  if (type === U.VILLA || type === U.MUSTAK_EV) return 160 + ((index * 13) % 180);
  return 75 + ((index * 11) % 120);
}

function getPrice(type: UnitType, status: UnitStatus, area: number, neighborhoodIndex: number, index: number) {
  const n = pick(neighborhoods, neighborhoodIndex);
  if (status === US.KIRALIK) {
    if (homeUnitTypes.includes(type)) {
      return Math.round(n.rent3Plus1 * (0.72 + ((index % 7) * 0.06)));
    }
    if (smallCommercialUnitTypes.includes(type)) return 18000 + ((index * 2500) % 65000);
    return 25000 + ((index * 3500) % 95000);
  }
  if (landUnitTypes.includes(type)) {
    return Math.round(area * n.saleM2 * (0.45 + ((index % 6) * 0.09)));
  }
  if (type === U.TARLA) return Math.round(area * (900 + ((index % 8) * 250)));
  if (industrialUnitTypes.includes(type)) return 9000000 + ((index * 725000) % 45000000);
  if (specialCommercialUnitTypes.includes(type)) return 15000000 + ((index * 1100000) % 65000000);
  return Math.round(area * n.saleM2 * (0.9 + ((index % 5) * 0.05)));
}

function getRoomCount(type: UnitType, index: number) {
  if (!homeUnitTypes.includes(type)) return undefined;
  return pick(roomOptions, index);
}

function buildProjectName(ownerName: string, neighborhood: string, index: number) {
  const suffixes = ['Park', 'Vista', 'Life', 'Prime', 'Garden', 'Loft', 'Konutları', 'Rezidans'];
  return `${ownerName} ${neighborhood} ${pick(suffixes, index)}`;
}

async function upsertUser(input: { firstName: string; lastName: string; email: string; role: Role; phoneSeed: number; company?: string }) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      isVerified: true,
      isApproved: true,
      adminVisible: true,
      city: CITY,
      district: DISTRICT,
      hesapTuru: 'TEST' as any,
      pilotKullaniciMi: true,
      passwordHash,
    },
    create: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: deterministicPhone(input.phoneSeed),
      passwordHash,
      role: input.role,
      isVerified: true,
      isApproved: true,
      adminVisible: true,
      city: CITY,
      district: DISTRICT,
      hesapTuru: 'TEST' as any,
      pilotKullaniciMi: true,
      memberSince: new Date(),
      memberCode: `TEST-${String(input.phoneSeed).padStart(5, '0')}`,
      trustScore: 85,
      referralCode: `TEST-${slugify(input.email)}`,
    },
  });
}

async function createProjectForOwner(ownerId: string, ownerName: string, neighborhood: string, index: number) {
  const projectName = buildProjectName(ownerName, neighborhood, index);
  const existing = await prisma.project.findFirst({ where: { ownerId, name: projectName } });
  if (existing) return existing;

  return prisma.project.create({
    data: {
      ownerId,
      name: projectName,
      description: 'EPH Denizli Test Evreni V3 kapsamında üretilmiş pilot proje kaydı.',
      city: CITY,
      district: DISTRICT,
      address: `${neighborhood} Mahallesi, ${DISTRICT} / ${CITY}`,
      mapAddress: `${neighborhood}, ${DISTRICT}, ${CITY}`,
      isActive: true,
    },
  });
}

async function createPortfolioUnit(params: {
  ownerId: string;
  ownerName: string;
  projectId: string;
  globalIndex: number;
  bucket: PortfolioBucket;
  isPoolVisible: boolean;
}) {
  const type = getUnitType(params.bucket, params.globalIndex);
  const neighborhood = pick(neighborhoods, params.globalIndex).name;
  const status = params.globalIndex % 8 === 0 ? US.KIRALIK : US.SATILIK;
  const area = getArea(type, params.globalIndex);
  const price = getPrice(type, status, area, params.globalIndex, params.globalIndex);
  const number = `TEST-${slugify(params.ownerName)}-${params.globalIndex}`;

  const existing = await prisma.unit.findFirst({ where: { projectId: params.projectId, number } });
  if (existing) return existing;

  const unit = await prisma.unit.create({
    data: {
      projectId: params.projectId,
      type,
      status,
      number,
      roomCount: getRoomCount(type, params.globalIndex),
      area,
      price,
      priceCurrency: 'TRY',
      description: `${CITY} ${DISTRICT} ${neighborhood} bölgesinde EPH Test Evreni V3 portföy kaydı. Danışman performansı, havuz eşleşmesi ve Lina testleri için oluşturuldu.`,
      features: getFeatures(type, params.globalIndex),
      isVerified: params.isPoolVisible,
      photoVerified: params.isPoolVisible,
      tapuVerified: params.isPoolVisible,
      yetkiVerified: params.isPoolVisible,
      approvalStatus: params.isPoolVisible ? PAS.HAVUZDA : PAS.ONAYLANDI,
      submittedForApprovalAt: params.isPoolVisible ? new Date() : null,
      approvedAt: params.isPoolVisible ? new Date() : null,
      verifiedAt: params.isPoolVisible ? new Date() : null,
      isPoolVisible: params.isPoolVisible,
      poolPublishedAt: params.isPoolVisible ? new Date() : null,
      deedOwnerFullName: `${pick(customerFirstNames, params.globalIndex)} ${pick(customerLastNames, params.globalIndex + 3)}`,
      deedOwnerPhone: deterministicPhone(70000 + params.globalIndex, '554'),
      deedOwnerEmail: `tapu.${params.globalIndex}@test.com`,
    },
  });

  await prisma.unitImage.create({
    data: {
      unitId: unit.id,
      url: `${IMAGE_BASE}/ilan-${(params.globalIndex % 12) + 1}.jpg`,
      supabaseUrl: null,
      path: `test-evreni-v3/ilan-${(params.globalIndex % 12) + 1}.jpg`,
      bucket: 'portfolio-images',
      originalName: `ilan-${(params.globalIndex % 12) + 1}.jpg`,
      mimetype: 'image/jpeg',
      size: 250000,
      isCover: true,
      sortOrder: 0,
    },
  });

  return unit;
}

function buildCustomerInterest(index: number) {
  const neighborhood = pick(neighborhoods, index);
  const mode = index % 10;
  if (mode < 5) {
    const area = 90 + ((index * 7) % 80);
    const targetPrice = getPrice(U.DAIRE, US.SATILIK, area, index, index);
    return {
      propertyTypes: [U.DAIRE, U.REZIDANS, U.VILLA, U.MUSTAK_EV],
      statuses: [US.SATILIK],
      minBudget: Math.round(targetPrice * 0.85),
      maxBudget: Math.round(targetPrice * 1.15),
      minArea: Math.max(55, area - 20),
      maxArea: area + 30,
      roomCounts: [pick(roomOptions, index), pick(roomOptions, index + 1)],
      features: [pick(homeFeatures, index)],
      purchaseIntent: CPI.SATIN_ALMA,
      role: CR.ALICI,
      title: `${neighborhood.name} konut arayışı`,
    };
  }
  if (mode < 8) {
    const area = 350 + ((index * 53) % 1400);
    const targetPrice = getPrice(U.ARSA, US.SATILIK, area, index, index);
    return {
      propertyTypes: [U.ARSA, U.KONUT_ARSASI, U.VILLA_ARSASI, U.TICARI_ARSA],
      statuses: [US.SATILIK],
      minBudget: Math.round(targetPrice * 0.75),
      maxBudget: Math.round(targetPrice * 1.25),
      minArea: Math.max(150, area - 150),
      maxArea: area + 250,
      roomCounts: [],
      features: [pick(landFeatures, index)],
      purchaseIntent: CPI.ARSA_GELISTIRME,
      role: CR.YATIRIMCI,
      title: `${neighborhood.name} arsa arayışı`,
    };
  }
  if (mode === 8) {
    return {
      propertyTypes: [U.DAIRE, U.REZIDANS, U.VILLA, U.MUSTAK_EV],
      statuses: [US.KIRALIK],
      minBudget: Math.round(neighborhood.rent3Plus1 * 0.7),
      maxBudget: Math.round(neighborhood.rent3Plus1 * 1.25),
      minArea: 85,
      maxArea: 180,
      roomCounts: ['2+1', '3+1', '4+1'],
      features: [pick(homeFeatures, index)],
      purchaseIntent: CPI.KIRALAMA,
      role: CR.KIRACI,
      title: `${neighborhood.name} kiralık konut arayışı`,
    };
  }
  return {
    propertyTypes: [U.DUKKAN_MAGAZA, U.OFIS_BURO, U.FABRIKA_URETIM_TESISI, U.OTEL],
    statuses: [US.SATILIK, US.KIRALIK],
    minBudget: 1500000 + ((index * 250000) % 12000000),
    maxBudget: 9000000 + ((index * 750000) % 45000000),
    minArea: 80,
    maxArea: 2500,
    roomCounts: [],
    features: [pick(commercialFeatures, index)],
    purchaseIntent: CPI.YATIRIM,
    role: CR.YATIRIMCI,
    title: `${neighborhood.name} ticari yatırım arayışı`,
  };
}

async function createCrmCustomer(ownerId: string, advisor: AdvisorPlan, index: number, globalIndex: number) {
  const interest = buildCustomerInterest(globalIndex);
  const firstName = pick(customerFirstNames, globalIndex);
  const lastName = pick(customerLastNames, globalIndex + index);
  const email = `crm.${slugify(advisor.email)}.${index}@test.com`;
  const existing = await prisma.customer.findFirst({ where: { ownerId, email } });
  if (existing) return existing;

  const customer = await prisma.customer.create({
    data: {
      ownerId,
      firstName,
      lastName,
      phone: deterministicPhone(250000 + globalIndex, '553'),
      email,
      city: CITY,
      profession: pick(professions, globalIndex),
      company: globalIndex % 6 === 0 ? `${lastName} Grup` : undefined,
      budget: interest.maxBudget,
      interestedArea: `${CITY} / ${DISTRICT} / ${pick(neighborhoods, globalIndex).name}`,
      interestedType: interest.propertyTypes[0],
      source: pick(sources, globalIndex),
      status: pick(Object.values(CS), globalIndex),
      roles: [interest.role],
      tags: globalIndex % 7 === 0 ? ['Sıcak Lead', 'Nakit Hazır'] : globalIndex % 5 === 0 ? ['Yatırımcı'] : [],
      notes: `EPH Test Evreni V3 kaydı. Sahibi: ${advisor.firstName} ${advisor.lastName}. Senaryo: ${interest.title}.`,
      lastContactedAt: new Date(Date.now() - (globalIndex % 15) * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.customerInterest.create({
    data: {
      customerId: customer.id,
      title: interest.title,
      city: CITY,
      district: DISTRICT,
      neighborhood: pick(neighborhoods, globalIndex).name,
      propertyTypes: interest.propertyTypes,
      statuses: interest.statuses,
      minBudget: interest.minBudget,
      maxBudget: interest.maxBudget,
      minArea: interest.minArea,
      maxArea: interest.maxArea,
      roomCounts: interest.roomCounts,
      features: interest.features,
      purchaseIntent: interest.purchaseIntent,
      priority: globalIndex % 9 === 0 ? CIP.ACIL : globalIndex % 4 === 0 ? CIP.YUKSEK : CIP.NORMAL,
      notes: 'Lina havuz eşleşme motoru testi için oluşturuldu.',
      isActive: true,
    },
  });

  return customer;
}

async function seedAdvisorsAndData() {
  let phoneSeed = 1000;
  let globalPortfolioIndex = 1;
  let globalCustomerIndex = 1;

  for (const office of offices) {
    await upsertUser({ ...office.owner, role: R.EMLAKCI, phoneSeed: phoneSeed++ });
    await upsertUser({ ...office.leader, role: R.EMLAKCI, phoneSeed: phoneSeed++ });
  }

  for (const advisor of advisorPlans) {
    const user = await upsertUser({
      firstName: advisor.firstName,
      lastName: advisor.lastName,
      email: advisor.email,
      role: R.EMLAKCI,
      phoneSeed: phoneSeed++,
    });

    const office = offices.find((item) => item.key === advisor.officeKey)!;
    const ownerName = `${advisor.firstName} ${advisor.lastName}`;
    const buckets = getPortfolioBuckets(advisor.portfolioCount);

    for (let i = 0; i < advisor.portfolioCount; i += 1) {
      const neighborhood = pick(neighborhoods, globalPortfolioIndex).name;
      const project = await createProjectForOwner(user.id, ownerName, neighborhood, globalPortfolioIndex);
      await createPortfolioUnit({
        ownerId: user.id,
        ownerName,
        projectId: project.id,
        globalIndex: globalPortfolioIndex,
        bucket: buckets[i],
        isPoolVisible: i < advisor.poolCount,
      });
      globalPortfolioIndex += 1;
    }

    for (let i = 0; i < advisor.crmCount; i += 1) {
      await createCrmCustomer(user.id, advisor, i + 1, globalCustomerIndex);
      globalCustomerIndex += 1;
    }

    console.log(`${office.name} / ${ownerName}: ${advisor.crmCount} CRM, ${advisor.portfolioCount} portföy, ${advisor.poolCount} havuz`);
  }
}

async function seedDevelopers() {
  let phoneSeed = 9000;
  let projectIndex = 1;

  for (const developer of developerPlans) {
    const user = await upsertUser({
      firstName: developer.firstName,
      lastName: developer.lastName,
      email: developer.email,
      role: developer.role,
      phoneSeed: phoneSeed++,
      company: developer.companyName,
    });

    for (let i = 0; i < developer.projectCount; i += 1) {
      const neighborhood = pick(neighborhoods, projectIndex).name;
      const project = await createProjectForOwner(user.id, developer.companyName, neighborhood, projectIndex);
      const unitCount = developer.role === R.INSAAT_FIRMASI ? 18 : 12;

      for (let u = 0; u < unitCount; u += 1) {
        await createPortfolioUnit({
          ownerId: user.id,
          ownerName: developer.companyName,
          projectId: project.id,
          globalIndex: 50000 + projectIndex * 100 + u,
          bucket: u % 5 === 0 ? 'ARSA' : 'KONUT',
          isPoolVisible: u < Math.ceil(unitCount * 0.35),
        });
      }

      projectIndex += 1;
    }

    console.log(`${developer.companyName}: ${developer.projectCount} proje`);
  }
}

async function printSummary() {
  const [userCount, customerCount, projectCount, unitCount, poolCount] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: '@test.com' } } }),
    prisma.customer.count({ where: { email: { endsWith: '@test.com' } } }),
    prisma.project.count({ where: { name: { contains: 'Test' } } }),
    prisma.unit.count({ where: { number: { startsWith: 'TEST-' } } }),
    prisma.unit.count({ where: { number: { startsWith: 'TEST-' }, isPoolVisible: true } }),
  ]);

  console.log('--- EPH TEST EVRENİ V3 ÖZET ---');
  console.log(`Test kullanıcıları: ${userCount}`);
  console.log(`CRM kayıtları: ${customerCount}`);
  console.log(`Projeler: ${projectCount}`);
  console.log(`Portföyler: ${unitCount}`);
  console.log(`Havuz portföyleri: ${poolCount}`);
  console.log(`Ortak şifre: ${TEST_PASSWORD}`);
}

async function main() {
  console.log('EPH Test Evreni V3 seed başlıyor...');
  console.log(`Tüm test kullanıcı şifresi: ${TEST_PASSWORD}`);
  await seedAdvisorsAndData();
  await seedDevelopers();
  await printSummary();
  console.log('EPH Test Evreni V3 seed tamamlandı.');
}

main()
  .catch((error) => {
    console.error('EPH Test Evreni V3 seed hatası:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
