"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface UnitDetail {
  id: string;
  type: string;
  floor?: number;
  number: string;
  roomCount?: string;
  area?: number;
  price: number;
  status: string;
  description?: string;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  createdAt?: string;
  project?: {
    id: string;
    name: string;
    city: string;
    district: string;
    address: string;
    owner?: {
      firstName: string;
      lastName: string;
      role?: string;
      email?: string;
      phone?: string;
    };
  };
}

const STATUS_LABELS: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık",
  DEVREN_KIRALIK: "Devren Kiralık",
  INSAAT_PROJESI: "İnşaat Projesi",
  KAT_KARSILIGI: "Kat Karşılığı",
  REZERVE: "Rezerve",
  SATILDI: "Satıldı",
  KIRALANDII: "Kiralandı",
  PASIF: "Pasif",
};

const TYPE_LABELS: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  REZIDANS: "Rezidans",
  MUSTAK_EV: "Müstakil Ev",
  KOSK_YALI: "Köşk/Yalı",
  CIFTLIK_EVI: "Çiftlik Evi",
  PREFABRIK_EV: "Prefabrik Ev",
  DUKKAN_MAGAZA: "Dükkan/Mağaza",
  OFIS_BURO: "Ofis/Büro",
  PLAZA_KATI: "Plaza Katı",
  DEPO_ANTREPO: "Depo/Antrepo",
  FABRIKA_ATOLYE: "Fabrika/Atölye",
  OTEL_PANSIYON: "Otel/Pansiyon",
  DUGUN_SALONU: "Düğün Salonu",
  ARSA: "Arsa",
  TARLA: "Tarla",
  BAHCE: "Bahçe",
  ZEYTINLIK: "Zeytinlik",
  ADA: "Ada",
  DEVRE_MULK: "Devre Mülk",
  TURISTIK_TESIS: "Turistik Tesis",
};

