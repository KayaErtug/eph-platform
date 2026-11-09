"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RefreshCw, ShieldCheck } from "lucide-react";

type MembershipPackage = {
  paketKodu: string;
  segment: string;
  paketAdi: string;
  fiyat: number | null;
  paraBirimi: string;
  aktifPortfoyLimiti: number;
  aktifCrmLimiti: number | null;
  aylikPaketPk: number;
  projeLimiti: number | null;
  projeIlanLimiti: number | null;
  denemeGunSayisi: number | null;
  ofisAltKullaniciLimiti: number | null;
  aylikTalepLimiti: number;
  aylikHavuzGonderimLimiti: number;
};

type PublicCatalog = { paymentEnabled: boolean; packages: MembershipPackage[]; pkProducts: {name:string; credits:number; price:number}[] };
const segments = [
  { code: "EMLAK_PRO", title: "Emlak Profesyonelleri", description: "Emlak danışmanları ve emlak ofisleri için üyelik paketleri." },
  { code: "MUTEAHHIT", title: "Müteahhit ve İnşaat Firmaları", description: "Portföy yönetimine ek olarak proje ve bağımsız bölüm yönetimi." },
];
const number = (value: number) => new Intl.NumberFormat("tr-TR").format(value);
const limit = (value: number) => value < 0 ? "Sınırsız" : number(value);
const price = (item: MembershipPackage) => item.fiyat === null ? "Fiyat için iletişime geçin" : new Intl.NumberFormat("tr-TR", {
  style: "currency", currency: item.paraBirimi, minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(item.fiyat);

export default function PublicMembershipPricing() {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch("/api/payments/public-catalog", { cache: "no-store", credentials: "omit", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Paketler yüklenemedi");
        const result: PublicCatalog = await response.json();
        if (!Array.isArray(result.packages)) throw new Error("Paketler yüklenemedi");
        return result;
      })
      .then((result) => { if (!controller.signal.aborted) setCatalog(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  return (
    <section id="fiyatlandirma" className="scroll-mt-20 bg-[#F4F7FB] px-5 py-14 text-[#10233D] md:px-10 md:py-20" aria-labelledby="membership-pricing-title">
      <div className="mx-auto max-w-[1380px]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563EB]">EPH Üyelik Paketleri</p>
          <h2 id="membership-pricing-title" className="mt-3 text-3xl font-bold leading-tight tracking-[-0.03em] md:text-4xl">İşinize uygun üyeliği seçin.</h2>
          <p className="mt-4 text-sm leading-7 text-[#52657E] md:text-base">Üyelik ücretlerini, portföy ve CRM limitlerini, dahil Portföy Kredisi (PK) haklarını inceleyin.</p>
        </div>

        {loading && <p className="py-12 text-center text-sm text-[#52657E]" role="status">Üyelik paketleri yükleniyor…</p>}
        {error && <div className="mt-8 rounded-2xl border border-[#CBD8E7] bg-white p-6 text-center" role="alert">
          <p className="text-sm text-[#52657E]">Paket bilgileri şu anda yüklenemedi.</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="mx-auto mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#16324F] px-5 text-sm font-semibold text-white"><RefreshCw size={16} />Yeniden dene</button>
        </div>}

        {!loading && !error && catalog && segments.map((segment) => {
          const packages = catalog.packages.filter((item) => item.segment === segment.code);
          if (!packages.length) return null;
          return <div key={segment.code} className="mt-12">
            <div className="mb-6 text-center"><h3 className="text-xl font-bold md:text-2xl">{segment.title}</h3><p className="mt-2 text-sm leading-6 text-[#52657E]">{segment.description}</p></div>
            <div className="flex flex-wrap items-stretch justify-center gap-4">
              {packages.map((item) => {
                const trial = item.paketKodu === "DENEME" || item.paketKodu === "UCRETSIZ";
                const features = [
                  `${limit(item.aktifPortfoyLimiti)} aktif portföy`,
                  `${limit(item.aktifCrmLimiti ?? 100)} CRM kaydı`,
                  `${number(item.aylikPaketPk)} PK${trial ? "" : " / ay"}`,
                  ...(item.ofisAltKullaniciLimiti !== null ? [`Ofis paketinde ${number(item.ofisAltKullaniciLimiti)} alt kullanıcı`] : []),
                  ...(item.aylikTalepLimiti > 0 ? [`${number(item.aylikTalepLimiti)} talep / ay`] : []),
                  ...(item.aylikHavuzGonderimLimiti > 0 ? [`${number(item.aylikHavuzGonderimLimiti)} havuz yayını / ay`] : []),
                  ...(item.projeLimiti !== null ? [`${limit(item.projeLimiti)} proje`] : []),
                  ...(item.projeIlanLimiti !== null ? [`${limit(item.projeIlanLimiti)} proje ilanı`] : []),
                ];
                return <article key={`${item.segment}-${item.paketKodu}`} className="flex w-full flex-col rounded-3xl border border-[#D7E1ED] bg-white p-6 shadow-[0_10px_35px_rgba(16,35,61,0.04)] sm:w-[calc(50%_-_0.5rem)] xl:w-[calc(25%_-_0.75rem)]">
                  <div className="text-center"><h4 className="text-xl font-bold">{item.paketAdi}</h4><p className="mt-1 text-xs text-[#64748B]">{trial ? `${number(item.denemeGunSayisi ?? 0)} günlük ${item.paketKodu === "UCRETSIZ" ? "ücretsiz kullanım" : "deneme"}` : "1 aylık üyelik"}</p>
                    <p className="mt-5 text-3xl font-bold tracking-tight text-[#1D4ED8]">{price(item)}</p>
                    <p className="mt-2 text-xs text-[#64748B]">{trial ? "Deneme süresi için" : "Aylık · vergiler dahil"}</p>
                  </div>
                  <ul className="my-6 grid gap-3 border-t border-[#E7EDF5] pt-5 text-sm leading-6">{features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check size={17} className="mt-1 shrink-0 text-[#2563EB]" /><span>{feature}</span></li>)}</ul>
                  <Link href="/kayit" className={`mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-bold ${trial ? "bg-[#EAF1FC] text-[#1D4ED8]" : "bg-[#2563EB] text-white"}`}>Üyelik Başvurusu<ArrowRight size={16} className="shrink-0" /></Link>
                </article>;
              })}
            </div>
          </div>;
        })}

        {!loading && !error && catalog && !catalog.packages.length && <p className="mt-8 text-center text-sm text-[#52657E]">Güncel üyelik paketleri için <a href="mailto:info@emlakportfoyhavuzu.com" className="font-semibold text-[#2563EB] underline">bizimle iletişime geçin</a>.</p>}
        {catalog?.pkProducts?.map((product) => <div key={product.name} className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[#D7E1ED] bg-white p-6 text-center"><h3 className="text-lg font-bold">{product.name}</h3><p className="mt-2 text-2xl font-bold text-[#1D4ED8]">{number(product.credits)} PK · {new Intl.NumberFormat("tr-TR", {style:"currency",currency:"TRY",maximumFractionDigits:2}).format(product.price)}</p><p className="mt-2 text-xs leading-6 text-[#52657E]">Emlakçı ve müteahhit hesapları için ortak standart ek PK paketi. Vergiler dahildir.</p></div>)}
        <div className="mx-auto mt-9 max-w-3xl text-center text-xs leading-6 text-[#52657E]">
          <p>Ücretli üyelikler bir aylık dönem içindir. Bu ödeme akışı otomatik kart tahsilatı başlatmaz. PK, platform içi dijital işlem hakkıdır; para transferi veya gayrimenkul satış bedeli değildir.</p>
          {catalog && !catalog.paymentEnabled && <p className="mt-3 inline-flex items-start justify-center gap-2"><ShieldCheck size={16} className="mt-1 shrink-0" /><span>Kartlı ödeme henüz etkinleştirilmedi. Paketleri inceleyebilir ve üyelik başvurusu yapabilirsiniz; bu aşamada tahsilat yapılmaz.</span></p>}
          <p className="mt-3"><Link href="/teslimat-ve-iade" className="font-semibold text-[#2563EB] underline underline-offset-4">Teslimat ve İade Şartları</Link><span className="px-2">·</span><Link href="/mesafeli-satis-sozlesmesi" className="font-semibold text-[#2563EB] underline underline-offset-4">Mesafeli Satış Sözleşmesi</Link></p>
        </div>
      </div>
    </section>
  );
}
