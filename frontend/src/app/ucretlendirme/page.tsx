"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Check,
  CreditCard,
  Building2,
  UsersRound,
  Zap,
  Sparkles,
  HelpCircle,
  Lock,
  ArrowRight,
  RotateCw,
  X,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type MembershipPackage = {
  paketKodu: string;
  segment: string;
  paketAdi: string;
  fiyat: number | null;
  paraBirimi: string;
  aktifPortfoyLimiti: number;
  aktifCrmLimiti: number;
  aylikPaketPk: number;
  projeLimiti?: number | null;
  projeIlanLimiti?: number | null;
  denemeGunSayisi?: number | null;
  aylikTalepLimiti: number;
  aylikHavuzGonderimLimiti: number;
  ofisAltKullaniciLimiti?: number | null;
};

type PkProduct = {
  name: string;
  credits: number;
  price: number;
  code?: string;
};

type LegalTerms = {
  seller?: {
    name?: string;
    address?: string;
    taxOffice?: string;
    taxNumber?: string;
    email?: string;
    phone?: string;
  };
  delivery?: string;
  refunds?: string;
  sales?: string;
  privacy?: string;
};

const faqs = [
  {
    question: "Ödeme altyapısı ne kadar güvenli?",
    answer:
      "Tüm ödemeler BDDK lisanslı ve TCMB onaylı iyzico Sanal POS altyapısı ve 3D Secure (SMS şifreli) güvenlik protokolü ile gerçekleştirilir. Kredi kartı bilgileriniz hiçbir şekilde EPH sunucularında tutulmaz.",
  },
  {
    question: "Satın aldığım paket ne zaman aktif olur?",
    answer:
      "iyzico ödemeniz onaylandığı anda paketiniz ve Portföy Krediniz (PK) EPH hesabınıza anında yüklenir. Mobil uygulamanızı açtığınızda güncel haklarınız hemen kullanılabilir.",
  },
  {
    question: "Portföy Kredisi (PK) nedir?",
    answer:
      "Portföy Kredisi (PK), havuzdaki ilanlarla iletişime geçme, proje detaylarına erişim ve sıcak talep sahipleriyle bağlantı kurma gibi özel iş fırsatlarında kullanılan platform kredinizdir.",
  },
  {
    question: "Ofis paketleri neleri içerir?",
    answer:
      "Ofis paketleri, ofis sahibi broker ve bağlı danışmanların tek bir ortak havuz, CRM ve ofis cüzdanı üzerinden koordineli çalışmasını sağlayan kurumsal çözümlerdir.",
  },
];

type OfficePackage = {
  code: string;
  name: string;
  custom?: boolean;
  price?: number | null;
  users?: number | null;
  portfolio?: number | null;
  monthlyPk?: number | null;
  crm?: number | null;
  kardesOfis?: boolean;
  ofisBoyDahil?: number;
  ofisBoyEklenti?: boolean;
};

type OfficeCatalog = {
  packages?: OfficePackage[];
  free?: { crm?: number | null; talepMax?: number | null; havuzIlanMax?: number | null };
};

type TariffCost = { key: string; value: number | null; source?: string };
const costLabels: Record<string, string> = {
  COST_HAVUZ_PORTFOY_YAYIN: "Havuza portföy yayınlama",
  COST_PROJE_HAVUZ: "Proje havuzu yayını",
  COST_OZEL_BILGI: "İletişime Geç",
  COST_TALEP_YAYIN: "Talep yayınlama",
  COST_TALEP_ACIL_EK: "Acil talep ek ücreti",
  COST_YETKI_MEKTUBU_ASIM: "Yetki mektubu kota aşımı",
  COST_SISTER_TALEP_ASIM: "Kardeş Ofis talep kota aşımı",
  COST_ESLESME_TARAMA: "Eşleşme taraması",
};

function formatQuantity(value: unknown): string | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value.toLocaleString("tr-TR") : null;
}

function formatLimit(value: unknown): string | null {
  return value === null || value === -1 ? "Sınırsız" : formatQuantity(value);
}

