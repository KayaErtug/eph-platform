"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import MembershipPackageSettings from "@/components/payments/MembershipPackageSettings";
import StorePaymentSettings from "@/components/payments/StorePaymentSettings";
import { useAuthStore } from "@/store/auth.store";

type Pk = { code: string; name: string; credits: number; amountMinor: number; active: boolean };
type Seller = { name: string; address: string; taxOffice: string; taxNumber: string; registryNumber: string; email: string; phone: string };
type Config = { enabled: boolean; mode: string; approved: boolean; pkProducts: Pk[]; terms: { seller: Seller; delivery: string; refunds: string; sales: string; privacy: string } };
type AdminOrder = { channel?: string; amountPending?: boolean; requiresRefundReview?: boolean; id: string; number: string; amount: string; currency: string; status: string; settled: boolean; refunds: { id: string; status: string; reason: string }[] };
const field = "min-h-11 w-full rounded-xl border border-[#C7D6E8] bg-[#EEF3F8] px-3 py-2 text-sm";
const button = "min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
function message(error: unknown) { return (error as { response?: { data?: { message?: string } } }).response?.data?.message || "İşlem tamamlanamadı."; }

export default function PaymentAdminPage() {
  const { token, user, hasHydrated } = useAuthStore();
  const [config, setConfig] = useState<Config | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [settings, history] = await Promise.all([api.get<Config>("/payments/admin/settings"), api.get<AdminOrder[]>("/payments/admin/orders")]);
      setConfig(settings.data); setOrders(history.data);
    } catch (error) { setNotice(message(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (hasHydrated && token && user?.role === "SUPER_ADMIN") void load(); }, [hasHydrated, token, user?.role, load]);

  async function save(event: FormEvent) {
    event.preventDefault(); if (!config || busy) return; setBusy(true); setNotice("");
    try {
      await api.put("/payments/admin/settings", { approved: config.approved, pkProducts: config.pkProducts,
        sellerName: config.terms.seller.name, sellerAddress: config.terms.seller.address,
        taxOffice: config.terms.seller.taxOffice, taxNumber: config.terms.seller.taxNumber,
        registryNumber: config.terms.seller.registryNumber, email: config.terms.seller.email, phone: config.terms.seller.phone,
        delivery: config.terms.delivery, refunds: config.terms.refunds, sales: config.terms.sales, privacy: config.terms.privacy,
      });
      await load(); setNotice("Ödeme ayarları kaydedildi.");
    } catch (error) { setNotice(message(error)); }
    finally { setBusy(false); }
  }
  const updateProduct = (index: number, patch: Partial<Pk>) => setConfig((old) => old && ({ ...old, pkProducts: old.pkProducts.map((p, i) => i === index ? { ...p, ...patch } : p) }));

  if (!hasHydrated) return <p className="p-6">Yükleniyor…</p>;
  if (!token || user?.role !== "SUPER_ADMIN") return <p className="p-6">Bu ekran yalnız Yazılım Ekibi yetkisine açıktır.</p>;
  return <main className="min-h-screen bg-[#F4F8FF] p-4 pb-28 text-[#1F2937]"><div className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin" className="min-h-11 py-3 text-sm font-bold text-blue-700">← Yönetim paneli</Link><h1 className="text-xl font-black">Ödeme Yönetimi</h1><button className={button} onClick={() => void load()}>Yenile</button></header>
    {notice && <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm">{notice}</p>}
    {loading ? <p>Yükleniyor…</p> : config && <>
      <p className="rounded-2xl bg-white p-4 text-sm">Ortam: <strong>{config.mode}</strong> · Kartlı ödeme: <strong>{config.enabled ? "Açık" : "Kapalı"}</strong>. Anahtarlar yalnız sunucuda saklanır. Sandbox işlemleri TEST hesaplarıyla sınırlıdır.</p>
      <form onSubmit={save} className="space-y-5">
        <section className="space-y-4 rounded-3xl border border-[#C7D6E8] bg-white p-5"><h2 className="text-lg font-black">PK Satış Paketleri</h2>
          {config.pkProducts.map((product, index) => <div key={index} className="grid gap-3 rounded-2xl bg-[#F8FAFC] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-bold">Ürün kodu<input required pattern="[A-Z0-9_-]{2,60}" value={product.code} onChange={(e) => updateProduct(index, { code: e.target.value })} className={`${field} mt-2`} /></label>
            <label className="text-sm font-bold">Paket adı<input required minLength={2} maxLength={80} value={product.name} onChange={(e) => updateProduct(index, { name: e.target.value })} className={`${field} mt-2`} /></label>
            <label className="text-sm font-bold">PK miktarı<input required type="number" min={1} max={10000000} step={1} value={product.credits || ""} onChange={(e) => updateProduct(index, { credits: Number(e.target.value) })} className={`${field} mt-2`} /></label>
            <label className="text-sm font-bold">Vergi dahil fiyat (kuruş)<input required type="number" min={1} max={1000000000} step={1} value={product.amountMinor || ""} onChange={(e) => updateProduct(index, { amountMinor: Number(e.target.value) })} className={`${field} mt-2`} /></label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={product.active} onChange={(e) => updateProduct(index, { active: e.target.checked })} /> Satışa açık</label>
            <button type="button" className="min-h-11 text-sm font-bold text-red-700" onClick={() => setConfig({ ...config, pkProducts: config.pkProducts.filter((_, i) => i !== index) })}>Paketi kaldır</button>
          </div>)}
          {!config.pkProducts.length && <p className="text-sm text-slate-600">Henüz PK satış paketi tanımlanmamış.</p>}
          <button type="button" disabled={config.pkProducts.length >= 30} className={button} onClick={() => setConfig({ ...config, pkProducts: [...config.pkProducts, { code: "", name: "", credits: 0, amountMinor: 0, active: false }] })}>PK paketi ekle</button>
          <p className="text-xs text-slate-500">100 kuruş = 1 TL. Fiyat ve miktar tanımlanmadan paket kaydedilemez.</p>
        </section>
        <section className="space-y-4 rounded-3xl border border-[#C7D6E8] bg-white p-5"><h2 className="text-lg font-black">Satıcı Bilgileri ve Satış Koşulları</h2>
          <div className="grid gap-4 sm:grid-cols-2">{([["name", "Ticari unvan"], ["address", "Adres"], ["taxOffice", "Vergi dairesi"], ["taxNumber", "Vergi numarası"], ["registryNumber", "Ticaret sicili"], ["email", "E-posta"], ["phone", "Telefon"]] as const).map(([key, label]) => <label key={key} className="text-sm font-bold">{label}<input required value={config.terms.seller[key]} onChange={(e) => setConfig({ ...config, terms: { ...config.terms, seller: { ...config.terms.seller, [key]: e.target.value } } })} className={`${field} mt-2`} /></label>)}</div>
          {([["sales", "Satış koşulları"], ["delivery", "Dijital teslimat"], ["refunds", "İptal ve iade"], ["privacy", "Ödeme verileri"]] as const).map(([key, label]) => <label key={key} className="block text-sm font-bold">{label}<textarea required minLength={30} maxLength={5000} value={config.terms[key]} onChange={(e) => setConfig({ ...config, terms: { ...config.terms, [key]: e.target.value } })} className={`${field} mt-2 min-h-32`} /></label>)}
          <label className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={config.approved} onChange={(e) => setConfig({ ...config, approved: e.target.checked })} />Satıcı bilgilerini, fiyatları ve satış koşullarını kontrol ettim; satış için onaylıyorum.</label>
          <button disabled={busy} className={`${button} w-full sm:w-auto`}>{busy ? "Kaydediliyor…" : "Ayarları kaydet"}</button>
        </section>
      </form>
      <StorePaymentSettings />
      <MembershipPackageSettings />
      <section className="space-y-3 rounded-3xl border border-[#C7D6E8] bg-white p-5"><h2 className="text-lg font-black">Son 100 Ödeme ve İade Talebi</h2>
        {orders.map((order) => <article key={order.id} className="rounded-2xl border border-[#C7D6E8] p-4 text-sm"><p className="break-all font-bold">{order.number}</p><p className="mt-2">{order.amountPending ? "Mağaza tutarı bekleniyor" : `${order.amount} ${order.currency}`} · {order.channel || "WEB"} · {order.status} · Haklar: {order.settled ? "Tanımlandı" : "Bekliyor"}</p>{order.requiresRefundReview && <p className="mt-2 rounded-xl bg-red-50 p-3 font-bold text-red-700">Mağaza iadesi doğrulandı. Kullanılmış PK ve birikmiş üyelik süreleri incelenmeli.</p>}{order.refunds.map((refund) => <p key={refund.id} className="mt-3 rounded-xl bg-amber-50 p-3">İade talebi: {refund.status}<br />{refund.reason}<br /><span className="text-xs">İade tutarı ve kullanılmış haklar operasyon tarafından incelenmelidir. Bu ekranda talep kaydı kart iadesi gerçekleştirmez.</span></p>)}</article>)}
        {!orders.length && <p className="text-sm">Ödeme kaydı bulunmuyor.</p>}
      </section>
    </>}
  </div></main>;
}
