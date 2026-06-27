"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Gift,
  History,
  Loader2,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  WalletCards,
  Zap,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type KontorWalletResponse = {
  id?: string;
  ok?: boolean;
  balance?: number;
  bakiye?: number;
  toplamYukleme?: number;
  toplamHarcama?: number;
  toplamHediye?: number;
  aktifMi?: boolean;
  olusturulmaTarihi?: string;
  guncellenmeTarihi?: string;
};

type KontorHareket = {
  id: string;
  hareketTuru: string;
  islemTuru: string;
  kategori: string;
  miktar: number;
  oncekiBakiye: number;
  sonrakiBakiye: number;
  aciklama?: string | null;
  ilgiliKayitTuru?: string | null;
  ilgiliKayitId?: string | null;
  olusturulmaTarihi: string;
};

type KontorOzetKategori = {
  kod: string;
  adet: number;
  toplam: number;
};

type KontorOzetResponse = {
  cuzdan?: KontorWalletResponse;
  toplamlar?: {
    toplamHarcama?: number;
    toplamYukleme?: number;
    toplamHediye?: number;
    toplamIade?: number;
  };
  kategoriler?: KontorOzetKategori[];
};

type AktifPaket = {
  id: string;
  paketId: string;
  paketKodu: string;
  paketAdi: string;
  aciklama?: string | null;
  durum: string;
  aktifPortfoyLimiti: number;
  verilenKontor: number;
  fiyat?: string | number | null;
  paraBirimi: string;
  baslangicTarihi: string;
  bitisTarihi?: string | null;
  pilotPaketMi?: boolean;
  testPaketiMi?: boolean;
};

type MesajlasmaLimiti = {
  gunlukYeniGorusmeLimiti?: number;
  aylikYeniGorusmeLimiti?: number;
  mevcutKonusmaCevapSinirsizMi?: boolean;
  gunlukForumIlgiLimiti?: number;
  gunlukHavuzMesajLimiti?: number;
};

type KontorPaketResponse = {
  aktifPaket: AktifPaket | null;
  mesajlasmaLimiti: MesajlasmaLimiti | null;
};

const DEFAULT_WALLET: KontorWalletResponse = {
  ok: true,
  balance: 0,
  bakiye: 0,
  toplamYukleme: 0,
  toplamHarcama: 0,
  toplamHediye: 0,
  aktifMi: true,
};

const DEFAULT_OZET: KontorOzetResponse = {
  cuzdan: DEFAULT_WALLET,
  toplamlar: {
    toplamHarcama: 0,
    toplamYukleme: 0,
    toplamHediye: 0,
    toplamIade: 0,
  },
  kategoriler: [],
};

const HAVUZ_FEES = [
  {
    title: "Havuz Mesajı",
    desc: "Portföy sahibiyle mesaj başlatma",
    cost: 3,
  },
  {
    title: "İlgileniyorum",
    desc: "Portföye ilgi bildirimi gönderme",
    cost: 10,
  },
  {
    title: "Müşterim var",
    desc: "Eşleşen müşteri bildirimi gönderme",
    cost: 20,
  },
];

const TRIAL_PACKAGES = [
  {
    title: "Deneme Paketi",
    amount: "500 kontör",
    desc: "Yeni üyeler için platform deneme bakiyesi.",
    badge: "Hediye",
  },
  {
    title: "Büyüme Paketi",
    amount: "1.000 kontör",
    desc: "Aktif havuz kullanımı için talep oluştur.",
    badge: "Talep",
  },
  {
    title: "Ofis Paketi",
    amount: "5.000 kontör",
    desc: "Ekip ve ofis kullanımı için talep oluştur.",
    badge: "Talep",
  },
];

const KATEGORI_LABELS: Record<string, string> = {
  HAVUZ_MESAJ: "Havuz Mesaj",
  HAVUZ_ILGILENIYORUM: "İlgileniyorum",
  HAVUZ_MUSTERIM_VAR: "Müşterim Var",
  FORUM_ISLEMLERI: "Forum İşlemleri",
  FORUM_MESAJ: "Forum Mesajı",
  FORUM_ILGILENIYORUM: "Forum İlgileniyorum",
  FORUM_YARDIMCI_OLABILIRIM: "Forum Yardımcı Olabilirim",
  PORTFOY_ONE_CIKARMA: "Portföy Öne Çıkarma",
  LINA_ISLEMLERI: "Lina İşlemleri",
  DIGER: "Diğer",
};

