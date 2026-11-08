"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

type Plan = {
  id: string; paketKodu: string; segment: string; paketAdi: string; fiyat: number | null;
  aylikPaketPk: number; aktifPortfoyLimiti: number; aktifCrmLimiti: number;
  aylikTalepLimiti: number; aylikHavuzGonderimLimiti: number;
  denemeGunSayisi: number | null; projeLimiti: number | null; projeIlanLimiti: number | null;
  ofisAltKullaniciLimiti: number | null; aktifMi: boolean; guncellenmeTarihi: string;
};
const field = "mt-1 min-h-11 w-full rounded-xl border border-[#CAD7E7] bg-[#F6F8FC] px-3 py-2 text-sm text-[#10233D]";
const fields = [
  ["fiyat", "Ücret (TL)", 0, false], ["aylikPaketPk", "PK miktarı", 0, false],
  ["aktifPortfoyLimiti", "Aktif portföy", 0, false], ["aktifCrmLimiti", "CRM kapasitesi", -1, false],
  ["aylikTalepLimiti", "Aylık talep kotası", 0, false], ["aylikHavuzGonderimLimiti", "Aylık havuz kotası", 0, false],
  ["denemeGunSayisi", "Deneme / ücretsiz süre (gün)", 1, true], ["ofisAltKullaniciLimiti", "Ofis alt kullanıcısı", 0, true],
  ["projeLimiti", "Aktif proje", 0, true], ["projeIlanLimiti", "Proje ilanı", 0, true],
] as const;

export default function MembershipPackageSettings() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await api.get<Plan[]>("/payments/admin/membership-packages"); setPlans(result.data); }
    catch { setNotice("Paketler yüklenemedi. Yenileyip tekrar deneyin."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const update = (id: string, patch: Partial<Plan>) => setPlans((old) => old.map((p) => p.id === id ? { ...p, ...patch } : p));
  async function save(event: FormEvent, plan: Plan) {
    event.preventDefault(); if (busy) return; setBusy(plan.id); setNotice("");
    try {
      await api.put(`/payments/admin/membership-packages/${encodeURIComponent(plan.id)}`, {
        paketAdi: plan.paketAdi, fiyat: plan.fiyat, aylikPaketPk: plan.aylikPaketPk,
        aktifPortfoyLimiti: plan.aktifPortfoyLimiti, aktifCrmLimiti: plan.aktifCrmLimiti,
        aylikTalepLimiti: plan.aylikTalepLimiti, aylikHavuzGonderimLimiti: plan.aylikHavuzGonderimLimiti,
        denemeGunSayisi: plan.denemeGunSayisi, projeLimiti: plan.projeLimiti, projeIlanLimiti: plan.projeIlanLimiti,
        ofisAltKullaniciLimiti: plan.ofisAltKullaniciLimiti, aktifMi: plan.aktifMi, expectedUpdatedAt: plan.guncellenmeTarihi,
      });
      await load(); setNotice(`${plan.paketAdi} kaydedildi. Yeni değerler yeniden yayın gerektirmeden kullanılır.`);
    } catch (error) { setNotice((error as { response?: {data?: {message?: string}} }).response?.data?.message || "Paket kaydedilemedi."); }
    finally { setBusy(null); }
  }
  return <section className="space-y-5 rounded-3xl border border-[#C7D6E8] bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Paket ve Kota Yönetimi</h2><p className="mt-1 text-xs leading-6 text-slate-500">Yalnız Süper Admin. CRM alanında -1 sınırsızdır. Talep/havuz kotasında 0, mevcut sınırsız davranışı korur. Süre değişikliği yeni başlayan denemelerde uygulanır.</p></div><button type="button" disabled={!!busy || loading} onClick={() => void load()} className="min-h-11 rounded-xl border border-[#C7D6E8] px-4 text-sm font-bold disabled:opacity-50">Yenile</button></div>
    {notice && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">{notice}</p>}
    {loading ? <p role="status" className="text-sm">Paketler yükleniyor…</p> : <div className="grid gap-5 lg:grid-cols-2">{plans.map((plan) => <form key={plan.id} onSubmit={(event) => void save(event, plan)} className="space-y-4 rounded-2xl border border-[#DCE4EE] bg-[#FAFBFD] p-4">
      <header className="text-center"><h3 className="text-base font-bold">{plan.paketAdi}</h3><p className="mt-1 text-xs text-slate-500">{plan.segment === "EMLAK_PRO" ? "Emlakçı / Ofis" : "Müteahhit / İnşaat Firması"} · {plan.paketKodu}</p></header>
      <label className="block text-xs font-semibold">Paket adı<input required minLength={2} maxLength={80} value={plan.paketAdi} onChange={(event) => update(plan.id, { paketAdi: event.target.value })} className={field} /></label>
      <div className="grid grid-cols-2 gap-3">{fields.map(([key, label, min, nullable]) => <label key={key} className="block text-xs font-semibold leading-5">{label}<input aria-label={`${plan.segment} ${plan.paketKodu} ${label}`} type="number" min={min} max={10000000} step={key === "fiyat" ? "0.01" : "1"} required={!nullable} disabled={key === "ofisAltKullaniciLimiti" && plan.segment !== "EMLAK_PRO"} value={plan[key] ?? ""} onChange={(event) => update(plan.id, { [key]: nullable && event.target.value === "" ? null : Number(event.target.value) })} className={field} /></label>)}</div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={plan.aktifMi} onChange={(event) => update(plan.id, { aktifMi: event.target.checked })} />Paket aktif</label>
      <button disabled={!!busy} className="min-h-12 w-full rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy === plan.id ? "Kaydediliyor…" : "Paketi kaydet"}</button>
    </form>)}</div>}
  </section>;
}
