"use client";

import PaymentTrustBand from "@/components/payments/PaymentTrustBand";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";

type Terms = { seller: { name: string; address: string; taxOffice: string; taxNumber: string; registryNumber: string; email: string; phone: string }; delivery: string; refunds: string; sales: string; privacy: string };

export default function PaymentTerms({ about = false, document = "all" }: { about?: boolean; document?: "all" | "delivery" | "sales" }) {
  const [data, setData] = useState<{ terms: Terms; termsVersion: string; approved: boolean } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { api.get("/payments/legal").then((r) => setData(r.data)).catch(() => setError(true)); }, []);
  return <main className="min-h-screen bg-[#F4F8FF] px-4 py-8 text-[#1F2937]"><article className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-[#C7D6E8] bg-white p-6 sm:p-9">
    <Link href="/uyelik" className="inline-flex min-h-11 items-center font-bold text-blue-700">← Üyelik ve ödemeler</Link>
    <h1 className="text-2xl font-black">{about ? "Emlak Portföy Havuzu Hakkında" : document === "delivery" ? "Teslimat ve İade Şartları" : document === "sales" ? "Mesafeli Satış Sözleşmesi" : "Ön Bilgilendirme ve Satış Koşulları"}</h1>
    {error ? <p role="alert">Bilgiler yüklenemedi. Lütfen sayfayı yenileyin.</p> : !data ? <p role="status">Yükleniyor…</p> : <>
      {!data.approved && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Satış koşulları henüz etkinleştirilmedi. Kartlı tahsilat kapalıdır.</p>}
      {about && <p className="text-sm leading-7">EPH; gayrimenkul profesyonellerinin portföy, proje, müşteri ilişkileri ve mesleki iş birliği süreçlerini yönetmesine yardımcı olan dijital platformdur. Üyelik paketleri platform kullanım haklarını, PK paketleri ise ilgili ücretli iletişim ve iş fırsatı aksiyonlarını kapsar.</p>}
      <section className="space-y-2 text-sm leading-7"><h2 className="text-lg font-black">Platform işletmecisi ve satıcı</h2><p className="font-bold">{data.terms.seller.name}</p><p>{data.terms.seller.address}</p><p>Vergi dairesi: {data.terms.seller.taxOffice} · Vergi numarası: {data.terms.seller.taxNumber}</p><p>Ticaret sicili: {data.terms.seller.registryNumber}</p><p><a className="text-blue-700 underline" href={`mailto:${data.terms.seller.email}`}>{data.terms.seller.email}</a> · {data.terms.seller.phone}</p></section>
      {!about && <>{([["Satış ve ödeme", "sales"], ["Dijital teslimat", "delivery"], ["İptal ve iade", "refunds"], ["Ödeme verilerinin işlenmesi", "privacy"]] as const).filter(([, key]) => document !== "delivery" || key === "delivery" || key === "refunds").map(([title, key]) => <section key={key} className="space-y-2 border-t border-slate-200 pt-5"><h2 className="text-lg font-black">{title}</h2><p className="whitespace-pre-wrap text-sm leading-7">{data.terms[key]}</p></section>)}<p className="text-sm leading-7">Seçilen ürünün adı, pakete dahil haklar, miktar ve vergi dahil toplam bedel ödeme ekranında gösterilir. Alıcının verdiği fatura bilgileri ile kabul edilen koşullar sipariş kaydında saklanır. İade talebinin kaydı, iadenin onaylandığı anlamına gelmez.</p><p className="break-all text-xs text-slate-500">Koşul sürümü: {data.termsVersion}</p></>}
      <PaymentTrustBand />
    </>}
  </article></main>;
}