const ISLEM_LABELS: Record<string, string> = {
  FORUM_ACIL_ETIKETI: "Forum Acil Etiketi",
  FORUM_SABITLEME: "Forum Sabitleme",
  FORUM_VITRIN: "Forum Vitrin",
  HAVUZ_MESAJ: "Havuz Mesaj",
  HAVUZ_ILGILENIYORUM: "İlgileniyorum",
  HAVUZ_ESLESEN_MUSTERIM_VAR: "Müşterim Var",
  FORUM_MESAJ: "Forum Mesajı",
  FORUM_ILGILENIYORUM: "Forum İlgileniyorum",
  FORUM_YARDIMCI_OLABILIRIM: "Forum Yardımcı Olabilirim",
  PORTFOY_ONE_CIKARMA: "Portföy Öne Çıkarma",
  LINA_ILAN_ACIKLAMASI: "Lina İlan Açıklaması",
  LINA_ILAN_DUZENLEME: "Lina İlan Düzenleme",
  LINA_SESTEN_ILAN: "Lina Sesten İlan",
  SOSYAL_MEDYA_METNI: "Sosyal Medya Metni",
  INSTAGRAM_GONDERISI: "Instagram Gönderisi",
  INSTAGRAM_REELS: "Instagram Reels",
  WHATSAPP_PORTFOY_KARTI: "WhatsApp Portföy Kartı",
  PDF_PORTFOY_DOSYASI: "PDF Portföy Dosyası",
  TOPLU_ISLEM: "Toplu İşlem",
  TOPLU_EPOSTA: "Toplu E-posta",
  EK_GORUSME_HAKKI: "Ek Görüşme Hakkı",
  DIGER: "Diğer",
};

function asNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getBalance(wallet: KontorWalletResponse) {
  return asNumber(wallet.bakiye ?? wallet.balance);
}

function getWalletStatusLabel(active?: boolean) {
  return active === false ? "Pasif" : "Aktif";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Tarih okunamadı";
  }
}

function formatShortDate(value?: string | null) {
  if (!value) return "Süresiz";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Tarih okunamadı";
  }
}

function getKategoriLabel(kod: string) {
  return KATEGORI_LABELS[kod] || kod.replaceAll("_", " ");
}

function getIslemLabel(kod: string) {
  return ISLEM_LABELS[kod] || kod.replaceAll("_", " ");
}

function getHareketSign(hareketTuru: string) {
  if (hareketTuru === "HARCAMA") return "-";
  if (hareketTuru === "IADE") return "+";
  if (hareketTuru === "HEDIYE") return "+";
  if (hareketTuru === "YUKLEME") return "+";
  if (hareketTuru === "DUZELTME") return "";
  return "";
}

function getHareketTone(hareketTuru: string) {
  if (hareketTuru === "HARCAMA") {
    return "border-rose-100 bg-rose-50 text-rose-700";
  }

  if (hareketTuru === "YUKLEME" || hareketTuru === "HEDIYE" || hareketTuru === "IADE") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  return "border-blue-100 bg-blue-50 text-blue-700";
}

