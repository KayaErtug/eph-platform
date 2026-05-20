"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

interface Unit {
  id: string; type: string; floor?: number; number: string;
  roomCount?: string; area?: number; price: number; status: string; description?: string;
  tapuVerified?: boolean; photoVerified?: boolean; yetkiVerified?: boolean;
  createdAt?: string;
  project: { id: string; name: string; city: string; district: string; address: string; owner: { firstName: string; lastName: string } };
}

const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık", KIRALIK: "Kiralık", GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık", DEVREN_KIRALIK: "Devren Kiralık",
  INSAAT_PROJESI: "İnşaat Projesi", KAT_KARSILIGI: "Kat Karşılığı",
  REZERVE: "Rezerve", SATILDI: "Satıldı", KIRALANDII: "Kiralandı", PASIF: "Pasif",
};
const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire", VILLA: "Villa", REZIDANS: "Rezidans", MUSTAK_EV: "Müstakil Ev",
  KOSK_YALI: "Köşk/Yalı", CIFTLIK_EVI: "Çiftlik Evi", PREFABRIK_EV: "Prefabrik Ev",
  DUKKAN_MAGAZA: "Dükkan/Mağaza", OFIS_BURO: "Ofis/Büro", PLAZA_KATI: "Plaza Katı",
  DEPO_ANTREPO: "Depo/Antrepo", FABRIKA_ATOLYE: "Fabrika/Atölye",
  OTEL_PANSIYON: "Otel/Pansiyon", DUGUN_SALONU: "Düğün Salonu",
  ARSA: "Arsa", TARLA: "Tarla", BAHCE: "Bahçe", ZEYTINLIK: "Zeytinlik",
  ADA: "Ada", DEVRE_MULK: "Devre Mülk", TURISTIK_TESIS: "Turistik Tesis",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --navy:#0F2044;--gold:#C9A84C;--cream:#F5F3EF;--warm:#FAFAF8;
  --text:#1A1A2E;--muted:#8A8A8A;--border:#E2DDD5;
  --serif:'Cormorant Garamond',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;
}
body{font-family:var(--sans);background:var(--warm);color:var(--text);}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

/* NAV */
.dn-nav{height:68px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 48px;position:sticky;top:0;z-index:100;}
@media(max-width:768px){.dn-nav{padding:0 16px;}}
.dn-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
.dn-logo img{width:34px;height:34px;object-fit:contain;}
.dn-logo-text{font-family:var(--serif);font-size:18px;font-weight:500;color:var(--navy);}
.dn-logo-sub{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);}
.dn-back{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:color 0.2s;}
.dn-back:hover{color:var(--navy);}

/* MAIN */
.dn-main{max-width:1100px;margin:0 auto;padding:48px 48px 120px;animation:fadeUp 0.5s ease;}
@media(max-width:768px){.dn-main{padding:24px 16px 100px;}}

