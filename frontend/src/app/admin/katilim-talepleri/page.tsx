"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Eye,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
} from "lucide-react";
import api from "@/lib/api";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "INVITED" | "REGISTERED" | string;

type ApplicationItem = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  requestedRole: string;
  message?: string | null;
  basvuruTuru?: string | null;
  pilotBasvuruMu?: boolean;
  referralCode?: string | null;
  referansliMi?: boolean;
  referansDogrulandiMi?: boolean;
  status: ApplicationStatus;
  adminNote?: string | null;
  profession?: string | null;
  city?: string | null;
  district?: string | null;
  onayYetkiSeviyesi?: string | null;
  isVip?: boolean;
  isRisky?: boolean;
  riskNote?: string | null;
  platformAccepted?: boolean;
  kvkkAccepted?: boolean;
  privacyAccepted?: boolean;
  userAgreementAccepted?: boolean;
  createdAt: string;
  updatedAt: string;
  rejectReason?: string | null;
  referrer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
};

type DashboardResponse = {
  summary: {
    pending: number;
    approvedThisMonth: number;
    rejectedThisMonth: number;
    pilotThisMonth: number;
    total: number;
  };
  items: ApplicationItem[];
};

const roleLabels: Record<string, string> = {
  EMLAKCI: "Emlakçı",
  MUTEAHHIT: "Müteahhit",
  INSAAT_FIRMASI: "İnşaat Firması",
  MODERATOR: "Moderatör",
  ADMIN: "Admin",
  SUPER_ADMIN: "Süper Admin",
};

const statusLabels: Record<string, string> = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  INVITED: "Davet",
  REGISTERED: "Kayıtlı",
};

const cardThemes = ["blue", "green", "purple", "amber", "cyan", "rose"];

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isReferenced(item: ApplicationItem) {
  return Boolean(item.referansliMi || item.basvuruTuru === "REFERANSLI");
}

function getTrustScore(item: ApplicationItem) {
  let score = 48;

  if (item.referansliMi) score += 14;
  if (item.referansDogrulandiMi) score += 14;
  if (item.kvkkAccepted) score += 7;
  if (item.privacyAccepted) score += 5;
  if (item.platformAccepted) score += 5;
  if (item.userAgreementAccepted) score += 5;
  if (item.applicantPhone?.length >= 10) score += 4;
  if (item.city) score += 3;
  if (item.isVip) score += 4;
  if (item.isRisky) score -= 28;

  return Math.max(0, Math.min(score, 100));
}

function getDecision(item: ApplicationItem) {
  const score = getTrustScore(item);

  if (item.isRisky || score < 55) {
    return {
      label: "İncele",
      className: "review",
      text: "Eksik veya riskli bilgi var.",
    };
  }

  if (score >= 80 && (item.referansliMi || item.referansDogrulandiMi)) {
    return {
      label: "Onaylanabilir",
      className: "approve",
      text: "Bilgiler güçlü görünüyor.",
    };
  }

  return {
    label: "Kontrol Et",
    className: "neutral",
    text: "Manuel kontrol önerilir.",
  };
}

function getLegalText(item: ApplicationItem) {
  const accepted = [
    item.kvkkAccepted,
    item.privacyAccepted,
    item.platformAccepted,
    item.userAgreementAccepted,
  ].filter(Boolean).length;

  return `${accepted}/4`;
}

export default function AdminKatilimTalepleriPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<ApplicationItem | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function loadApplications(selectedStatus = status) {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<DashboardResponse>("/admin/katilim-talepleri", {
        params: { status: selectedStatus },
      });

      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Katılım talepleri alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    const items = data?.items || [];
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.applicantName.toLowerCase().includes(normalizedQuery) ||
        item.applicantEmail.toLowerCase().includes(normalizedQuery) ||
        item.applicantPhone.toLowerCase().includes(normalizedQuery) ||
        `${item.city || ""} ${item.district || ""}`.toLowerCase().includes(normalizedQuery);

      const matchesRole = role === "all" || item.requestedRole === role;

      const matchesType =
        type === "all" ||
        (type === "referansli" && isReferenced(item)) ||
        (type === "referanssiz" && !isReferenced(item)) ||
        (type === "pilot" && item.pilotBasvuruMu);

      return matchesQuery && matchesRole && matchesType;
    });
  }, [data?.items, query, role, type]);

  async function handleStatusChange(id: string, nextStatus: "APPROVED" | "REJECTED") {
    setBusyId(id);
    setError("");

    try {
      if (nextStatus === "APPROVED") {
        await api.patch(`/admin/katilim-talepleri/${id}/onayla`, {
          adminNote: note || undefined,
        });
      } else {
        await api.patch(`/admin/katilim-talepleri/${id}/reddet`, {
          adminNote: note || undefined,
          rejectReason: note || "Başvuru admin tarafından reddedildi.",
        });
      }

      setSelected(null);
      setNote("");
      await loadApplications(status);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "İşlem tamamlanamadı.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveNote() {
    if (!selected) return;

    setBusyId(selected.id);
    setError("");

    try {
      await api.patch(`/admin/katilim-talepleri/${selected.id}/not`, {
        adminNote: note,
      });

      setSelected(null);
      setNote("");
      await loadApplications(status);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Not kaydedilemedi.");
    } finally {
      setBusyId(null);
    }
  }

  function openDetail(item: ApplicationItem) {
    setSelected(item);
    setNote(item.adminNote || "");
  }

  function handleStatusFilter(nextStatus: string) {
    setStatus(nextStatus);
    loadApplications(nextStatus);
  }

  const summary = data?.summary || {
    pending: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    pilotThisMonth: 0,
    total: 0,
  };

  return (
    <main className="approval-page">
      <section className="hero-flag">
        <div className="flag-overlay" />
        <div className="quote-card">
          <p>Vatan ne Türkiye'dir Türklere, ne Türkistan.</p>
          <p>Vatan büyük ve müebbet bir ülkedir: Turan.</p>
          <span>— Ziya Gökalp</span>
        </div>
      </section>

      <section className="compact-head">
        <a href="/admin" className="back-link" aria-label="Admin paneline dön">
          <ArrowLeft size={19} />
        </a>
        <div>
          <h1>Katılım Talepleri</h1>
          <p>Admin Başvuru İnceleme Merkezi</p>
        </div>
        <button className="refresh-button" onClick={() => loadApplications(status)} aria-label="Yenile">
          <RefreshCcw size={18} />
        </button>
      </section>

      <section className="summary-strip" aria-label="Katılım talepleri özeti">
        <button className={status === "PENDING" ? "active blue" : "blue"} onClick={() => handleStatusFilter("PENDING")}>
          <span>Bekleyen</span>
          <strong>{summary.pending}</strong>
        </button>
        <button className={status === "APPROVED" ? "active green" : "green"} onClick={() => handleStatusFilter("APPROVED")}>
          <span>Onay</span>
          <strong>{summary.approvedThisMonth}</strong>
        </button>
        <button className={status === "REJECTED" ? "active red" : "red"} onClick={() => handleStatusFilter("REJECTED")}>
          <span>Red</span>
          <strong>{summary.rejectedThisMonth}</strong>
        </button>
        <button className={type === "pilot" ? "active purple" : "purple"} onClick={() => setType(type === "pilot" ? "all" : "pilot")}>
          <span>Pilot</span>
          <strong>{summary.pilotThisMonth}</strong>
        </button>
      </section>

      <section className="filter-board">
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ad, telefon, e-posta..."
          />
        </label>
        <button className="filter-icon" type="button" aria-label="Filtre seçenekleri">
          <SlidersHorizontal size={18} />
        </button>
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Başvuru türü">
          <option value="all">Tüm Türler</option>
          <option value="referansli">Referanslı</option>
          <option value="referanssiz">Referanssız</option>
          <option value="pilot">Pilot</option>
        </select>
        <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Rol">
          <option value="all">Tüm Roller</option>
          <option value="EMLAKCI">Emlakçı</option>
          <option value="MUTEAHHIT">Müteahhit</option>
          <option value="INSAAT_FIRMASI">İnşaat Firması</option>
          <option value="MODERATOR">Moderatör</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select value={status} onChange={(event) => handleStatusFilter(event.target.value)} aria-label="Durum">
          <option value="all">Tüm Durumlar</option>
          <option value="PENDING">Bekliyor</option>
          <option value="APPROVED">Onaylandı</option>
          <option value="REJECTED">Reddedildi</option>
          <option value="INVITED">Davet Edildi</option>
          <option value="REGISTERED">Kayıt Tamamlandı</option>
        </select>
      </section>

      {error ? <div className="notice error">{error}</div> : null}

      {loading ? (
        <div className="notice">Katılım talepleri yükleniyor...</div>
      ) : filteredItems.length === 0 ? (
        <div className="notice">Gösterilecek katılım talebi bulunamadı.</div>
      ) : (
        <section className="decision-list">
          {filteredItems.map((item, index) => {
            const score = getTrustScore(item);
            const decision = getDecision(item);
            const locationText = `${item.district || "-"} / ${item.city || "-"}`;

            return (
              <article className={`decision-card ${cardThemes[index % cardThemes.length]}`} key={item.id}>
                <div className="card-main">
                  <div className="identity-mark">{initials(item.applicantName)}</div>

                  <div className="candidate">
                    <div className="candidate-topline">
                      <h2>{item.applicantName}</h2>
                      <span className={`status-badge ${item.status.toLowerCase()}`}>
                        {statusLabels[item.status] || item.status}
                      </span>
                    </div>

                    <div className="meta-line">
                      <b>{roleLabels[item.requestedRole] || item.requestedRole}</b>
                      <i />
                      <span>{locationText}</span>
                      <i />
                      <time>{formatDate(item.createdAt)}</time>
                    </div>

                    <div className="micro-tags">
                      <span>{isReferenced(item) ? "Referanslı" : "Referanssız"}</span>
                      {item.pilotBasvuruMu ? <span>Pilot</span> : null}
                      <span>{item.referansDogrulandiMi ? "Ref. Onaylı" : isReferenced(item) ? "Ref. Bekliyor" : "Ref. Yok"}</span>
                      <span>Yasal {getLegalText(item)}</span>
                      <strong className={score >= 80 ? "good" : score >= 60 ? "mid" : "bad"}>{score}/100</strong>
                    </div>

                    <div className="authority-line">
                      <span>Yetki: {item.onayYetkiSeviyesi || "ADMIN_SUPER_ADMIN"}</span>
                    </div>
                  </div>
                </div>

                <aside className="decision-aside">
                  <div className={`lina-chip ${decision.className}`}>
                    <Sparkles size={13} />
                    <span>Lina</span>
                    <strong>{decision.label}</strong>
                  </div>
                  <div className="quick-actions">
                    <button onClick={() => openDetail(item)} aria-label={`${item.applicantName} detay`}>
                      <Eye size={17} />
                    </button>
                    <button
                      className="approve"
                      disabled={busyId === item.id || item.status !== "PENDING"}
                      onClick={() => handleStatusChange(item.id, "APPROVED")}
                      aria-label={`${item.applicantName} onayla`}
                    >
                      <Check size={18} />
                    </button>
                    <button
                      className="reject"
                      disabled={busyId === item.id || item.status !== "PENDING"}
                      onClick={() => {
                        setSelected(item);
                        setNote(item.adminNote || "");
                      }}
                      aria-label={`${item.applicantName} reddet`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </aside>
              </article>
            );
          })}
        </section>
      )}

      {selected ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="detail-modal">
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Kapat">
              <X size={18} />
            </button>

            <div className="modal-header">
              <div className="identity-mark large">{initials(selected.applicantName)}</div>
              <div>
                <h2>{selected.applicantName}</h2>
                <p>{roleLabels[selected.requestedRole] || selected.requestedRole}</p>
              </div>
            </div>

            <div className="decision-panel">
              <div>
                <span>Lina Ön Değerlendirme</span>
                <strong>{getDecision(selected).label}</strong>
                <small>{getDecision(selected).text}</small>
              </div>
              <div>
                <span>Güven Skoru</span>
                <strong>{getTrustScore(selected)}/100</strong>
                <small>{selected.isRisky ? selected.riskNote || "Riskli başvuru" : "Kritik risk görünmüyor"}</small>
              </div>
            </div>

            <div className="detail-grid">
              <span>E-posta</span>
              <b>{selected.applicantEmail}</b>
              <span>Telefon</span>
              <b>{selected.applicantPhone || "-"}</b>
              <span>Konum</span>
              <b>{selected.district || "-"} / {selected.city || "-"}</b>
              <span>Onay Yetkisi</span>
              <b>{selected.onayYetkiSeviyesi || "ADMIN_SUPER_ADMIN"}</b>
            </div>

            <label className="note-box">
              Admin Notu
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Başvuru hakkında kısa not ekleyin..."
              />
            </label>

            <div className="modal-actions">
              <button className="secondary-button" onClick={handleSaveNote} disabled={busyId === selected.id}>
                Notu Kaydet
              </button>
              <button
                className="danger-button"
                onClick={() => handleStatusChange(selected.id, "REJECTED")}
                disabled={busyId === selected.id || selected.status !== "PENDING"}
              >
                Reddet
              </button>
              <button
                className="primary-button"
                onClick={() => handleStatusChange(selected.id, "APPROVED")}
                disabled={busyId === selected.id || selected.status !== "PENDING"}
              >
                Onayla
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <style jsx>{`
        .approval-page {
          min-height: 100dvh;
          background:
            radial-gradient(circle at 18% 0%, rgba(37, 99, 235, 0.08), transparent 30%),
            linear-gradient(180deg, #f7fbff 0%, #eef4fb 100%);
          color: #06194a;
          padding-bottom: 94px;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .hero-flag {
          height: 92px;
          position: sticky;
          top: 0;
          z-index: 20;
          overflow: hidden;
          border-bottom: 1px solid #dbe7f5;
          background:
            linear-gradient(90deg, rgba(207, 18, 38, 0.92) 0%, rgba(207, 18, 38, 0.78) 28%, rgba(255, 255, 255, 0.72) 54%, rgba(255, 255, 255, 0.94) 100%),
            url("/admin-bayrak.jpg") center / cover no-repeat,
            linear-gradient(90deg, #dc1f32 0%, #f8fafc 100%);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }

        .hero-flag::before {
          content: "";
          position: absolute;
          left: 14px;
          top: 25px;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.02);
        }

        .hero-flag::after {
          content: "★";
          position: absolute;
          left: 55px;
          top: 27px;
          color: #ffffff;
          font-size: 24px;
          font-weight: 950;
          text-shadow: 0 3px 8px rgba(127, 29, 29, 0.26);
        }

        .flag-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent),
            radial-gradient(circle at 72% 45%, rgba(15, 23, 42, 0.08), transparent 34%);
        }

        .quote-card {
          position: absolute;
          left: 112px;
          right: 10px;
          top: 12px;
          min-height: 68px;
          border-radius: 16px;
          padding: 12px 13px 9px;
          background: rgba(255, 255, 255, 0.64);
          border: 1px solid rgba(255, 255, 255, 0.66);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(10px);
        }

        .quote-card p {
          margin: 0;
          color: #071332;
          font-size: 12.2px;
          line-height: 1.32;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .quote-card span {
          display: block;
          margin-top: 3px;
          color: #172033;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 11px;
          font-weight: 800;
          font-style: italic;
          text-align: right;
        }

        .compact-head {
          height: 55px;
          padding: 0 12px;
          display: grid;
          grid-template-columns: 34px 1fr 40px;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid rgba(221, 231, 243, 0.82);
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(12px);
        }

        .back-link,
        .refresh-button {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid #dbe7f5;
          background: #ffffff;
          color: #06194a;
          display: grid;
          place-items: center;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
          text-decoration: none;
        }

        .refresh-button {
          justify-self: end;
        }

        .compact-head h1 {
          margin: 0;
          text-align: center;
          font-size: 24px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.055em;
          color: #06194a;
        }

        .compact-head p {
          margin: 3px 0 0;
          text-align: center;
          color: #64748b;
          font-size: 10px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .summary-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
          padding: 9px 10px;
          border-bottom: 1px solid rgba(221, 231, 243, 0.78);
        }

        .summary-strip button {
          height: 45px;
          border: 1px solid #dbe7f5;
          background: rgba(255, 255, 255, 0.86);
          border-radius: 14px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 1px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);
        }

        .summary-strip button.active {
          border-width: 2px;
          background: #ffffff;
        }

        .summary-strip span {
          color: #334155;
          font-size: 9.2px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
        }

        .summary-strip strong {
          font-size: 19px;
          line-height: 1;
          font-weight: 950;
        }

        .summary-strip .blue strong,
        .summary-strip .blue.active {
          color: #1557d6;
          border-color: #93c5fd;
        }

        .summary-strip .green strong,
        .summary-strip .green.active {
          color: #16a34a;
          border-color: #86efac;
        }

        .summary-strip .red strong,
        .summary-strip .red.active {
          color: #e11d48;
          border-color: #fda4af;
        }

        .summary-strip .purple strong,
        .summary-strip .purple.active {
          color: #7c3aed;
          border-color: #c4b5fd;
        }

        .filter-board {
          display: grid;
          grid-template-columns: 1fr 43px;
          gap: 8px;
          padding: 10px;
        }

        .search-box,
        .filter-icon,
        .filter-board select {
          height: 43px;
          border: 1px solid #d6e3f3;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.94);
          color: #06194a;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #06194a;
          font-size: 14px;
          font-weight: 850;
        }

        .search-box input::placeholder {
          color: #94a3b8;
        }

        .filter-icon {
          display: grid;
          place-items: center;
        }

        .filter-board select {
          padding: 0 12px;
          font-size: 13px;
          font-weight: 900;
          outline: none;
        }

        .filter-board select:last-child {
          grid-column: 1 / -1;
        }

        .notice {
          margin: 0 10px 10px;
          border: 1px solid #dbe7f5;
          border-radius: 16px;
          padding: 13px;
          background: #ffffff;
          color: #334155;
          text-align: center;
          font-size: 13px;
          font-weight: 900;
        }

        .notice.error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .decision-list {
          display: grid;
          gap: 8px;
          padding: 0 9px 18px;
        }

        .decision-card {
          min-height: 96px;
          display: grid;
          grid-template-columns: 1fr 82px;
          gap: 8px;
          position: relative;
          overflow: hidden;
          border: 1px solid #d7e5f6;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }

        .decision-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #1557d6;
        }

        .decision-card.blue {
          background: linear-gradient(90deg, rgba(239, 246, 255, 0.96), rgba(255, 255, 255, 0.96));
        }

        .decision-card.green {
          background: linear-gradient(90deg, rgba(240, 253, 244, 0.96), rgba(255, 255, 255, 0.96));
        }

        .decision-card.purple {
          background: linear-gradient(90deg, rgba(245, 243, 255, 0.96), rgba(255, 255, 255, 0.96));
        }

        .decision-card.amber {
          background: linear-gradient(90deg, rgba(255, 251, 235, 0.96), rgba(255, 255, 255, 0.96));
        }

        .decision-card.cyan {
          background: linear-gradient(90deg, rgba(236, 254, 255, 0.96), rgba(255, 255, 255, 0.96));
        }

        .decision-card.rose {
          background: linear-gradient(90deg, rgba(255, 241, 242, 0.96), rgba(255, 255, 255, 0.96));
        }

        .decision-card.blue::before {
          background: #1557d6;
        }

        .decision-card.green::before {
          background: #16a34a;
        }

        .decision-card.purple::before {
          background: #7c3aed;
        }

        .decision-card.amber::before {
          background: #f59e0b;
        }

        .decision-card.cyan::before {
          background: #06b6d4;
        }

        .decision-card.rose::before {
          background: #e11d48;
        }

        .card-main {
          min-width: 0;
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 8px;
          padding: 10px 0 10px 11px;
        }

        .identity-mark {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1557d6;
          font-size: 13px;
          font-weight: 950;
        }

        .identity-mark.large {
          width: 54px;
          height: 54px;
          font-size: 18px;
        }

        .candidate {
          min-width: 0;
        }

        .candidate-topline {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .candidate h2 {
          min-width: 0;
          margin: 0;
          color: #06194a;
          font-size: 19px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.05em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-badge {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 3px 7px;
          background: #fff7ed;
          color: #ea580c;
          font-size: 8.5px;
          font-weight: 950;
          text-transform: uppercase;
          border: 1px solid #fed7aa;
        }

        .status-badge.approved {
          background: #ecfdf5;
          color: #15803d;
          border-color: #bbf7d0;
        }

        .status-badge.rejected {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }

        .meta-line {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          color: #334155;
          font-size: 10.5px;
          line-height: 1;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
        }

        .meta-line b,
        .meta-line span,
        .meta-line time {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .meta-line i {
          width: 3px;
          height: 3px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: #94a3b8;
        }

        .micro-tags {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 7px;
          overflow: hidden;
        }

        .micro-tags span,
        .micro-tags strong {
          flex: 0 0 auto;
          border: 1px solid #cfe0f5;
          background: #ffffff;
          color: #06194a;
          border-radius: 999px;
          padding: 3px 5px;
          font-size: 8.8px;
          line-height: 1;
          font-weight: 950;
          white-space: nowrap;
        }

        .micro-tags strong.good {
          color: #15803d;
          border-color: #bbf7d0;
          background: #ecfdf5;
        }

        .micro-tags strong.mid {
          color: #ea580c;
          border-color: #fed7aa;
          background: #fff7ed;
        }

        .micro-tags strong.bad {
          color: #dc2626;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .authority-line {
          margin-top: 9px;
          color: #0f1f44;
          font-size: 10px;
          line-height: 1;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .decision-aside {
          border-left: 1px solid rgba(207, 224, 245, 0.78);
          padding: 9px 8px 9px 0;
          display: grid;
          align-content: space-between;
          justify-items: end;
        }

        .lina-chip {
          width: 74px;
          min-height: 42px;
          border-radius: 14px;
          border: 1px solid #d7e5f6;
          background: #f8fbff;
          color: #1557d6;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 1px;
          text-transform: uppercase;
        }

        .lina-chip span {
          font-size: 8.5px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.03em;
        }

        .lina-chip strong {
          font-size: 8.5px;
          line-height: 1;
          font-weight: 950;
        }

        .lina-chip.approve {
          color: #15803d;
          border-color: #bbf7d0;
          background: #ecfdf5;
        }

        .lina-chip.neutral {
          color: #ea580c;
          border-color: #fed7aa;
          background: #fff7ed;
        }

        .lina-chip.review {
          color: #dc2626;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .quick-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .quick-actions button {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          border: 1px solid #dbe7f5;
          background: #ffffff;
          color: #06194a;
          display: grid;
          place-items: center;
        }

        .quick-actions button.approve {
          color: #16a34a;
          border-color: #bbf7d0;
          background: #ecfdf5;
        }

        .quick-actions button.reject {
          color: #dc2626;
          border-color: #fecaca;
          background: #fff7f7;
        }

        button:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 14px;
          background: rgba(15, 23, 42, 0.34);
          backdrop-filter: blur(8px);
        }

        .detail-modal {
          width: min(560px, 100%);
          max-height: calc(100dvh - 28px);
          overflow: auto;
          position: relative;
          border-radius: 24px;
          border: 1px solid #dbe7f5;
          background: #ffffff;
          padding: 18px;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
        }

        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border-radius: 13px;
          border: 1px solid #dbe7f5;
          background: #ffffff;
          color: #06194a;
          display: grid;
          place-items: center;
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-right: 40px;
          margin-bottom: 12px;
        }

        .modal-header h2 {
          margin: 0;
          color: #06194a;
          font-size: 22px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .modal-header p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 850;
        }

        .decision-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-bottom: 10px;
        }

        .decision-panel div,
        .detail-grid,
        .note-box {
          border: 1px solid #dbe7f5;
          border-radius: 17px;
          background: #f8fbff;
        }

        .decision-panel div {
          padding: 12px;
        }

        .decision-panel span,
        .note-box {
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .decision-panel strong {
          display: block;
          margin-top: 5px;
          color: #06194a;
          font-size: 14px;
          font-weight: 950;
        }

        .decision-panel small {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 84px 1fr;
          gap: 8px 10px;
          padding: 12px;
          margin-bottom: 10px;
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
        }

        .detail-grid b {
          min-width: 0;
          color: #06194a;
          overflow-wrap: anywhere;
        }

        .note-box {
          display: grid;
          gap: 9px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .note-box textarea {
          min-height: 98px;
          width: 100%;
          border: 1px solid #dbe7f5;
          border-radius: 15px;
          padding: 12px;
          outline: none;
          resize: vertical;
          color: #06194a;
          font: inherit;
          background: white;
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .secondary-button,
        .primary-button,
        .danger-button {
          min-height: 44px;
          border-radius: 15px;
          border: 1px solid #dbe7f5;
          background: white;
          color: #06194a;
          font-size: 12px;
          font-weight: 950;
        }

        .primary-button {
          background: #1557d6;
          color: white;
          border-color: #1557d6;
        }

        .danger-button {
          background: #fff7f7;
          color: #dc2626;
          border-color: #fecaca;
        }

        @media (min-width: 760px) {
          .approval-page {
            max-width: 720px;
            margin: 0 auto;
            border-left: 1px solid #dbe7f5;
            border-right: 1px solid #dbe7f5;
          }

          .hero-flag {
            height: 122px;
          }

          .quote-card {
            top: 20px;
            left: 170px;
            right: 22px;
            padding: 16px 20px;
          }

          .quote-card p {
            font-size: 16px;
          }

          .quote-card span {
            font-size: 13px;
          }

          .hero-flag::before {
            left: 34px;
            top: 32px;
            width: 58px;
            height: 58px;
          }

          .hero-flag::after {
            left: 92px;
            top: 36px;
            font-size: 34px;
          }

          .decision-card {
            min-height: 106px;
            grid-template-columns: 1fr 112px;
          }

          .quick-actions button {
            width: 34px;
            height: 34px;
          }

          .lina-chip {
            width: 96px;
          }
        }
      `}</style>
    </main>
  );
}
