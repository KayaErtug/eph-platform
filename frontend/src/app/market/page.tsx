"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";

interface MarketData {
  summary: {
    totalActive: number; totalUnits: number; newUnits30: number; newUnits7: number;
    closedUnits: number; closureRate: number; avgPrice: number; minPrice: number;
    maxPrice: number; avgPricePerM2: number; totalUsers: number; totalProjects: number; totalCustomers: number;
  };
  topDistricts: { district: string; city: string; count: number; avgPrice: number; avgPricePerM2: number }[];
  statusDistribution: Record<string, number>;
  typeDistribution: { type: string; count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık", KIRALIK: "Kiralık", GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık", DEVREN_KIRALIK: "Devren Kiralık",
  INSAAT_PROJESI: "İnşaat Projesi", KAT_KARSILIGI: "Kat Karşılığı",
  REZERVE: "Rezerve", SATILDI: "Satıldı", KIRALANDII: "Kiralandı",
};

const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire", VILLA: "Villa", REZIDANS: "Rezidans", MUSTAK_EV: "Müstakil Ev",
  ARSA: "Arsa", TARLA: "Tarla", OFIS_BURO: "Ofis/Büro", DUKKAN_MAGAZA: "Dükkan/Mağaza",
  DEPO_ANTREPO: "Depo/Antrepo", FABRIKA_ATOLYE: "Fabrika/Atölye",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--navy:#0F2044;--gold:#C9A84C;--cream:#F5F3EF;--warm:#FAFAF8;--text:#1A1A2E;--muted:#8A8A8A;--border:#E2DDD5;--serif:'Cormorant Garamond',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;}
body{font-family:var(--sans);background:var(--warm);color:var(--text);}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}

.mk-nav{height:68px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 48px;position:sticky;top:0;z-index:100;}
@media(max-width:768px){.mk-nav{padding:0 20px;}}
.mk-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
.mk-logo img{width:34px;height:34px;object-fit:contain;}
.mk-logo-text{font-family:var(--serif);font-size:18px;font-weight:500;color:var(--navy);}
.mk-logo-sub{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);}
.mk-nav-links{display:flex;align-items:center;gap:4px;}
.mk-nav-item{padding:8px 14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:all 0.2s;border-bottom:2px solid transparent;}
.mk-nav-item:hover{color:var(--navy);border-bottom-color:var(--gold);}
.mk-nav-item.active{color:var(--navy);border-bottom-color:var(--gold);}
.mk-logout{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);background:none;border:1px solid var(--border);padding:7px 14px;cursor:pointer;font-family:var(--sans);transition:all 0.2s;}
.mk-logout:hover{border-color:var(--navy);color:var(--navy);}

.mk-main{max-width:1300px;margin:0 auto;padding:48px 48px 100px;animation:fadeUp 0.5s ease;}
@media(max-width:768px){.mk-main{padding:32px 20px;}}

