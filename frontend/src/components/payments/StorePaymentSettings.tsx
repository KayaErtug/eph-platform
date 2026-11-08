"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

type Product = { platform: "APPLE" | "GOOGLE"; sku: string; kind: "MEMBERSHIP" | "PK"; productCode: string; segment?: string; active: boolean };
type Config = { approved: boolean; products: Product[]; mode: string; enabled: boolean; readiness: Record<string, boolean> };
type Price = { code: string; segment: string; name: string };
const input = "mt-1 min-h-11 w-full rounded-xl border border-[#C7D6E8] bg-[#EEF3F8] px-3 text-sm";
const fetchSettings = () => Promise.all([api.get<Config>("/payments/admin/store/settings"), api.get<Price[]>("/payments/admin/membership-prices"), api.get<{ pkProducts: { code: string; name: string }[] }>("/payments/admin/settings")]);

export default function StorePaymentSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [plans, setPlans] = useState<Price[]>([]);
  const [pk, setPk] = useState<{ code: string; name: string }[]>([]);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const applySettings = useCallback(([s, p, w]: Awaited<ReturnType<typeof fetchSettings>>) => {
    setConfig(s.data); setPlans(p.data.filter((p) => p.code !== "DENEME")); setPk(w.data.pkProducts); setError("");
  }, []);
  const load = async () => {
    try {
      applySettings(await fetchSettings());
    } catch { setError("Mağaza ayarları yüklenemedi."); }
  };
  useEffect(() => {
    let active = true;
    void fetchSettings().then((data) => { if (active) applySettings(data); }).catch(() => { if (active) setError("Mağaza ayarları yüklenemedi."); });
    return () => { active = false; };
  }, [applySettings]);
  const update = (index: number, patch: Partial<Product>) => setConfig((c) => c && ({ ...c, products: c.products.map((p, i) => i === index ? { ...p, ...patch } : p) }));
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!config || busy) return; setBusy(true); setError(""); setNotice("");
    try {
      await api.put("/payments/admin/store/settings", { approved: config.approved, products: config.products.map((p) => ({ ...p, ...(p.kind === "PK" ? { segment: undefined } : {}) })) });
      setNotice("Mağaza eşleştirmeleri kaydedildi."); await load();
    } catch (e) { const raw = (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message; setError(Array.isArray(raw) ? raw[0] : raw || "Mağaza ayarları kaydedilemedi."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 rounded-3xl border border-[#C7D6E8] bg-white p-5">
    <h2 className="text-lg font-black">Apple / Google Mağaza Satışı</h2>
    {error && <p role="alert" className="text-sm text-red-700">{error}<button onClick={() => void load()} className="ml-3 min-h-11 underline">Yeniden yükle</button></p>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {!config ? <p className="text-sm">Mağaza ayarları bekleniyor.</p> : <form onSubmit={save} className="space-y-4">
      <p className="text-sm leading-6">Ortam: <strong>{config.mode}</strong>. Apple anahtarları: {config.readiness.APPLE ? "Hazır" : "Eksik"}. Google anahtarları: {config.readiness.GOOGLE ? "Hazır" : "Eksik"}. Sunucu satış anahtarı: {config.enabled ? "Açık" : "Kapalı"}.</p>
      <p className="text-sm text-slate-600">Ürünleri önce App Store Connect ve Play Console’da tanımlayın. PK, tüketilebilir üründür. Üyelik, 1 aylık ve otomatik yenilemesizdir: Apple’da Non-Renewing Subscription, Google’da tekrar satın alınabilen tek seferlik ürün. Fiyatlar mağazalarda yönetilir; mobil ekranda mağaza fiyatı gösterilir.</p>
      {config.products.map((p, i) => <div key={i} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Mağaza<select className={input} value={p.platform} onChange={(e) => update(i, { platform: e.target.value as Product["platform"] })}><option value="APPLE">Apple App Store</option><option value="GOOGLE">Google Play</option></select></label>
        <label className="text-sm font-bold">Mağaza ürün kimliği (SKU)<input className={input} required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}" value={p.sku} onChange={(e) => update(i, { sku: e.target.value })} /></label>
        <label className="text-sm font-bold">EPH ürün türü<select className={input} value={p.kind} onChange={(e) => update(i, { kind: e.target.value as Product["kind"], productCode: "", segment: undefined })}><option value="PK">PK paketi</option><option value="MEMBERSHIP">1 aylık üyelik</option></select></label>
        <label className="text-sm font-bold">EPH paketi<select className={input} required value={p.kind === "PK" ? p.productCode : `${p.productCode}:${p.segment || ""}`} onChange={(e) => { const [productCode, segment] = e.target.value.split(":"); update(i, { productCode, segment }); }}>
          <option value="">Paket seçin</option>{p.kind === "PK" ? pk.map((v) => <option key={v.code} value={v.code}>{v.name} · {v.code}</option>) : plans.map((v) => <option key={`${v.code}:${v.segment}`} value={`${v.code}:${v.segment}`}>{v.name} · {v.segment}</option>)}
        </select></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={p.active} onChange={(e) => update(i, { active: e.target.checked })} />Satışa açık</label>
        <button type="button" className="min-h-11 text-sm font-bold text-red-700" onClick={() => setConfig({ ...config, products: config.products.filter((_, n) => n !== i) })}>Eşleştirmeyi kaldır</button>
      </div>)}
      <button type="button" disabled={config.products.length >= 100} className="min-h-11 rounded-xl border border-blue-600 px-4 text-sm font-bold text-blue-700" onClick={() => setConfig({ ...config, products: [...config.products, { platform: "APPLE", sku: "", kind: "PK", productCode: "", active: false }] })}>Mağaza ürünü ekle</button>
      <label className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={config.approved} onChange={(e) => setConfig({ ...config, approved: e.target.checked })} />Mağaza ürün türlerini, fiyatlarını ve EPH paket eşleştirmelerini kontrol ettim; mağaza satışı için onaylıyorum.</label>
      <button disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? "Kaydediliyor…" : "Mağaza ayarlarını kaydet"}</button>
    </form>}
  </section>;
}