const STATUS_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  SATILIK: { color: "#0F7A4F", bg: "#ECFDF3", border: "#BCE7CE" },
  KIRALIK: { color: "#175CD3", bg: "#EFF6FF", border: "#BFDBFE" },
  GUNLUK_KIRALIK: { color: "#175CD3", bg: "#EFF6FF", border: "#BFDBFE" },
  DEVREN_SATILIK: { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  DEVREN_KIRALIK: { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  INSAAT_PROJESI: { color: "#B45309", bg: "#FFF7ED", border: "#FED7AA" },
  KAT_KARSILIGI: { color: "#B45309", bg: "#FFF7ED", border: "#FED7AA" },
  REZERVE: { color: "#A16207", bg: "#FEFCE8", border: "#FDE68A" },
  SATILDI: { color: "#667085", bg: "#F2F4F7", border: "#D0D5DD" },
  KIRALANDII: { color: "#667085", bg: "#F2F4F7", border: "#D0D5DD" },
  PASIF: { color: "#667085", bg: "#F2F4F7", border: "#D0D5DD" },
};

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#f5f6f8;color:#111827;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
a{text-decoration:none;color:inherit}
.detail-shell{min-height:100vh;background:radial-gradient(circle at top left,#fff7df 0,#f5f6f8 34%,#eef1f6 100%);padding:30px}
.detail-wrap{max-width:1180px;margin:0 auto}
.detail-back{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #e4e7ec;border-radius:999px;padding:11px 16px;color:#475467;font-weight:900;font-size:13px;box-shadow:0 10px 28px rgba(15,23,42,.06);margin-bottom:18px}
.detail-hero{background:linear-gradient(135deg,#111827 0%,#1f2937 56%,#3b2f17 100%);border-radius:32px;padding:34px;color:#fff;box-shadow:0 24px 80px rgba(15,23,42,.2);position:relative;overflow:hidden;margin-bottom:22px}
.detail-hero:before{content:"";position:absolute;right:-90px;top:-90px;width:280px;height:280px;border-radius:50%;background:rgba(214,179,90,.28);filter:blur(10px)}
.detail-top{display:flex;justify-content:space-between;gap:22px;position:relative;z-index:1}
.detail-eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:#d6b35a;font-weight:950;margin-bottom:10px}
.detail-title{font-size:44px;line-height:1;letter-spacing:-.06em;font-weight:950;margin:0;max-width:760px}
.detail-sub{font-size:15px;color:rgba(255,255,255,.7);margin-top:14px;line-height:1.6}
.detail-price{text-align:right;min-width:260px}
.detail-price-label{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.55);font-weight:950}
.detail-price-value{font-size:32px;font-weight:950;color:#f4d77a;margin-top:8px;white-space:nowrap}
.detail-badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px;position:relative;z-index:1}
.detail-badge{display:inline-flex;align-items:center;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:950;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.09);color:#fff}
.detail-grid{display:grid;grid-template-columns:1fr 360px;gap:22px}
.detail-card{background:rgba(255,255,255,.94);border:1px solid rgba(15,23,42,.08);border-radius:28px;box-shadow:0 18px 55px rgba(15,23,42,.08);overflow:hidden}
.detail-card-head{padding:22px 24px;border-bottom:1px solid #eef0f3}
.detail-card-title{font-size:18px;font-weight:950;letter-spacing:-.03em;margin:0}
.detail-card-sub{font-size:13px;color:#667085;margin-top:5px}
.detail-card-body{padding:24px}
.detail-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.detail-stat{background:#f8fafc;border:1px solid #eef0f3;border-radius:20px;padding:18px}
.detail-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#98a2b3;font-weight:950}
.detail-stat-value{font-size:20px;font-weight:950;color:#111827;margin-top:8px}
.detail-section{margin-top:22px}
.detail-section-title{font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:#b08a2e;font-weight:950;margin-bottom:12px}
.detail-desc{background:#fbfcfd;border:1px solid #eef0f3;border-radius:20px;padding:18px;color:#475467;line-height:1.75;font-size:14px}
.detail-list{display:grid;gap:12px}
.detail-row{display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid #eef0f3;padding:0 0 12px}
.detail-row:last-child{border-bottom:0;padding-bottom:0}
.detail-key{font-size:13px;color:#667085;font-weight:800}
.detail-val{font-size:13px;color:#111827;font-weight:950;text-align:right}
.detail-status{display:inline-flex;align-items:center;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:950;border:1px solid}
.detail-action{width:100%;border:none;border-radius:18px;background:#111827;color:#fff;padding:15px 16px;font-weight:950;cursor:pointer;margin-top:12px}
.detail-action.secondary{background:#fff;color:#111827;border:1px solid #e4e7ec}
.detail-empty{min-height:100vh;display:grid;place-items:center;background:#f5f6f8;padding:24px;text-align:center}
.detail-empty-card{background:#fff;border:1px solid #e4e7ec;border-radius:28px;padding:36px;box-shadow:0 18px 55px rgba(15,23,42,.08);max-width:460px}
.detail-empty-title{font-size:24px;font-weight:950;margin-bottom:8px}
.detail-empty-sub{color:#667085;line-height:1.6}
@media(max-width:900px){.detail-shell{padding:18px}.detail-top{flex-direction:column}.detail-price{text-align:left}.detail-title{font-size:34px}.detail-grid{grid-template-columns:1fr}.detail-stats{grid-template-columns:1fr 1fr}}
`;

function getStatusStyle(status?: string) {
  return STATUS_COLORS[status || ""] || { color: "#667085", bg: "#F2F4F7", border: "#D0D5DD" };
}

function money(value?: number) {
  if (value == null) return "-";
  return `${value.toLocaleString("tr-TR")} TL`;
}

function dateText(value?: string) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

export default function StokDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (!id) return;

    const fetchUnit = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/units/${id}`);
        setUnit(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.message || "İlan detayı alınamadı.");
      } finally {
        setLoading(false);
      }
    };

    fetchUnit();
  }, [id]);

  if (loading) {
    return (
      <div className="detail-empty">
        <style>{CSS}</style>
        <div className="detail-empty-card">
          <div className="detail-empty-title">İlan yükleniyor...</div>
          <div className="detail-empty-sub">Portföy bilgileri hazırlanıyor.</div>
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="detail-empty">
        <style>{CSS}</style>
        <div className="detail-empty-card">
          <div className="detail-empty-title">İlan bulunamadı</div>
          <div className="detail-empty-sub">{error || "Bu ilan kaydı mevcut değil veya erişim yetkiniz yok."}</div>
          <button className="detail-action" onClick={() => router.push("/stok")}>Stok sayfasına dön</button>
        </div>
      </div>
    );
  }

  const status = getStatusStyle(unit.status);
  const ownerName = `${unit.project?.owner?.firstName || "-"} ${unit.project?.owner?.lastName || ""}`.trim();

  return (
    <div className="detail-shell">
      <style>{CSS}</style>

      <div className="detail-wrap">
        <Link href="/stok" className="detail-back">← Stok listesine dön</Link>

        <section className="detail-hero">
          <div className="detail-top">
            <div>
              <div className="detail-eyebrow">Premium Portföy Detayı</div>
              <h1 className="detail-title">
                {unit.project?.name || "İlan"} · {TYPE_LABELS[unit.type] || unit.type}
              </h1>
              <div className="detail-sub">
                📍 {unit.project?.city || "-"} / {unit.project?.district || "-"}
                {unit.project?.address ? ` — ${unit.project.address}` : ""}
              </div>
            </div>

            <div className="detail-price">
              <div className="detail-price-label">Liste Fiyatı</div>
              <div className="detail-price-value">{money(unit.price)}</div>
            </div>
          </div>

          <div className="detail-badges">
            <span className="detail-badge">{STATUS_LABELS[unit.status] || unit.status}</span>
            {unit.roomCount && <span className="detail-badge">{unit.roomCount}</span>}
            {unit.area && <span className="detail-badge">{unit.area} m²</span>}
            {unit.floor != null && <span className="detail-badge">Kat {unit.floor}</span>}
            {unit.number && <span className="detail-badge">No: {unit.number}</span>}
          </div>
        </section>

        <section className="detail-grid">
          <div className="detail-card">
            <div className="detail-card-head">
              <h2 className="detail-card-title">İlan Özeti</h2>
              <div className="detail-card-sub">Mülk ve proje bilgileri</div>
            </div>

            <div className="detail-card-body">
              <div className="detail-stats">
                <div className="detail-stat">
                  <div className="detail-stat-label">Tip</div>
                  <div className="detail-stat-value">{TYPE_LABELS[unit.type] || unit.type}</div>
                </div>
                <div className="detail-stat">
                  <div className="detail-stat-label">Alan</div>
                  <div className="detail-stat-value">{unit.area ? `${unit.area} m²` : "-"}</div>
                </div>
                <div className="detail-stat">
                  <div className="detail-stat-label">Oda</div>
                  <div className="detail-stat-value">{unit.roomCount || "-"}</div>
                </div>
                <div className="detail-stat">
                  <div className="detail-stat-label">Daire No</div>
                  <div className="detail-stat-value">{unit.number || "-"}</div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Açıklama</div>
                <div className="detail-desc">
                  {unit.description || "Bu ilan için henüz açıklama eklenmemiş."}
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Doğrulama</div>
                <div className="detail-badges" style={{ marginTop: 0 }}>
                  <span className="detail-badge" style={{ background: "#fff", color: "#111827", borderColor: "#e4e7ec" }}>
                    {unit.tapuVerified ? "✓ Tapu doğrulandı" : "Tapu bekliyor"}
                  </span>
                  <span className="detail-badge" style={{ background: "#fff", color: "#111827", borderColor: "#e4e7ec" }}>
                    {unit.photoVerified ? "✓ Fotoğraf doğrulandı" : "Fotoğraf bekliyor"}
                  </span>
                  <span className="detail-badge" style={{ background: "#fff", color: "#111827", borderColor: "#e4e7ec" }}>
                    {unit.yetkiVerified ? "✓ Yetki doğrulandı" : "Yetki bekliyor"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <aside className="detail-card">
            <div className="detail-card-head">
              <h2 className="detail-card-title">Portföy Kartı</h2>
              <div className="detail-card-sub">Hızlı bilgiler</div>
            </div>

            <div className="detail-card-body">
              <div className="detail-list">
                <div className="detail-row">
                  <div className="detail-key">Durum</div>
                  <div className="detail-val">
                    <span className="detail-status" style={{ color: status.color, background: status.bg, borderColor: status.border }}>
                      {STATUS_LABELS[unit.status] || unit.status}
                    </span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-key">Proje</div>
                  <div className="detail-val">{unit.project?.name || "-"}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-key">Şehir</div>
                  <div className="detail-val">{unit.project?.city || "-"}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-key">İlçe</div>
                  <div className="detail-val">{unit.project?.district || "-"}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-key">Danışman</div>
                  <div className="detail-val">{ownerName || "-"}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-key">Kayıt Tarihi</div>
                  <div className="detail-val">{dateText(unit.createdAt)}</div>
                </div>
              </div>

              <button className="detail-action" onClick={() => router.push("/stok")}>Listeye Dön</button>
              <button className="detail-action secondary" onClick={() => window.print()}>Yazdır / PDF Al</button>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