export default function KontorPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const [wallet, setWallet] = useState<KontorWalletResponse>(DEFAULT_WALLET);
  const [hareketler, setHareketler] = useState<KontorHareket[]>([]);
  const [ozet, setOzet] = useState<KontorOzetResponse>(DEFAULT_OZET);
  const [paket, setPaket] = useState<KontorPaketResponse>({
    aktifPaket: null,
    mesajlasmaLimiti: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const balance = getBalance(wallet);
  const totalGift = asNumber(wallet.toplamHediye ?? ozet.toplamlar?.toplamHediye);
  const totalSpent = asNumber(wallet.toplamHarcama ?? ozet.toplamlar?.toplamHarcama);
  const totalLoaded = asNumber(wallet.toplamYukleme ?? ozet.toplamlar?.toplamYukleme);
  const totalRefund = asNumber(ozet.toplamlar?.toplamIade);

  const sonHareketler = useMemo(() => hareketler.slice(0, 10), [hareketler]);

  const usageRatio = useMemo(() => {
    const base = totalGift + totalLoaded;
    if (!base) return 0;
    return Math.min(100, Math.round((totalSpent / base) * 100));
  }, [totalGift, totalLoaded, totalSpent]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    loadKontorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, user?.id]);

  async function loadKontorData() {
    setError("");
    setRefreshing(true);

    try {
      const cacheKey = Date.now();

      const [walletResponse, hareketlerResponse, ozetResponse, paketResponse] = await Promise.all([
        api.get(`/kontor/cuzdan?t=${cacheKey}`),
        api.get(`/kontor/hareketler?t=${cacheKey}`),
        api.get(`/kontor/ozet?t=${cacheKey}`),
        api.get(`/kontor/paket?t=${cacheKey}`),
      ]);

      setWallet({ ...DEFAULT_WALLET, ...(walletResponse.data || {}) });
      setHareketler(Array.isArray(hareketlerResponse.data) ? hareketlerResponse.data : []);
      setOzet({ ...DEFAULT_OZET, ...(ozetResponse.data || {}) });
      setPaket({
        aktifPaket: paketResponse.data?.aktifPaket || null,
        mesajlasmaLimiti: paketResponse.data?.mesajlasmaLimiti || null,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Kontör bilgileri yüklenemedi.");
      setWallet(DEFAULT_WALLET);
      setHareketler([]);
      setOzet(DEFAULT_OZET);
      setPaket({ aktifPaket: null, mesajlasmaLimiti: null });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (!hasHydrated || loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#F4F8FF] px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-[#1F2937]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#2563EB]" size={30} />
          <p className="mt-3 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Kontör Cüzdanı
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-[#F4F8FF] pb-[calc(92px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-[#1F2937]">
      <header className="sticky top-0 z-40 border-b border-[#C7D6E8] bg-white/95 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/crm"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#1F2937] shadow-sm"
              aria-label="CRM ekranına dön"
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-center text-[20px] font-black tracking-[-0.04em] text-[#1F2937] sm:text-left">
                Kontör Cüzdanı
              </h1>
              <p className="text-center text-[12px] font-bold text-slate-500 sm:text-left">
                Bakiye, hareket geçmişi ve paket merkezi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadKontorData}
            disabled={refreshing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C7D6E8] bg-white text-[#1F2937] shadow-sm disabled:opacity-60"
            aria-label="Yenile"
          >
            {refreshing ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 py-3 lg:px-6">
        {error ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center text-[13px] font-black text-amber-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[30px] border border-[#C7D6E8] bg-white shadow-sm">
          <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#2563EB] text-white shadow-sm">
              <WalletCards size={28} />
            </div>
            <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              EPH Kontör Ekonomisi V2
            </p>
            <h2 className="mt-1 text-[34px] font-black tracking-[-0.06em] text-[#1F2937]">
              {balance} kontör
            </h2>
            <p className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
              Kontör içerik görüntülemek için değil, iş fırsatı ve iletişim aksiyonu başlatmak için kullanılır.
            </p>
            <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-[#C7D6E8] bg-white px-3 py-1.5 text-[11px] font-black text-[#2563EB] shadow-sm">
              <CheckCircle2 size={15} /> Cüzdan Durumu: {getWalletStatusLabel(wallet.aktifMi)}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <WalletStat label="Mevcut Bakiye" value={balance} suffix="kontör" icon={<WalletCards size={19} />} />
          <WalletStat label="Hediye Kontör" value={totalGift} suffix="kontör" icon={<Gift size={19} />} />
          <WalletStat label="Toplam Harcama" value={totalSpent} suffix="kontör" icon={<History size={19} />} />
          <WalletStat label="Toplam Yükleme" value={totalLoaded} suffix="kontör" icon={<Zap size={19} />} />
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[16px] font-black text-[#1F2937]">Kullanım Özeti</h2>
                <p className="mt-1 text-[12px] font-bold text-slate-500">
                  Hediye ve yüklenen kontörlere göre toplam kullanım oranı.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                %{usageRatio}
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#EEF3F8]">
              <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${usageRatio}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniStat label="İade" value={totalRefund} suffix="kontör" />
              <MiniStat label="Hareket" value={hareketler.length} suffix="kayıt" />
            </div>
          </section>

          <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[16px] font-black text-[#1F2937]">Aktif Paket</h2>
                <p className="mt-1 text-[12px] font-bold text-slate-500">
                  Üyelik ve mesaj limitleri.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                Gerçek veri
              </span>
            </div>

            {paket.aktifPaket ? (
              <div className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#2563EB] shadow-sm">
                        <PackageCheck size={13} /> {paket.aktifPaket.paketKodu}
                      </span>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                        {paket.aktifPaket.durum}
                      </span>
                    </div>
                    <h3 className="mt-2 text-[17px] font-black tracking-[-0.03em] text-[#1F2937]">
                      {paket.aktifPaket.paketAdi}
                    </h3>
                    <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
                      {paket.aktifPaket.aciklama || "Paket açıklaması bulunmuyor."}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-2xl bg-white px-3 py-2 text-center shadow-sm">
                    <span className="block text-[16px] font-black text-[#2563EB]">
                      {paket.aktifPaket.verilenKontor}
                    </span>
                    <span className="block text-[10px] font-black text-slate-500">kontör</span>
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <InfoBox
                    icon={<CalendarDays size={15} />}
                    label="Başlangıç"
                    value={formatShortDate(paket.aktifPaket.baslangicTarihi)}
                  />
                  <InfoBox
                    icon={<CalendarDays size={15} />}
                    label="Bitiş"
                    value={formatShortDate(paket.aktifPaket.bitisTarihi)}
                  />
                  <InfoBox
                    icon={<ReceiptText size={15} />}
                    label="Portföy Limiti"
                    value={`${paket.aktifPaket.aktifPortfoyLimiti}`}
                  />
                  <InfoBox
                    icon={<MessageCircle size={15} />}
                    label="Aylık Görüşme"
                    value={`${paket.mesajlasmaLimiti?.aylikYeniGorusmeLimiti ?? 0}`}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#C7D6E8] bg-[#F8FAFC] p-4 text-center">
                <PackageCheck className="mx-auto text-[#2563EB]" size={26} />
                <h3 className="mt-2 text-[15px] font-black text-[#1F2937]">Aktif paket bulunamadı</h3>
                <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
                  Paket talebi oluşturabilirsiniz. Ödeme alınmaz, talep Yazılım Ekibi tarafından incelenir.
                </p>
              </div>
            )}
          </section>
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Harcama Dağılımı" actionText="Kategori">
            {ozet.kategoriler && ozet.kategoriler.length > 0 ? (
              <div className="grid gap-2">
                {ozet.kategoriler.map((item) => (
                  <article key={item.kod} className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-black text-[#1F2937]">
                          {getKategoriLabel(item.kod)}
                        </h3>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">
                          {item.adet} işlem
                        </p>
                      </div>
                      <span className="shrink-0 rounded-2xl bg-white px-3 py-2 text-center shadow-sm">
                        <span className="block text-[16px] font-black text-[#2563EB]">{item.toplam}</span>
                        <span className="block text-[10px] font-black text-slate-500">kontör</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="Henüz harcama yok" desc="Kontörlü aksiyon kullandığınızda dağılım burada görünür." />
            )}
          </Panel>

          <Panel title="Son 10 Hareket" actionText="Canlı">
            {sonHareketler.length > 0 ? (
              <div className="grid gap-2">
                {sonHareketler.map((hareket) => (
                  <article key={hareket.id} className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${getHareketTone(hareket.hareketTuru)}`}>
                            {hareket.hareketTuru}
                          </span>
                          <span className="inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                            {formatDate(hareket.olusturulmaTarihi)}
                          </span>
                        </div>
                        <h3 className="mt-2 text-[13px] font-black text-[#1F2937]">
                          {getIslemLabel(hareket.islemTuru)}
                        </h3>
                        <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                          {hareket.aciklama || getKategoriLabel(hareket.kategori)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-2xl bg-white px-3 py-2 text-center shadow-sm">
                        <span className="block text-[16px] font-black text-[#2563EB]">
                          {getHareketSign(hareket.hareketTuru)}
                          {hareket.miktar}
                        </span>
                        <span className="block text-[10px] font-black text-slate-500">kontör</span>
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <MiniStat label="Önceki" value={hareket.oncekiBakiye} suffix="kontör" />
                      <MiniStat label="Sonraki" value={hareket.sonrakiBakiye} suffix="kontör" />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="Hareket bulunamadı" desc="Yükleme, hediye veya harcama olduğunda burada listelenir." />
            )}
          </Panel>
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Havuz İşlem Ücretleri" actionText="Gerçek ücret">
            <div className="space-y-2">
              {HAVUZ_FEES.map((item) => (
                <article key={item.title} className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-black text-[#1F2937]">{item.title}</h3>
                      <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{item.desc}</p>
                    </div>
                    <span className="shrink-0 rounded-2xl bg-white px-3 py-2 text-center shadow-sm">
                      <span className="block text-[18px] font-black text-[#2563EB]">{item.cost}</span>
                      <span className="block text-[10px] font-black text-slate-500">kontör</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Paket Talebi" actionText="Ödeme yok">
            <div className="grid gap-2">
              {TRIAL_PACKAGES.map((item) => (
                <article key={item.title} className="rounded-3xl border border-[#C7D6E8] bg-[#F8FAFC] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                        {item.badge}
                      </span>
                      <h3 className="mt-2 text-[14px] font-black text-[#1F2937]">{item.title}</h3>
                      <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{item.desc}</p>
                    </div>
                    <span className="shrink-0 rounded-2xl bg-white px-3 py-2 text-center shadow-sm">
                      <span className="block text-[14px] font-black text-[#2563EB]">{item.amount}</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <Link
              href="/messages"
              className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-[13px] font-black text-white shadow-sm active:scale-[0.98]"
            >
              <MessageCircle size={18} /> Paket Talebi Oluştur
            </Link>
            <p className="mt-2 text-center text-[11px] font-bold leading-5 text-slate-500">
              Bu buton ödeme almaz. Talep için mesajlar ekranına yönlendirir.
            </p>
          </Panel>
        </section>

        <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 text-center shadow-sm">
          <Sparkles className="mx-auto text-[#2563EB]" size={25} />
          <h2 className="mt-2 text-[16px] font-black text-[#1F2937]">Lina Kontör Notu</h2>
          <p className="mt-1 text-[12px] font-bold leading-6 text-slate-500">
            Kontör içerik görmek için değil, iş fırsatı ve iletişim aksiyonları için kullanılır. Havuz listeleme ve detay görüntüleme ücretsiz kalır.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <InfoPill icon={<ShieldCheck size={15} />} text="Listeleme ücretsiz" />
            <InfoPill icon={<CheckCircle2 size={15} />} text="Detay görüntüleme ücretsiz" />
            <InfoPill icon={<WalletCards size={15} />} text="Aksiyonlar kontörlü" />
          </div>
        </section>
      </section>
    </main>
  );
}

function Panel({ title, actionText, children }: { title: string; actionText?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#C7D6E8] bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-center text-[16px] font-black text-[#1F2937] sm:text-left">{title}</h2>
        {actionText ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">{actionText}</span> : null}
      </div>
      {children}
    </section>
  );
}

function WalletStat({ label, value, suffix, icon }: { label: string; value: number; suffix: string; icon: React.ReactNode }) {
  return (
    <article className="min-h-[104px] rounded-3xl border border-[#C7D6E8] bg-white p-3 text-center shadow-sm">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
        {icon}
      </div>
      <p className="mt-2 text-[11px] font-black uppercase leading-tight text-slate-500">{label}</p>
      <p className="mt-1 text-[21px] font-black tracking-[-0.03em] text-[#1F2937]">{value}</p>
      <p className="text-[10px] font-black text-slate-400">{suffix}</p>
    </article>
  );
}

function MiniStat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-2xl border border-[#C7D6E8] bg-white px-3 py-2 text-center shadow-sm">
      <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 text-[15px] font-black text-[#1F2937]">{value}</p>
      <p className="text-[9px] font-black text-slate-400">{suffix}</p>
    </div>
  );
}

function InfoBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C7D6E8] bg-white p-2 text-center shadow-sm">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
        {icon}
      </div>
      <p className="mt-1 text-[10px] font-black uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 text-[11px] font-black leading-4 text-[#1F2937]">{value}</p>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#C7D6E8] bg-[#F8FAFC] p-4 text-center">
      <TrendingDown className="mx-auto text-[#2563EB]" size={24} />
      <h3 className="mt-2 text-[14px] font-black text-[#1F2937]">{title}</h3>
      <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{desc}</p>
    </div>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-h-[38px] items-center justify-center gap-2 rounded-2xl border border-[#C7D6E8] bg-[#F8FAFC] px-3 text-[11px] font-black text-[#1F2937]">
      <span className="text-[#2563EB]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}