function officeComparisonRows(catalog: OfficeCatalog | null, items: OfficePackage[]) {
  const paid = (item: OfficePackage) => typeof item.price === "number" && item.price > 0;
  const rows: { label: string; value: (item: OfficePackage) => string | null }[] = [
    { label: "Aylık fiyat (KDV dahil)", value: (item) => typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0 ? `${item.price.toLocaleString("tr-TR")} ₺` : null },
    { label: "Kullanıcı", value: (item) => formatQuantity(item.users) },
    { label: "Aktif Portföy", value: (item) => formatQuantity(item.portfolio) },
    { label: "Aylık PK", value: (item) => formatQuantity(item.monthlyPk) },
    { label: "Kardeş Ofis", value: (item) => typeof item.kardesOfis === "boolean" ? (item.kardesOfis ? "Dahil" : "Kapalı") : null },
    { label: "Ofis Boy", value: (item) => {
      const seats = formatQuantity(item.ofisBoyDahil);
      if (seats === null) return null;
      if (item.ofisBoyDahil! > 0) return `${seats} dahil`;
      return typeof item.ofisBoyEklenti === "boolean" ? (item.ofisBoyEklenti ? "Eklenti" : "Kapalı") : null;
    } },
    // §11/20: ücretli ofis paketlerinde bu üç kullanım sınırsızdır.
    { label: "CRM", value: (item) => paid(item) ? "Sınırsız" : formatLimit(item.code === "UCRETSIZ" ? catalog?.free?.crm : item.crm) },
    { label: "Talep", value: (item) => paid(item) ? "Sınırsız" : item.code === "UCRETSIZ" ? formatLimit(catalog?.free?.talepMax) : null },
    { label: "Havuz ilanı", value: (item) => paid(item) ? "Sınırsız" : item.code === "UCRETSIZ" ? formatLimit(catalog?.free?.havuzIlanMax) : null },
  ];
  // Tek bir pakette bile alan eksikse satırı gizle; yedek ticari değer yok.
  return rows.map(({ label, value }) => ({ label, cells: items.map(value) }))
    .filter((row) => row.cells.every((cell) => cell !== null));
}

