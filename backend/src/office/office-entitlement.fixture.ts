/**
 * EPH-70B2 — TEST SABİTİ (yalnız spec dosyaları kullanır; üretim kodu içe aktarmaz). scripts/eph70b2_ayarlar.sql ile aynı değerler:
 * EPH_ODEME_SISTEMI.md §12 (KİLİTLİ). Kabul matrisi (B2.9) bu veriyle doğrulanır; değer değişirse hem SQL hem kilitli belge birlikte değişir.
 */
export const OFFICE_SETTINGS_FIXTURE: Record<string, unknown> = {
  OFFICE_MEMBERSHIP_PACKAGES: [
    { code: 'UCRETSIZ', name: 'Ofis Ücretsiz', price: 0, active: true, isCustomPrice: false, totalUsers: 1, agents: 0, portfolioCapacity: 10, crmCapacity: 50, monthlyPk: 0, trialDays: 0, kardesOfis: false, ofisBoyDahil: 0, ofisBoyEklenti: false },
    { code: 'DENEME', name: 'Ofis Deneme', price: 0, active: true, isCustomPrice: false, totalUsers: 6, agents: 5, portfolioCapacity: 300, monthlyPk: 500, trialDays: 14, kardesOfis: false, ofisBoyDahil: 0, ofisBoyEklenti: false },
    { code: 'SOLO', name: 'Ofis Solo', price: 500, active: true, isCustomPrice: false, totalUsers: 1, agents: 0, portfolioCapacity: 50, monthlyPk: 400, trialDays: 0, kardesOfis: false, ofisBoyDahil: 0, ofisBoyEklenti: true },
    { code: 'BRONZ', name: 'Ofis Bronz', price: 1350, active: true, isCustomPrice: false, totalUsers: 3, agents: 2, portfolioCapacity: 150, monthlyPk: 1200, trialDays: 0, kardesOfis: false, ofisBoyDahil: 0, ofisBoyEklenti: true },
    { code: 'GUMUS', name: 'Ofis Gümüş', price: 2500, active: true, isCustomPrice: false, totalUsers: 6, agents: 5, portfolioCapacity: 300, monthlyPk: 2400, trialDays: 0, kardesOfis: false, ofisBoyDahil: 0, ofisBoyEklenti: true },
    { code: 'ALTIN', name: 'Ofis Altın', price: 4950, active: true, isCustomPrice: false, totalUsers: 12, agents: 11, portfolioCapacity: 600, monthlyPk: 4800, trialDays: 0, kardesOfis: true, ofisBoyDahil: 0, ofisBoyEklenti: true },
    { code: 'PLATINUM', name: 'Ofis Platinum', price: 9950, active: true, isCustomPrice: false, totalUsers: 25, agents: 24, portfolioCapacity: 1250, monthlyPk: 10000, trialDays: 0, kardesOfis: true, ofisBoyDahil: 2, ofisBoyEklenti: false },
    { code: 'OFIS_25_PLUS', name: '25+ / Çok Şubeli', price: null, active: true, isCustomPrice: true, totalUsers: '25+', agents: 'Özel teklif', monthlyPk: 'Özel teklif', portfolioCapacity: 'Özel teklif', kardesOfis: true },
  ],
  OFFICE_ADDON_CONFIG: {
    ekKullanici: { aylikFiyat: 400, kisiBasiPortfoy: 50, kisiBasiPk: 400, enAzPaket: 'BRONZ', kademeler: [1, 2, 3, 5, 10] },
    ofisBoy: { aylikFiyat: 300, koltukPerUrun: 2, izinliPaketler: ['SOLO', 'BRONZ', 'GUMUS', 'ALTIN'], ofisBoyOzelUst: null },
  },
  OFFICE_TRIAL_CONFIG: { gun: 14, seviyePaketi: 'GUMUS', pk: 500, kartIstenir: false, hatirlatmaGunleri: [3, 1], kardesOfis: false, ofisBoy: false },
  OFFICE_FREE_LIMITS: { kullanici: 1, aktifPortfoy: 10, crm: 50, aylikPaketPk: 0, havuzIlanMax: 3, talepMax: 2, linaGunluk: 5, projeYonetimi: false, pasifGun: 90 },
};