/* GALLERY */
.dn-gallery{position:relative;width:100%;height:420px;background:linear-gradient(135deg,#0D2137,#1a3c5e);border-radius:16px;overflow:hidden;margin-bottom:32px;display:flex;align-items:center;justify-content:center;}
@media(max-width:768px){.dn-gallery{height:240px;}}
.dn-gallery-placeholder{display:flex;flex-direction:column;align-items:center;gap:12px;}
.dn-gallery-icon{font-size:64px;opacity:0.2;}
.dn-gallery-text{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.3);}
.dn-gallery-badge{position:absolute;top:20px;left:20px;background:rgba(201,168,76,0.95);color:#fff;font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:8px 16px;border-radius:20px;font-weight:600;}
.dn-gallery-count{position:absolute;bottom:20px;right:20px;background:rgba(0,0,0,0.5);color:#fff;font-size:11px;padding:6px 14px;border-radius:20px;}

/* LAYOUT */
.dn-layout{display:grid;grid-template-columns:1fr 340px;gap:32px;align-items:start;}
@media(max-width:900px){.dn-layout{grid-template-columns:1fr;}}

/* SOL */
.dn-left{}
.dn-title-block{margin-bottom:28px;}
.dn-status-row{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.dn-status-badge{font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:20px;font-weight:600;border:1px solid;}
.dn-title{font-family:var(--serif);font-size:clamp(28px,4vw,42px);font-weight:400;color:var(--navy);line-height:1.1;margin-bottom:8px;}
.dn-subtitle{font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px;}

.dn-divider{width:40px;height:2px;background:var(--gold);margin:24px 0;}

/* BİLGİ GRID */
.dn-info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px;}
@media(max-width:600px){.dn-info-grid{grid-template-columns:1fr 1fr;}}
.dn-info-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px;}
.dn-info-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;}
.dn-info-val{font-size:16px;font-weight:600;color:var(--navy);}

/* AÇIKLAMA */
.dn-section{margin-bottom:28px;}
.dn-section-title{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:16px;display:flex;align-items:center;gap:8px;}
.dn-section-title::after{content:'';flex:1;height:1px;background:var(--border);}
.dn-desc{font-size:14px;color:#444;line-height:1.8;font-weight:300;}

/* DOĞRULAMA */
.dn-verify-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px;}
.dn-verify-badge{display:flex;align-items:center;gap:6px;border:1px solid #2D6A4F;color:#2D6A4F;background:#F0FAF4;padding:8px 14px;border-radius:8px;font-size:11px;font-weight:500;}

/* HARİTA */
.dn-map{width:100%;height:280px;border-radius:12px;overflow:hidden;border:1px solid var(--border);background:#F5F3EF;display:flex;align-items:center;justify-content:center;}
.dn-map iframe{width:100%;height:100%;border:none;}
.dn-map-placeholder{text-align:center;color:var(--muted);}
.dn-map-placeholder-icon{font-size:32px;margin-bottom:8px;}
.dn-map-placeholder-text{font-size:12px;}

/* SAĞ - FİYAT KARTI */
.dn-price-card{background:#fff;border:1px solid var(--border);border-radius:16px;overflow:hidden;position:sticky;top:88px;}
.dn-price-header{background:linear-gradient(135deg,#0D2137,#1a3c5e);padding:24px;}
.dn-price-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:8px;}
.dn-price-val{font-family:var(--serif);font-size:36px;font-weight:400;color:#fff;letter-spacing:-1px;}
.dn-price-sub{font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;}
.dn-price-body{padding:20px;}
.dn-price-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;}
.dn-price-row:last-of-type{border-bottom:none;}
.dn-price-row-label{color:var(--muted);font-weight:300;}
.dn-price-row-val{color:var(--navy);font-weight:500;}
.dn-contact-btn{width:100%;padding:14px;background:var(--gold);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:var(--sans);font-weight:600;margin-top:16px;transition:background 0.2s;}
.dn-contact-btn:hover{background:#B8962A;}
.dn-owner-row{display:flex;align-items:center;gap:10px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);}
.dn-owner-avatar{width:36px;height:36px;border-radius:50%;background:var(--navy);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600;flex-shrink:0;}
.dn-owner-name{font-size:13px;font-weight:500;color:var(--navy);}
.dn-owner-role{font-size:10px;color:var(--muted);}
`;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  SATILIK:        { color: "#2D6A4F", bg: "#F0FAF4" },
  KIRALIK:        { color: "#1A4A7A", bg: "#EEF4FF" },
  GUNLUK_KIRALIK: { color: "#1A4A7A", bg: "#EEF4FF" },
  DEVREN_SATILIK: { color: "#5B2D8E", bg: "#F5F0FF" },
  DEVREN_KIRALIK: { color: "#5B2D8E", bg: "#F5F0FF" },
  INSAAT_PROJESI: { color: "#B8560B", bg: "#FFF5ED" },
  KAT_KARSILIGI:  { color: "#B8860B", bg: "#FFFBF0" },
  REZERVE:        { color: "#B8860B", bg: "#FFFBF0" },
  SATILDI:        { color: "#8A8A8A", bg: "#F5F5F5" },
  KIRALANDII:     { color: "#8A8A8A", bg: "#F5F5F5" },
  PASIF:          { color: "#8A8A8A", bg: "#F5F5F5" },
};

export default function UnitDetailPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    fetchUnit();
  }, [hydrated, user]);

  const fetchUnit = async () => {
    try {
      const r = await api.get(`/units/${id}`);
      setUnit(r.data);
    } catch {
      router.push("/stok");
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated || loading) return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ width: 32, height: 32, border: "2px solid #C9A84C", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (!unit) return null;

  const ss = STATUS_COLORS[unit.status] || { color: "#8A8A8A", bg: "#F5F5F5" };
  const mapQuery = encodeURIComponent(`${unit.project?.city} ${unit.project?.district} ${unit.project?.address}`);
  const ownerInitial = unit.project?.owner?.firstName?.[0] || "?";

  return (
    <>
      <style>{CSS}</style>
      <nav className="dn-nav">
        <a href="/dashboard" className="dn-logo">
          <img src="/LOGO_EPH.png" alt="EPH" />
          <div>
            <div className="dn-logo-text">EPH Platform</div>
            <div className="dn-logo-sub">Emlak Portfoy Havuzu</div>
          </div>
        </a>
        <Link href="/stok" className="dn-back">
          ← Stok Listesine Dön
        </Link>
      </nav>

      <main className="dn-main">
        {/* GALERİ */}
        <div className="dn-gallery">
          <div className="dn-gallery-placeholder">
            <div className="dn-gallery-icon">🏠</div>
            <div className="dn-gallery-text">Fotoğraf Yüklenmemiş</div>
          </div>
          <div className="dn-gallery-badge">{STATUS_LABELS[unit.status]}</div>
          <div className="dn-gallery-count">0 Fotoğraf</div>
        </div>

        <div className="dn-layout">
          {/* SOL */}
          <div className="dn-left">
            <div className="dn-title-block">
              <div className="dn-status-row">
                <span className="dn-status-badge" style={{ borderColor: ss.color, color: ss.color, background: ss.bg }}>
                  {STATUS_LABELS[unit.status]}
                </span>
                {unit.tapuVerified && <span style={{ fontSize: 10, color: "#2D6A4F", border: "1px solid #2D6A4F", padding: "4px 10px", borderRadius: 20, background: "#F0FAF4" }}>✓ Tapu</span>}
                {unit.photoVerified && <span style={{ fontSize: 10, color: "#2D6A4F", border: "1px solid #2D6A4F", padding: "4px 10px", borderRadius: 20, background: "#F0FAF4" }}>✓ Fotoğraf</span>}
                {unit.yetkiVerified && <span style={{ fontSize: 10, color: "#2D6A4F", border: "1px solid #2D6A4F", padding: "4px 10px", borderRadius: 20, background: "#F0FAF4" }}>✓ Yetki</span>}
              </div>
              <h1 className="dn-title">
                {unit.project?.name} · {TYPE_LABELS[unit.type] || unit.type}
              </h1>
              <div className="dn-subtitle">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {unit.project?.city} / {unit.project?.district}{unit.project?.address ? ` — ${unit.project.address}` : ""}
              </div>
            </div>

            <div className="dn-divider" />

            {/* BİLGİ GRID */}
            <div className="dn-section">
              <div className="dn-section-title">İlan Bilgileri</div>
              <div className="dn-info-grid">
                {[
                  { label: "Alan", val: unit.area ? `${unit.area} m²` : "—" },
                  { label: "Oda Sayısı", val: unit.roomCount || "—" },
                  { label: "Bulunduğu Kat", val: unit.floor != null ? `${unit.floor}. Kat` : "—" },
                  { label: "Daire No", val: unit.number || "—" },
                  { label: "Şehir", val: unit.project?.city || "—" },
                  { label: "İlçe", val: unit.project?.district || "—" },
                ].map(item => (
                  <div key={item.label} className="dn-info-card">
                    <div className="dn-info-label">{item.label}</div>
                    <div className="dn-info-val">{item.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AÇIKLAMA */}
            {unit.description && (
              <div className="dn-section">
                <div className="dn-section-title">İlan Açıklaması</div>
                <p className="dn-desc">{unit.description}</p>
              </div>
            )}

            {/* HARİTA */}
            <div className="dn-section">
              <div className="dn-section-title">Konum</div>
              <div className="dn-map">
                <iframe
                  src={`https://maps.google.com/maps?q=${mapQuery}&output=embed&z=15`}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          {/* SAĞ - FİYAT KARTI */}
          <div>
            <div className="dn-price-card">
              <div className="dn-price-header">
                <div className="dn-price-label">Fiyat</div>
                <div className="dn-price-val">{unit.price?.toLocaleString("tr-TR")} TL</div>
                <div className="dn-price-sub">{STATUS_LABELS[unit.status]}</div>
              </div>
              <div className="dn-price-body">
                {[
                  { label: "Emlak Tipi", val: TYPE_LABELS[unit.type] || unit.type },
                  { label: "Alan", val: unit.area ? `${unit.area} m²` : "—" },
                  { label: "Oda", val: unit.roomCount || "—" },
                  { label: "Kat", val: unit.floor != null ? `${unit.floor}. Kat` : "—" },
                  { label: "No", val: unit.number || "—" },
                ].map(row => (
                  <div key={row.label} className="dn-price-row">
                    <span className="dn-price-row-label">{row.label}</span>
                    <span className="dn-price-row-val">{row.val}</span>
                  </div>
                ))}
                <button className="dn-contact-btn">İletişime Geç</button>
                <div className="dn-owner-row">
                  <div className="dn-owner-avatar">{ownerInitial}</div>
                  <div>
                    <div className="dn-owner-name">{unit.project?.owner?.firstName} {unit.project?.owner?.lastName}</div>
                    <div className="dn-owner-role">İlan Sahibi</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}