export default function UcretlendirmePage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"PACKAGES" | "PK">("PACKAGES");
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [officeCatalog, setOfficeCatalog] = useState<OfficeCatalog | null>(null);
  const [costs, setCosts] = useState<TariffCost[]>([]);
  const [purchaseCatalog, setPurchaseCatalog] = useState<{ enabled?: boolean; termsVersion?: string } | null>(null);
  const [pkProducts, setPkProducts] = useState<PkProduct[]>([]);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [legalApproved, setLegalApproved] = useState(false);
  const [termsVersion, setTermsVersion] = useState<string>("");
  const [legalTerms, setLegalTerms] = useState<LegalTerms | null>(null);
  const [loading, setLoading] = useState(true);

  // Checkout Modal State
  const [selectedProduct, setSelectedProduct] = useState<{
    kind: "MEMBERSHIP" | "PK";
    code: string;
    title: string;
    price: number;
    description: string;
  } | null>(null);

  // Billing Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [phone, setPhone] = useState("+90");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [address, setAddress] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [termsModal, setTermsModal] = useState<"PRE_INFO" | "SALES" | null>(null);
  const checkoutAttempt = useRef<{ signature: string; key: string } | null>(null);
  const checkoutInFlight = useRef(false);
  const legalReady = legalApproved && /^[a-f0-9]{64}$/.test(termsVersion) && purchaseCatalog?.termsVersion === termsVersion && [
    legalTerms?.seller?.name, legalTerms?.seller?.address,
    legalTerms?.seller?.taxOffice, legalTerms?.seller?.taxNumber,
    legalTerms?.seller?.email, legalTerms?.seller?.phone,
    legalTerms?.delivery, legalTerms?.refunds, legalTerms?.sales, legalTerms?.privacy,
  ].every((text) => typeof text === "string" && text.trim().length > 0);
  const purchaseReady = !loading && paymentEnabled && legalReady;
  const purchaseBlockMessage = !paymentEnabled
    ? "Kartlı ödeme şu anda kullanılamıyor."
    : !legalReady ? "Onaylı ödeme koşulları eksik. Satın alma şu anda kullanılamıyor." : null;
  const comparisonPackages = (officeCatalog?.packages || []).filter((item) =>
    item.custom !== true && item.code !== "DENEME" && item.code?.trim() && item.name?.trim());
  const comparisonRows = officeComparisonRows(officeCatalog, comparisonPackages);
  const creditUses = costs.filter((cost) => costLabels[cost.key] && formatQuantity(cost.value) !== null)
    .map((cost) => [costLabels[cost.key], `${formatQuantity(cost.value)} PK`]);

  // Fetch Catalog & Legal info
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [catalogRes, legalRes] = await Promise.allSettled([
          api.get<{ officeCatalog?: OfficeCatalog | null; packages: MembershipPackage[]; pkProducts: PkProduct[] }>(
            "/payments/public-catalog"
          ),
          api.get<{ terms: LegalTerms; termsVersion: string; approved: boolean }>("/payments/legal"),
        ]);

        if (!isMounted) return;

        if (catalogRes.status === "fulfilled") {
          setPackages(catalogRes.value.data.packages || []);
          setOfficeCatalog(catalogRes.value.data.officeCatalog || null);
          setPkProducts(catalogRes.value.data.pkProducts || []);
        }

        if (legalRes.status === "fulfilled") {
          setLegalTerms(legalRes.value.data.terms || null);
          setTermsVersion(legalRes.value.data.termsVersion || "");
          setLegalApproved(legalRes.value.data.approved === true);
        }
      } catch (err) {
        console.error("Katalog yüklenemedi:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    setCosts([]);
    setPurchaseCatalog(null);
    setPaymentEnabled(false);
    if (token) {
      void Promise.allSettled([
        api.get<{ costs: TariffCost[] }>("/pricing/tariff"),
        api.get<{ enabled: boolean; termsVersion: string }>("/payments/catalog"),
      ]).then(([tariff, catalog]) => {
        if (!current) return;
        if (tariff.status === "fulfilled" && Array.isArray(tariff.value.data.costs)) setCosts(tariff.value.data.costs);
        if (catalog.status === "fulfilled") {
          setPurchaseCatalog(catalog.value.data);
          setPaymentEnabled(catalog.value.data.enabled === true);
        }
      });
    }
    return () => { current = false; };
  }, [token]);

  // Prefill user data when modal opens
  useEffect(() => {
    if (user && selectedProduct) {
      if (user.firstName && !firstName) setFirstName(user.firstName);
      if (user.lastName && !lastName) setLastName(user.lastName);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user, selectedProduct]);

  const handleStartPurchase = (
    kind: "MEMBERSHIP" | "PK",
    code: string | undefined,
    title: string,
    price: number,
    description: string
  ) => {
    if (!purchaseReady || !code?.trim() || checkoutInFlight.current) return;
    setCheckoutError(null);
    setAcceptedTerms(false);
    setTermsModal(null);
    setSelectedProduct({ kind, code, title, price, description });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || checkoutInFlight.current) return;
    if (!purchaseReady || !selectedProduct.code?.trim()) {
      setCheckoutError(purchaseBlockMessage || "Ürün bilgisi eksik. Satın alma kullanılamıyor.");
      return;
    }

    if (!token) {
      router.push(`/giris?next=/ucretlendirme`);
      return;
    }

    if (!acceptedTerms) {
      setCheckoutError("Lütfen Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Koşullarını onaylayınız.");
      return;
    }

    const cleanTc = identityNumber.trim();
    if (!/^[1-9][0-9]{10}$/.test(cleanTc)) {
      setCheckoutError("Geçerli bir 11 haneli T.C. Kimlik Numarası giriniz (Fatura düzenleme zorunluluğu).");
      return;
    }

    let cleanPhone = phone.trim().replace(/\s+/g, "");
    if (!cleanPhone.startsWith("+90")) {
      if (cleanPhone.startsWith("0")) cleanPhone = "+9" + cleanPhone;
      else cleanPhone = "+90" + cleanPhone;
    }
    if (!/^\+90[0-9]{10}$/.test(cleanPhone)) {
      setCheckoutError("Geçerli bir telefon numarası giriniz (+90 5XX XXX XX XX).");
      return;
    }

    if (address.trim().length < 10) {
      setCheckoutError("Lütfen en az 10 karakterlik açık adres belirtiniz.");
      return;
    }

    checkoutInFlight.current = true;
    setCheckoutSubmitting(true);
    setCheckoutError(null);

    try {
      const payload = {
        kind: selectedProduct.kind,
        productCode: selectedProduct.code,
        termsVersion,
        acceptedTerms: true,
        billing: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: cleanPhone,
          identityNumber: cleanTc,
          address: address.trim(),
          city: city.trim(),
        },
      };

      // Identical retries reuse the key; changed account/order data starts a new attempt.
      const signature = JSON.stringify([user?.id, token, payload]);
      if (checkoutAttempt.current?.signature !== signature) {
        checkoutAttempt.current = { signature, key: `eph_web_${crypto.randomUUID()}` };
      }

      const response = await api.post<{ orderId: string; status: string; checkoutUrl: string }>(
        "/payments/checkout",
        payload,
        {
          headers: {
            "idempotency-key": checkoutAttempt.current.key,
          },
        }
      );

      if (response.data?.checkoutUrl) {
        // Redirect to iyzico official hosted checkout form
        window.location.href = response.data.checkoutUrl;
      } else {
        throw new Error("Ödeme oturumu oluşturulamadı. Lütfen tekrar deneyiniz.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Ödeme başlatılamadı. Lütfen bilgilerinizi kontrol ediniz.";
      setCheckoutError(msg);
      checkoutInFlight.current = false;
      setCheckoutSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0F2747]">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0F2747] to-[#1E3A8A] px-4 pt-16 pb-20 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wide text-[#93C5FD] backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-[#34D399]" /> iyzico 3D Secure Güvencesiyle
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            EPH Üyelik Paketleri & Portföy Kredisi
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-[#BFDBFE] sm:text-base">
            Kapalı devre gayrimenkul iş ağında portföy paylaşımı, sıcak talep eşleşmesi ve CRM yönetimi için ihtiyacınıza uygun paketi hemen seçin.
          </p>

          {/* Tab Selector */}
          <div className="mt-8 inline-flex rounded-2xl bg-white/10 p-1.5 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("PACKAGES")}
              className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                activeTab === "PACKAGES"
                  ? "bg-white text-[#0F2747] shadow-lg shadow-black/10"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Üyelik Paketleri
            </button>
            <button
              onClick={() => setActiveTab("PK")}
              className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                activeTab === "PK"
                  ? "bg-white text-[#0F2747] shadow-lg shadow-black/10"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Portföy Kredisi (PK)
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-6xl px-4 -mt-10">
        {!loading && purchaseBlockMessage && (
          <p role="status" className="mb-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-center text-sm text-[#92400E]">
            {purchaseBlockMessage}
          </p>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-16 shadow-xl shadow-[#0F2747]/5">
            <RotateCw className="h-10 w-10 animate-spin text-[#1D4ED8]" />
            <p className="mt-4 text-sm font-bold text-[#64748B]">Güncel paketler ve fiyatlar yükleniyor...</p>
          </div>
        ) : activeTab === "PACKAGES" ? (
          /* Packages Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const isPaid = typeof pkg.fiyat === "number" && pkg.fiyat > 0;
              const isPro = pkg.segment === "EMLAK_PRO";

              return (
                <div
                  key={pkg.paketKodu}
                  className="flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-xl shadow-[#0F2747]/5 transition-all hover:shadow-2xl hover:border-[#BFDBFE]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-[#EFF6FF] px-3 py-1 text-xs font-black text-[#1D4ED8]">
                        {isPro ? "EMLAK DANIŞMANI" : pkg.segment}
                      </span>
                      {pkg.aylikPaketPk > 0 && (
                        <span className="flex items-center gap-1 rounded-xl bg-[#FEF3C7] px-2.5 py-1 text-xs font-black text-[#B45309]">
                          <Zap className="h-3 w-3" /> {pkg.aylikPaketPk.toLocaleString("tr-TR")} PK / Ay
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-xl font-black text-[#0F2747]">{pkg.paketAdi}</h3>

                    <div className="mt-4 flex items-baseline gap-1">
                      {isPaid ? (
                        <>
                          <span className="text-4xl font-black tracking-tight text-[#1D4ED8]">
                            {pkg.fiyat?.toLocaleString("tr-TR")}
                          </span>
                          <span className="text-sm font-bold text-[#64748B]">₺ / Ay</span>
                        </>
                      ) : (
                        <span className="text-3xl font-black text-[#059669]">Deneme Sürümü</span>
                      )}
                    </div>

                    <div className="mt-6 space-y-2.5 border-t border-[#F1F5F9] pt-6">
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-[#334155]">
                        <Check className="h-4 w-4 text-[#059669] shrink-0" />
                        <span>{pkg.aktifPortfoyLimiti} Aktif Portföy Kapasitesi</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-[#334155]">
                        <Check className="h-4 w-4 text-[#059669] shrink-0" />
                        <span>
                          {pkg.aktifCrmLimiti === -1 ? "Sınırsız" : pkg.aktifCrmLimiti} Müşteri & Talep CRM
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-[#334155]">
                        <Check className="h-4 w-4 text-[#059669] shrink-0" />
                        <span>Aylık {pkg.aylikTalepLimiti} Talep Havuzu Gönderimi</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-[#334155]">
                        <Check className="h-4 w-4 text-[#059669] shrink-0" />
                        <span>Aylık {pkg.aylikHavuzGonderimLimiti} Portföy Havuzu Paylaşımı</span>
                      </div>
                      {typeof pkg.ofisAltKullaniciLimiti === "number" && pkg.ofisAltKullaniciLimiti > 0 && (
                        <div className="flex items-center gap-2.5 text-xs font-bold text-[#7C3AED]">
                          <UsersRound className="h-4 w-4 text-[#7C3AED] shrink-0" />
                          <span>+{pkg.ofisAltKullaniciLimiti} Ek Danışman Hesabı</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-4">
                    {isPaid ? (
                      <button
                        disabled={!purchaseReady || !pkg.paketKodu?.trim()}
                        onClick={() =>
                          handleStartPurchase(
                            "MEMBERSHIP",
                            pkg.paketKodu,
                            pkg.paketAdi,
                            pkg.fiyat!,
                            `${pkg.paketAdi} (Aylık Üyelik)`
                          )
                        }
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-[#1D4ED8]/25 transition-all hover:bg-[#1E40AF] disabled:opacity-50"
                      >
                        <CreditCard className="h-4 w-4" /> iyzico ile Satın Al
                      </button>
                    ) : (
                      <Link
                        href={token ? "/" : "/kayit"}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#ECFDF5] py-3.5 px-4 text-sm font-bold text-[#047857] transition-all hover:bg-[#D1FAE5]"
                      >
                        {token ? "Mevcut Paketiniz" : "Hemen Kayıt Ol"}
                      </Link>
                    )}
                  </div>
                  {isPaid && !pkg.paketKodu?.trim() && (
                    <p role="status" className="mt-2 text-sm text-[#BE123C]">Ürün bilgisi eksik. Satın alma kullanılamıyor.</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* PK Products Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pkProducts.length > 0 ? (
              pkProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-xl shadow-[#0F2747]/5 transition-all hover:shadow-2xl"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-[#FEF3C7] px-3 py-1 text-xs font-black text-[#B45309]">
                        PORTFÖY KREDİSİ
                      </span>
                      <Sparkles className="h-4 w-4 text-[#D97706]" />
                    </div>

                    <h3 className="mt-4 text-2xl font-black text-[#0F2747]">{p.name}</h3>
                    <p className="mt-1 text-xs text-[#64748B]">Ek iş fırsatları ve iletişim bağlantıları için</p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[#059669]">
                        {p.price?.toLocaleString("tr-TR")}
                      </span>
                      <span className="text-sm font-bold text-[#64748B]">₺</span>
                    </div>

                    <div className="mt-6 space-y-2 border-t border-[#F1F5F9] pt-4 text-xs font-medium text-[#475569]">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>+{p.credits.toLocaleString("tr-TR")} PK Hesabınıza Yüklenir</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[#059669] shrink-0" />
                        <span>Süre kısıtı yoktur, harcandıkça düşer</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[#059669] shrink-0" />
                        <span>Ofis cüzdanına; müteahhit hesabında kendi cüzdanına yüklenir</span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!purchaseReady || !p.code?.trim()}
                    onClick={() =>
                      handleStartPurchase(
                        "PK",
                        p.code,
                        p.name,
                        p.price,
                        `${p.credits} Portföy Kredisi`
                      )
                    }
                    className="mt-8 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#059669] py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-[#059669]/25 transition-all hover:bg-[#047857] disabled:opacity-50"
                  >
                    <CreditCard className="h-4 w-4" /> iyzico ile PK Satın Al
                  </button>
                  {!p.code?.trim() && (
                    <p role="status" className="mt-2 text-sm text-[#BE123C]">Ürün bilgisi eksik. Satın alma kullanılamıyor.</p>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-2xl bg-white p-12 text-center text-[#64748B]">
                Şu anda listelenen ek PK paketi bulunmamaktadır.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Canli (08.11.2026) bilgi bolumleri: kontor kullanimi + ozellik karsilastirmasi (canlidan korundu) */}
      <div className="mx-auto mt-20 max-w-6xl px-4">
        {creditUses.length > 0 && <section className="mt-12 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] md:p-8">
            <h2 className="text-center text-2xl font-black tracking-[-0.03em]">
              PK ile Neler Yapabilirsiniz?
            </h2>
            <p className="mt-3 text-center text-sm font-semibold leading-7 text-[#64748B]">
              İşlemlerde kullanılan PK ücretleri güncel sunucu tarifesinden gösterilir.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {creditUses.map(([item]) => (
                <span
                  key={item}
                  className="rounded-2xl bg-[#F8FAFC] px-3 py-2 text-center text-xs font-black text-[#1557D6]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#DDE7F3] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)] md:p-6">
            <div className="grid gap-2 sm:grid-cols-2">
              {creditUses.map(([name, credit]) => (
                <div
                  key={name}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-4 py-3"
                >
                  <span className="min-w-0 break-words text-sm font-bold text-[#172033]">
                    {name}
                  </span>
                  <span className="break-words rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-black text-[#1557D6]">
                    {credit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>}

        {comparisonPackages.length > 0 && comparisonRows.length > 0 && <section className="mt-12 rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] md:p-8">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-[-0.03em]">
              Özellik Karşılaştırması
            </h2>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[880px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-[#64748B]">
                  <th className="px-4 py-3 text-left">Özellik</th>
                  {comparisonPackages.map((item) => (
                    <th key={item.code} scope="col" className="min-w-32 break-words px-4 py-3 text-center">{item.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ label, cells }) => [label, ...cells]).map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td
                        key={`${row[0]}-${index}`}
                        className={`break-words px-4 py-3 ${
                          index === 0
                            ? "rounded-l-2xl bg-[#F8FAFC] text-left font-black text-[#172033]"
                            : index === row.length - 1
                              ? "rounded-r-2xl bg-[#F8FAFC] text-center font-black text-[#1557D6]"
                              : "bg-[#F8FAFC] text-center font-black text-[#1557D6]"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>}
      </div>

      {/* Trust & Guarantee Badges */}
      <section className="mx-auto mt-20 max-w-4xl px-4">
        <div className="grid grid-cols-2 gap-4 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:grid-cols-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1D4ED8]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="mt-3 text-xs font-bold text-[#0F2747]">256-Bit SSL</span>
            <span className="text-[11px] text-[#64748B]">Uçtan uca şifreleme</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#059669]">
              <Lock className="h-6 w-6" />
            </div>
            <span className="mt-3 text-xs font-bold text-[#0F2747]">3D Secure</span>
            <span className="text-[11px] text-[#64748B]">SMS onaylı ödeme</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
              <Zap className="h-6 w-6" />
            </div>
            <span className="mt-3 text-xs font-bold text-[#0F2747]">Anında Tanımlama</span>
            <span className="text-[11px] text-[#64748B]">Hesaba anında yükleme</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">
              <CreditCard className="h-6 w-6" />
            </div>
            <span className="mt-3 text-xs font-bold text-[#0F2747]">iyzico Güvencesi</span>
            <span className="text-[11px] text-[#64748B]">Kart bilgisi saklanmaz</span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto mt-20 max-w-4xl px-4">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[#0F2747]">Sıkça Sorulan Sorular</h2>
          <p className="mt-2 text-sm text-[#64748B]">Ödeme ve abonelik süreçleri hakkında merak edilenler</p>
        </div>

        <div className="mt-8 space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h4 className="text-sm font-bold text-[#0F2747]">{faq.question}</h4>
              <p className="mt-2 text-xs leading-relaxed text-[#64748B]">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Checkout Drawer / Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              onClick={() => setSelectedProduct(null)}
              disabled={checkoutSubmitting}
              className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#F1F5F9] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1D4ED8]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0F2747]">iyzico ile Güvenli Ödeme</h3>
                <p className="text-xs text-[#64748B]">3D Secure ve SSL korumalı ödeme</p>
              </div>
            </div>

            {/* Selected Product Summary */}
            <div className="mt-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#64748B]">Seçilen Paket</span>
                <span className="font-bold text-[#0F2747]">{selectedProduct.title}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[#E2E8F0] pt-2 text-sm">
                <span className="font-semibold text-[#64748B]">Toplam Tutar</span>
                <span className="text-lg font-black text-[#1D4ED8]">
                  {selectedProduct.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                </span>
              </div>
            </div>

            {!token ? (
              <div className="mt-6 text-center py-6">
                <AlertCircle className="mx-auto h-12 w-12 text-[#D97706]" />
                <h4 className="mt-3 text-base font-bold text-[#0F2747]">Giriş Yapmanız Gerekiyor</h4>
                <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                  Satın aldığınız paketin EPH hesabınıza tanımlanabilmesi için lütfen giriş yapın veya kayıt olun.
                </p>
                <div className="mt-5 flex gap-3">
                  <Link
                    href={`/giris?next=/ucretlendirme`}
                    className="flex-1 rounded-xl bg-[#1D4ED8] py-3 text-center text-xs font-bold text-white hover:bg-[#1E40AF]"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/kayit"
                    className="flex-1 rounded-xl border border-[#CBD5E1] bg-white py-3 text-center text-xs font-bold text-[#334155] hover:bg-[#F8FAFC]"
                  >
                    Kayıt Ol
                  </Link>
                </div>
              </div>
            ) : (
              /* Billing Form */
              <form onSubmit={handleCheckout} className="mt-6 space-y-4">
                <p className="text-xs font-black uppercase tracking-wider text-[#64748B]">
                  Fatura ve İletişim Bilgileri
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#475569]">Ad</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Adınız"
                      className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs text-[#0F2747] outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#475569]">Soyad</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Soyadınız"
                      className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs text-[#0F2747] outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#475569]">T.C. Kimlik No</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={identityNumber}
                      onChange={(e) => setIdentityNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="11 haneli TC no"
                      className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs text-[#0F2747] outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#475569]">Telefon</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+905xxxxxxxxx"
                      className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs text-[#0F2747] outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#475569]">E-posta</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="eposta@adresi.com"
                      className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs text-[#0F2747] outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#475569]">Şehir / İl</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Örn: İstanbul"
                      className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs text-[#0F2747] outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#475569]">Açık Adres</label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Mahalle, cadde, sokak, bina ve kapı no (min. 10 karakter)"
                    className="mt-1 w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-xs text-[#0F2747] outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                {/* Terms agreement */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#475569]">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      disabled={!legalReady || checkoutSubmitting}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#1D4ED8] focus:ring-[#1D4ED8]"
                    />
                    <span>
                      <button
                        type="button"
                        onClick={() => setTermsModal("PRE_INFO")}
                        className="font-bold text-[#1D4ED8] underline"
                      >
                        Ön Bilgilendirme Koşullarını
                      </button>{" "}
                      ve{" "}
                      <button
                        type="button"
                        onClick={() => setTermsModal("SALES")}
                        className="font-bold text-[#1D4ED8] underline"
                      >
                        Mesafeli Satış Sözleşmesini
                      </button>{" "}
                      okudum, onaylıyorum.
                    </span>
                  </label>
                </div>

                {checkoutError && (
                  <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] p-3 text-xs font-bold text-[#BE123C]">
                    {checkoutError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={checkoutSubmitting || !purchaseReady || !selectedProduct.code?.trim() || !acceptedTerms}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#00AEEF] py-3.5 px-4 text-sm font-black text-white shadow-lg shadow-[#00AEEF]/25 transition-all hover:bg-[#0098D3] disabled:opacity-50"
                >
                  {checkoutSubmitting ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      iyzico Güvenli Ödeme Ekranı Açılıyor...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      iyzico ile Güvenli Öde ({selectedProduct.price.toLocaleString("tr-TR")} ₺)
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-[#94A3B8]">
                  Ödeme butonuna bastığınızda resmi iyzico 3D Secure sayfasına yönlendirileceksiniz.
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Terms Sub-Modal */}
      {termsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              onClick={() => setTermsModal(null)}
              className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-black text-[#0F2747]">
              {termsModal === "SALES" ? "Mesafeli Satış Sözleşmesi" : "Ön Bilgilendirme Koşulları"}
            </h3>

            <div className="mt-4 space-y-4 text-xs text-[#475569] leading-relaxed">
              <div className="rounded-xl bg-[#F8FAFC] p-3 border border-[#E2E8F0]">
                <p className="font-bold text-[#0F2747]">Satıcı Bilgileri:</p>
                <p>Ünvan: {legalTerms?.seller?.name}</p>
                <p>Adres: {legalTerms?.seller?.address}</p>
                <p>Vergi Dairesi / No: {legalTerms?.seller?.taxOffice} - {legalTerms?.seller?.taxNumber}</p>
                <p>E-posta: {legalTerms?.seller?.email}</p>
                <p>Telefon: {legalTerms?.seller?.phone}</p>
              </div>

              {termsModal === "SALES" ? (
                <div className="whitespace-pre-wrap">
                  <h4 className="font-bold text-[#0F2747]">Mesafeli Satış Sözleşmesi:</h4>
                  <p>{legalTerms?.sales}</p>
                </div>
              ) : (
                <>
                  {selectedProduct && (
                    <p>{selectedProduct.description} — Toplam: {selectedProduct.price.toLocaleString("tr-TR")} ₺</p>
                  )}
                  <div>
                    <h4 className="font-bold text-[#0F2747]">Teslimat Koşulları:</h4>
                    <p className="whitespace-pre-wrap">{legalTerms?.delivery}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-[#0F2747]">İptal ve İade Koşulları:</h4>
                    <p className="whitespace-pre-wrap">{legalTerms?.refunds}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-[#0F2747]">Gizlilik ve Güvenlik:</h4>
                    <p className="whitespace-pre-wrap">{legalTerms?.privacy}</p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                setTermsModal(null);
              }}
              className="mt-6 w-full rounded-xl bg-[#1D4ED8] py-3 text-xs font-bold text-white hover:bg-[#1E40AF]"
            >
              Metni Kapat
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