.mk-header{margin-bottom:48px;padding-bottom:40px;border-bottom:1px solid var(--border);display:flex;align-items:flex-end;justify-content:space-between;}
.mk-title{font-family:var(--serif);font-size:clamp(36px,4vw,52px);font-weight:300;color:var(--navy);line-height:1.1;}
.mk-title em{font-style:italic;color:var(--gold);}
.mk-sub{font-size:13px;color:var(--muted);margin-top:8px;font-weight:300;}
.mk-live{display:flex;align-items:center;gap:8px;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);}
.mk-live-dot{width:6px;height:6px;border-radius:50%;background:#2D6A4F;animation:pulse 2s infinite;}

/* KPI GRID */
.mk-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);margin-bottom:32px;}
@media(max-width:1024px){.mk-kpi{grid-template-columns:1fr 1fr;}}
@media(max-width:600px){.mk-kpi{grid-template-columns:1fr;}}
.mk-kpi-card{background:#fff;padding:28px 24px;}
.mk-kpi-label{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;}
.mk-kpi-val{font-family:var(--serif);font-size:36px;font-weight:300;color:var(--navy);line-height:1;}
.mk-kpi-val.gold{color:var(--gold);}
.mk-kpi-val.green{color:#2D6A4F;}
.mk-kpi-val.blue{color:#1A4A7A;}
.mk-kpi-sub{font-size:11px;color:var(--muted);margin-top:8px;font-weight:300;}

/* İKİ KOLON */
.mk-two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
@media(max-width:900px){.mk-two-col{grid-template-columns:1fr;}}

/* PANEL */
.mk-panel{background:#fff;border:1px solid var(--border);padding:28px 32px;}
.mk-panel-title{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--navy);margin-bottom:4px;}
.mk-panel-sub{font-size:11px;color:var(--muted);font-weight:300;margin-bottom:24px;}

/* BÖLGE TABLOSU */
.mk-district-table{width:100%;border-collapse:collapse;}
.mk-district-table th{font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);padding:0 0 12px;text-align:left;border-bottom:1px solid var(--border);}
.mk-district-table th:not(:first-child){text-align:right;}
.mk-district-table td{padding:12px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--navy);}
.mk-district-table td:not(:first-child){text-align:right;font-family:var(--serif);}
.mk-district-table tr:last-child td{border-bottom:none;}
.mk-district-rank{font-size:9px;color:var(--muted);margin-right:8px;font-weight:300;}
.mk-district-bar{height:3px;background:var(--gold);margin-top:4px;transition:width 0.8s ease;}

/* BAR CHART */
.mk-bar-item{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
.mk-bar-label{font-size:11px;color:var(--navy);width:100px;flex-shrink:0;}
.mk-bar-track{flex:1;height:4px;background:var(--border);position:relative;}
.mk-bar-fill{height:4px;background:var(--navy);transition:width 0.8s ease;}
.mk-bar-fill.gold{background:var(--gold);}
.mk-bar-val{font-size:11px;color:var(--muted);width:40px;text-align:right;flex-shrink:0;font-family:var(--serif);}

/* FİYAT PANEL */
.mk-price-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);}
.mk-price-cell{background:var(--warm);padding:20px;}
.mk-price-cell-label{font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
.mk-price-cell-val{font-family:var(--serif);font-size:24px;font-weight:300;color:var(--navy);}
.mk-price-cell-sub{font-size:10px;color:var(--muted);margin-top:4px;}

/* PLATFORM STATS */
.mk-platform{background:var(--navy);padding:28px 32px;margin-bottom:16px;}
.mk-platform-title{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(245,243,239,0.5);margin-bottom:20px;}
.mk-platform-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,0.05);}
@media(max-width:768px){.mk-platform-grid{grid-template-columns:1fr 1fr;}}
.mk-platform-cell{background:rgba(255,255,255,0.02);padding:20px;}
.mk-platform-cell-label{font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(245,243,239,0.4);margin-bottom:8px;}
.mk-platform-cell-val{font-family:var(--serif);font-size:32px;font-weight:300;color:#fff;}
.mk-platform-cell-val.gold{color:var(--gold);}
`;

export default function MarketPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/giris"); return; }
    fetchData();
  }, [hydrated, user]);

  const fetchData = async () => {
    try {
      const r = await api.get("/market/pulse");
      setData(r.data);
      setLastUpdate(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
    } finally { setLoading(false); }
  };

  if (!hydrated || loading) return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ width: 32, height: 32, border: "2px solid #C9A84C", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (!data) return null;

  const { summary, topDistricts, statusDistribution, typeDistribution } = data;
  const maxDistrictCount = Math.max(...topDistricts.map(d => d.count), 1);
  const maxTypeCount = Math.max(...typeDistribution.map(t => t.count), 1);
  const totalStatus = Object.values(statusDistribution).reduce((a, b) => a + b, 0);

  return (
    <>
      <style>{CSS}</style>

      <nav className="mk-nav">
        <a href="/dashboard" className="mk-logo">
          <img src="/LOGO_EPH.png" alt="EPH" />
          <div>
            <div className="mk-logo-text">EPH Platform</div>
            <div className="mk-logo-sub">Emlak Portföy Havuzu</div>
          </div>
        </a>
        <div className="mk-nav-links">
          <Link href="/dashboard" className="mk-nav-item">Ana Sayfa</Link>
          <Link href="/stok" className="mk-nav-item">Stok</Link>
          <Link href="/crm" className="mk-nav-item">CRM</Link>
          <Link href="/market" className="mk-nav-item active">Piyasa</Link>
          {user?.role === "ADMIN" && <Link href="/admin" className="mk-nav-item">Admin</Link>}
        </div>
        <button className="mk-logout" onClick={() => { logout(); router.push("/giris"); }}>Çıkış</button>
      </nav>

      <main className="mk-main">
        <div className="mk-header">
          <div>
            <h1 className="mk-title">Piyasa<br /><em>Nabzı</em></h1>
            <p className="mk-sub">Platform içi gerçek zamanlı piyasa verileri</p>
          </div>
          <div className="mk-live">
            <div className="mk-live-dot" />
            Canlı veri · {lastUpdate}
          </div>
        </div>

        {/* KPI */}
        <div className="mk-kpi">
          {[
            { label: "Aktif Portföy", val: summary.totalActive.toLocaleString("tr-TR"), cls: "", sub: `${summary.totalUnits} toplam ilan` },
            { label: "Son 30 Gün Yeni İlan", val: summary.newUnits30.toLocaleString("tr-TR"), cls: "green", sub: `Son 7 gün: ${summary.newUnits7}` },
            { label: "Ort. İlan Fiyatı", val: `${(summary.avgPrice / 1000000).toFixed(1)}M ₺`, cls: "gold", sub: `Min: ${(summary.minPrice / 1000000).toFixed(1)}M` },
            { label: "Ort. m² Fiyatı", val: `${summary.avgPricePerM2.toLocaleString("tr-TR")} ₺`, cls: "blue", sub: "Tüm aktif ilanlar" },
          ].map(k => (
            <div key={k.label} className="mk-kpi-card">
              <div className="mk-kpi-label">{k.label}</div>
              <div className={`mk-kpi-val ${k.cls}`}>{k.val}</div>
              <div className="mk-kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* PLATFORM İSTATİSTİKLERİ */}
        <div className="mk-platform">
          <div className="mk-platform-title">Platform Genel Durumu</div>
          <div className="mk-platform-grid">
            {[
              { label: "Onaylı Üye", val: summary.totalUsers, cls: "" },
              { label: "Aktif Proje", val: summary.totalProjects, cls: "" },
              { label: "CRM Müşterisi", val: summary.totalCustomers, cls: "" },
              { label: "Kapanma Oranı", val: `%${summary.closureRate}`, cls: "gold" },
            ].map(s => (
              <div key={s.label} className="mk-platform-cell">
                <div className="mk-platform-cell-label">{s.label}</div>
                <div className={`mk-platform-cell-val ${s.cls}`}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FİYAT ANALİZİ */}
        <div className="mk-panel" style={{ marginBottom: 16 }}>
          <div className="mk-panel-title">Fiyat Analizi</div>
          <div className="mk-panel-sub">Platform geneli ilan fiyat dağılımı</div>
          <div className="mk-price-grid">
            <div className="mk-price-cell">
              <div className="mk-price-cell-label">Minimum Fiyat</div>
              <div className="mk-price-cell-val">{(summary.minPrice / 1000000).toFixed(1)}M ₺</div>
              <div className="mk-price-cell-sub">En düşük aktif ilan</div>
            </div>
            <div className="mk-price-cell">
              <div className="mk-price-cell-label">Ortalama Fiyat</div>
              <div className="mk-price-cell-val" style={{ color: "var(--gold)" }}>{(summary.avgPrice / 1000000).toFixed(1)}M ₺</div>
              <div className="mk-price-cell-sub">Tüm aktif ilanlar</div>
            </div>
            <div className="mk-price-cell">
              <div className="mk-price-cell-label">Maksimum Fiyat</div>
              <div className="mk-price-cell-val">{(summary.maxPrice / 1000000).toFixed(1)}M ₺</div>
              <div className="mk-price-cell-sub">En yüksek aktif ilan</div>
            </div>
          </div>
        </div>

        <div className="mk-two-col">
          {/* EN AKTİF BÖLGELER */}
          <div className="mk-panel">
            <div className="mk-panel-title">En Aktif Bölgeler</div>
            <div className="mk-panel-sub">İlan yoğunluğuna göre sıralama</div>
            {topDistricts.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>Henüz veri yok</div>
            ) : (
              <table className="mk-district-table">
                <thead>
                  <tr>
                    <th>Bölge</th>
                    <th>İlan</th>
                    <th>Ort. Fiyat</th>
                    <th>m² Fiyatı</th>
                  </tr>
                </thead>
                <tbody>
                  {topDistricts.map((d, i) => (
                    <tr key={d.district}>
                      <td>
                        <span className="mk-district-rank">#{i + 1}</span>
                        {d.district}
                        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 300 }}>{d.city}</div>
                        <div className="mk-district-bar" style={{ width: `${(d.count / maxDistrictCount) * 100}%` }} />
                      </td>
                      <td>{d.count}</td>
                      <td>{(d.avgPrice / 1000000).toFixed(1)}M</td>
                      <td>{d.avgPricePerM2.toLocaleString("tr-TR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* DURUM & TİP DAĞILIMI */}
          <div>
            <div className="mk-panel" style={{ marginBottom: 16 }}>
              <div className="mk-panel-title">Durum Dağılımı</div>
              <div className="mk-panel-sub">İlan durumlarına göre dağılım</div>
              {Object.entries(statusDistribution).map(([status, count]) => (
                <div key={status} className="mk-bar-item">
                  <div className="mk-bar-label">{STATUS_LABELS[status] || status}</div>
                  <div className="mk-bar-track">
                    <div className="mk-bar-fill" style={{ width: `${(count / totalStatus) * 100}%` }} />
                  </div>
                  <div className="mk-bar-val">{count}</div>
                </div>
              ))}
            </div>

            <div className="mk-panel">
              <div className="mk-panel-title">Mülk Tipi Dağılımı</div>
              <div className="mk-panel-sub">En çok ilan girilen mülk tipleri</div>
              {typeDistribution.map(t => (
                <div key={t.type} className="mk-bar-item">
                  <div className="mk-bar-label">{TYPE_LABELS[t.type] || t.type}</div>
                  <div className="mk-bar-track">
                    <div className="mk-bar-fill gold" style={{ width: `${(t.count / maxTypeCount) * 100}%` }} />
                  </div>
                  <div className="mk-bar-val">{t.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* UYARI NOTU */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", padding: "20px 28px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--navy)", fontWeight: 500 }}>Veri Kaynağı:</strong> Bu veriler EPH Platform içindeki gerçek ilan hareketlerinden otomatik hesaplanmaktadır. Platform büyüdükçe istatistikler daha anlamlı hale gelecektir.
          </div>
        </div>
      </main>
    </>
  );
}