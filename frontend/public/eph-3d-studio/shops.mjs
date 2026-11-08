// Zemin kat tabelaları. Gerçek marka adı çizilmez.
// Kaynak: mobil uygulama groundShopsData.ts (GROUND_SHOP_PRESETS). Stüdyoya gelen unit.conceptLabel önce kullanılır;
// etiket yoksa ya da "Mağaza" ise aşağıdaki sahte-ad listesi sırayla kullanılır.
const FICTIONAL = [
  { name: 'Yıldız Kırtasiyesi', sector: 'Genel İhtiyaç', color: '#D97706', ink: '#FFFFFF' },
  { name: 'Bizim Kasap', sector: 'Gıda', color: '#991B1B', ink: '#FFFFFF' },
  { name: 'Style Beauty Kuaför', sector: 'Kişisel Bakım', color: '#1E293B', ink: '#F472B6' },
  { name: 'Yeşil Manav', sector: 'Market', color: '#16A34A', ink: '#FFFFFF' },
  { name: 'Çıtır Ekmek Fırını', sector: 'PASTA', color: '#B45309', ink: '#FFFFFF' },
  { name: 'Sevinç Pastanesi', sector: 'PASTA', color: '#BE185D', ink: '#FFFFFF' },
  { name: 'Doyuran Pide Salonu', sector: 'restoran', color: '#EA580C', ink: '#FFFFFF' },
  { name: 'Pati Pet Shop', sector: 'sağlık', color: '#CA8A04', ink: '#FFFFFF' },
  { name: 'Erişkin Optik', sector: 'umumi', color: '#475569', ink: '#FFFFFF' },
  { name: 'Express Dry Clean', sector: 'Genel İhtiyaç', color: '#0D9488', ink: '#FFFFFF' },
  { name: 'Pit Stop Cafe', sector: 'cafe', color: '#78350F', ink: '#FFFFFF' },
  { name: 'Beyaz Zambak Butik Çiçekçi', sector: 'umumi', color: '#059669', ink: '#FFFFFF' }
];
// Gerçek marka / kurum adı gelirse sektör adıyla değiştirilir.
const REAL_TO_GENERIC = [
  [/garanti/, { name: 'Banka', sector: 'banka', color: '#008542', ink: '#FFFFFF' }],
  [/m[iı]gros/, { name: 'Süpermarket', sector: 'Market', color: '#F37021', ink: '#FFFFFF' }],
  [/yurt[iı]ç[iı]|yurtici/, { name: 'Kargo Noktası', sector: 'Kargo', color: '#0284C7', ink: '#FFFFFF' }],
  [/\bb[iı]m\b|a\s*[·.\-]?\s*101/, { name: 'İndirim Market', sector: 'Market', color: '#0284C7', ink: '#FFFFFF' }],
  [/şifa|sifa/, { name: 'Eczane', sector: 'TIP', color: '#DC2626', ink: '#FFFFFF' }]
];
const KNOWN = new Map(FICTIONAL.map(shop => [shop.name.toLocaleLowerCase('tr-TR'), shop]));

export function resolveShop(label, index = 0) {
  const name = String(label || '').trim(), key = name.toLocaleLowerCase('tr-TR');
  if (!name || key === 'mağaza' || key === 'magaza') return { ...FICTIONAL[Math.abs(index) % FICTIONAL.length], accent: '#FFFFFF' };
  for (const [pattern, generic] of REAL_TO_GENERIC) if (pattern.test(key)) return { ...generic, accent: '#FFFFFF' };
  const known = KNOWN.get(key);
  return { ...(known || { name, sector: key, color: '#466780', ink: '#FFFFFF' }), accent: '#FFFFFF' };
}
