"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  Eye,
  Menu,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
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
  INVITED: "Davet Edildi",
  REGISTERED: "Kayıt Tamamlandı",
};

const rowThemes = ["blue", "green", "purple", "amber", "cyan", "rose"];

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

function getReferenceText(item: ApplicationItem) {
  if (item.referansliMi || item.basvuruTuru === "REFERANSLI") {
    return item.referansDogrulandiMi ? "Ref. Doğrulandı" : "Referanslı";
  }

  return "Referanssız";
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

function getLegalCount(item: ApplicationItem) {
  return [item.kvkkAccepted, item.privacyAccepted, item.platformAccepted, item.userAgreementAccepted].filter(Boolean)
    .length;
}

function getDecision(item: ApplicationItem) {
  const score = getTrustScore(item);

  if (item.isRisky || score < 55) {
    return {
      label: "İncelenmeli",
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
        (type === "referansli" && (item.referansliMi || item.basvuruTuru === "REFERANSLI")) ||
        (type === "referanssiz" && !item.referansliMi && item.basvuruTuru !== "REFERANSLI") ||
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
    <main className="admin-page">
      <section className="mobile-shell">
        <header className="admin-top">
          <button className="top-button" aria-label="Menü">
            <Menu size={22} />
          </button>

          <div className="top-title">
            <strong>ADMIN</strong>
            <span>Başvuru İnceleme Merkezi</span>
          </div>

          <div className="top-actions">
            <button className="top-button" aria-label="Bildirimler">
              <Bell size={19} />
              <small>3</small>
            </button>
            <button className="top-button" aria-label="Profil">
              <User size={19} />
            </button>
          </div>
        </header>

        <section className="sticky-command">
          <section className="flag-panel">
            <div className="flag-left">
              <span className="moon" />
              <span className="star">★</span>
            </div>

            <div className="quote-card">
              <p>Vatan ne Türkiye'dir Türklere, ne Türkistan.</p>
              <p>Vatan büyük ve müebbet bir ülkedir: Turan.</p>
              <span>— Ziya Gökalp</span>
            </div>
          </section>

          <section className="page-bar">
            <a href="/admin" className="back-link" aria-label="Admin sayfasına dön">
              <ArrowLeft size={22} />
            </a>

            <div>
              <h1>Katılım Talepleri</h1>
              <p>Yüksek yoğunluklu karar ekranı</p>
            </div>

            <button className="refresh-button" onClick={() => loadApplications(status)} aria-label="Yenile">
              <RefreshCcw size={18} />
            </button>
          </section>

          <section className="summary-strip">
            <button className={status === "PENDING" ? "active blue" : "blue"} onClick={() => handleStatusFilter("PENDING")}>
              <span>Bekleyen</span>
              <strong>{summary.pending}</strong>
            </button>
            <button
              className={status === "APPROVED" ? "active green" : "green"}
              onClick={() => handleStatusFilter("APPROVED")}
            >
              <span>Onay</span>
              <strong>{summary.approvedThisMonth}</strong>
            </button>
            <button
              className={status === "REJECTED" ? "active red" : "red"}
              onClick={() => handleStatusFilter("REJECTED")}
            >
              <span>Red</span>
              <strong>{summary.rejectedThisMonth}</strong>
            </button>
            <button className={type === "pilot" ? "active purple" : "purple"} onClick={() => setType(type === "pilot" ? "all" : "pilot")}>
              <span>Pilot</span>
              <strong>{summary.pilotThisMonth}</strong>
            </button>
          </section>
        </section>

        <section className="toolbox">
          <label className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ad, telefon, e-posta..."
            />
          </label>

          <button className="filter-button" type="button" aria-label="Filtre">
            <SlidersHorizontal size={19} />
          </button>

          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">Tüm Türler</option>
            <option value="referansli">Referanslı</option>
            <option value="referanssiz">Referanssız</option>
            <option value="pilot">Pilot</option>
          </select>

          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="all">Tüm Roller</option>
            <option value="EMLAKCI">Emlakçı</option>
            <option value="MUTEAHHIT">Müteahhit</option>
            <option value="INSAAT_FIRMASI">İnşaat Firması</option>
            <option value="MODERATOR">Moderatör</option>
            <option value="ADMIN">Admin</option>
          </select>

          <select value={status} onChange={(event) => handleStatusFilter(event.target.value)}>
            <option value="all">Tüm Durumlar</option>
            <option value="PENDING">Bekliyor</option>
            <option value="APPROVED">Onaylandı</option>
            <option value="REJECTED">Reddedildi</option>
            <option value="INVITED">Davet Edildi</option>
            <option value="REGISTERED">Kayıt Tamamlandı</option>
          </select>
        </section>

        {error ? <div className="error-box">{error}</div> : null}

        {loading ? (
          <div className="empty-state">Katılım talepleri yükleniyor...</div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">Gösterilecek katılım talebi bulunamadı.</div>
        ) : (
          <section className="application-list">
            {filteredItems.map((item, index) => {
              const score = getTrustScore(item);
              const decision = getDecision(item);
              const legalCount = getLegalCount(item);
              const theme = rowThemes[index % rowThemes.length];

              return (
                <article className={`application-card ${theme}`} key={item.id}>
                  <div className="accent" />

                  <div className="row-main">
                    <div className="mini-avatar">{initials(item.applicantName)}</div>

                    <div className="identity">
                      <div className="identity-top">
                        <h2>{item.applicantName}</h2>
                        <span className={`status-pill ${item.status.toLowerCase()}`}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </div>

                      <div className="meta-line">
                        <span>{roleLabels[item.requestedRole] || item.requestedRole}</span>
                        <i />
                        <span>
                          {item.district || "-"} / {item.city || "-"}
                        </span>
                        <i />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>

                      <div className="compact-grid">
                        <span>{getReferenceText(item)}</span>
                        {item.pilotBasvuruMu ? <span>Pilot</span> : <span>Standart</span>}
                        <span>Yasal {legalCount}/4</span>
                        <strong className={score >= 80 ? "good" : score >= 60 ? "mid" : "bad"}>{score}/100</strong>
                      </div>
                    </div>

                    <div className="decision-mini">
                      <span>Lina</span>
                      <strong className={decision.className}>{decision.label}</strong>
                    </div>
                  </div>

                  <div className="row-footer">
                    <p>
                      Yetki: <b>{item.onayYetkiSeviyesi || "ADMIN_SUPER_ADMIN"}</b>
                    </p>

                    <div className="quick-actions">
                      <button onClick={() => openDetail(item)} aria-label="Detay">
                        <Eye size={17} />
                      </button>
                      <button
                        className="approve"
                        disabled={busyId === item.id || item.status !== "PENDING"}
                        onClick={() => handleStatusChange(item.id, "APPROVED")}
                        aria-label="Onayla"
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
                        aria-label="Reddet"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <nav className="bottom-nav">
          <a href="/admin" className="active">
            <span>▦</span>
            Özet
          </a>
          <a href="/admin/users">
            <span>♙</span>
            Üyeler
          </a>
          <a href="/admin/traffic">
            <span>⌁</span>
            Trafik
          </a>
          <a href="/admin/radar">
            <span>◎</span>
            Radar
          </a>
          <a href="/admin/system-messages">
            <span>☷</span>
            Mesaj
          </a>
        </nav>
      </section>

      {selected ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="detail-modal">
            <button className="modal-close" onClick={() => setSelected(null)}>
              <X size={18} />
            </button>

            <div className="modal-header">
              <div className="modal-avatar">{initials(selected.applicantName)}</div>
              <div>
                <h2>{selected.applicantName}</h2>
                <p>{selected.applicantEmail}</p>
                <p>{selected.applicantPhone}</p>
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
              <div>
                <span>Rol / Konum</span>
                <strong>{roleLabels[selected.requestedRole] || selected.requestedRole}</strong>
                <small>
                  {selected.district || "-"} / {selected.city || "-"}
                </small>
              </div>
              <div>
                <span>Onay Yetkisi</span>
                <strong>{selected.onayYetkiSeviyesi || "ADMIN_SUPER_ADMIN"}</strong>
                <small>{getReferenceText(selected)}</small>
              </div>
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
        .admin-page {
          min-height: 100dvh;
          background:
            radial-gradient(circle at top left, rgba(219, 234, 254, 0.8), transparent 32%),
            linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
          color: #071332;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .mobile-shell {
          width: min(100%, 860px);
          min-height: 100dvh;
          margin: 0 auto;
          background: rgba(248, 251, 255, 0.98);
          box-shadow: 0 0 45px rgba(15, 23, 42, 0.08);
        }

        .admin-top {
          height: 76px;
          padding: 0 14px;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #dbe5f1;
          display: grid;
          grid-template-columns: 46px 1fr auto;
          align-items: center;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(18px);
        }

        .top-title {
          display: grid;
          justify-items: center;
          gap: 2px;
          min-width: 0;
        }

        .top-title strong {
          color: #071332;
          font-size: 21px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.04em;
        }

        .top-title span {
          color: #64748b;
          font-size: 10px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .top-actions {
          display: flex;
          gap: 8px;
        }

        .top-button {
          width: 44px;
          height: 44px;
          border-radius: 15px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #071332;
          display: grid;
          place-items: center;
          position: relative;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
        }

        .top-button small {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #ef1235;
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 950;
          border: 2px solid #ffffff;
        }

        .sticky-command {
          position: sticky;
          top: 76px;
          z-index: 45;
          background: rgba(248, 251, 255, 0.96);
          border-bottom: 1px solid rgba(219, 229, 241, 0.9);
          backdrop-filter: blur(18px);
        }

        .flag-panel {
          height: 92px;
          display: grid;
          grid-template-columns: 116px 1fr;
          align-items: center;
          overflow: hidden;
          background:
            linear-gradient(90deg, rgba(213, 25, 38, 0.96) 0%, rgba(213, 25, 38, 0.78) 31%, rgba(255, 255, 255, 0.92) 59%, #ffffff 100%),
            radial-gradient(circle at 83% 76%, rgba(15, 23, 42, 0.12), transparent 34%);
          box-shadow: inset 0 -1px 0 rgba(15, 23, 42, 0.08);
        }

        .flag-left {
          height: 92px;
          position: relative;
        }

        .moon {
          position: absolute;
          width: 44px;
          height: 44px;
          left: 20px;
          top: 24px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 12px 0 0 #d51926;
        }

        .star {
          position: absolute;
          left: 72px;
          top: 31px;
          color: #ffffff;
          font-size: 24px;
          line-height: 1;
          text-shadow: 0 4px 12px rgba(127, 29, 29, 0.3);
        }

        .quote-card {
          margin-right: 12px;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(241, 245, 249, 0.58);
          color: #0f1f44;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.46);
        }

        .quote-card p {
          margin: 0 0 3px;
          font-size: 11.5px;
          line-height: 1.25;
          font-weight: 900;
        }

        .quote-card span {
          display: block;
          margin-top: 2px;
          text-align: right;
          color: #334155;
          font-size: 10px;
          font-weight: 850;
          font-style: italic;
        }

        .page-bar {
          min-height: 56px;
          padding: 8px 14px;
          display: grid;
          grid-template-columns: 30px 1fr 40px;
          align-items: center;
          gap: 9px;
        }

        .back-link {
          color: #071332;
          display: grid;
          place-items: center;
          text-decoration: none;
        }

        .page-bar h1 {
          margin: 0;
          color: #071332;
          font-size: 24px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.045em;
          text-align: center;
        }

        .page-bar p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 10.5px;
          line-height: 1;
          font-weight: 850;
          text-align: center;
        }

        .refresh-button {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: 1px solid #dbe5f1;
          background: #ffffff;
          color: #071332;
          display: grid;
          place-items: center;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
        }

        .summary-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
          padding: 0 14px 10px;
        }

        .summary-strip button {
          min-height: 48px;
          border: 1px solid #dbe5f1;
          background: #ffffff;
          border-radius: 15px;
          padding: 6px 6px;
          display: grid;
          place-items: center;
          gap: 2px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
        }

        .summary-strip span {
          color: #475569;
          font-size: 9.5px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
        }

        .summary-strip strong {
          color: #1557d6;
          font-size: 20px;
          line-height: 1;
          font-weight: 950;
        }

        .summary-strip .active {
          border-width: 2px;
          transform: translateY(-1px);
        }

        .summary-strip .green strong {
          color: #16a34a;
        }

        .summary-strip .red strong {
          color: #e11d48;
        }

        .summary-strip .purple strong {
          color: #7c3aed;
        }

        .toolbox {
          padding: 12px 14px 9px;
          display: grid;
          grid-template-columns: 1fr 46px;
          gap: 8px;
        }

        .search-box,
        .filter-button,
        .toolbox select {
          min-height: 44px;
          border-radius: 14px;
          border: 1px solid #dbe5f1;
          background: #ffffff;
          color: #071332;
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
          color: #071332;
          font-size: 14px;
          font-weight: 800;
        }

        .search-box input::placeholder {
          color: #94a3b8;
        }

        .filter-button {
          display: grid;
          place-items: center;
        }

        .toolbox select {
          grid-column: span 1;
          padding: 0 10px;
          font-size: 12.5px;
          font-weight: 900;
        }

        .error-box,
        .empty-state {
          margin: 0 14px 10px;
          border-radius: 16px;
          padding: 13px;
          text-align: center;
          font-weight: 900;
          font-size: 13px;
          border: 1px solid #dbe5f1;
          background: #ffffff;
          color: #334155;
        }

        .error-box {
          color: #b91c1c;
          background: #fff7f7;
          border-color: #fecaca;
        }

        .application-list {
          display: grid;
          gap: 8px;
          padding: 0 14px 92px;
        }

        .application-card {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid #dbe5f1;
          background: #ffffff;
          padding: 10px 10px 9px 14px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.058);
        }

        .application-card .accent {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 4px;
          background: #1557d6;
        }

        .application-card.green .accent {
          background: #16a34a;
        }

        .application-card.purple .accent {
          background: #7c3aed;
        }

        .application-card.amber .accent {
          background: #f59e0b;
        }

        .application-card.cyan .accent {
          background: #06b6d4;
        }

        .application-card.rose .accent {
          background: #e11d48;
        }

        .application-card.blue {
          background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
        }

        .application-card.green {
          background: linear-gradient(135deg, #ffffff 0%, #f7fef9 100%);
        }

        .application-card.purple {
          background: linear-gradient(135deg, #ffffff 0%, #fbf8ff 100%);
        }

        .application-card.amber {
          background: linear-gradient(135deg, #ffffff 0%, #fffaf2 100%);
        }

        .application-card.cyan {
          background: linear-gradient(135deg, #ffffff 0%, #f2fdff 100%);
        }

        .application-card.rose {
          background: linear-gradient(135deg, #ffffff 0%, #fff7f9 100%);
        }

        .row-main {
          display: grid;
          grid-template-columns: 38px 1fr 82px;
          gap: 9px;
          align-items: start;
        }

        .mini-avatar,
        .modal-avatar {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1557d6;
          border: 1px solid #bfdbfe;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 950;
        }

        .identity {
          min-width: 0;
        }

        .identity-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          min-width: 0;
        }

        .identity h2 {
          margin: 0;
          color: #071332;
          font-size: 15.5px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.025em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-pill {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 4px 7px;
          background: #fef3c7;
          color: #b45309;
          font-size: 9.5px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .status-pill.approved {
          background: #dcfce7;
          color: #15803d;
        }

        .status-pill.rejected {
          background: #fee2e2;
          color: #b91c1c;
        }

        .meta-line {
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          color: #475569;
          font-size: 11px;
          line-height: 1;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
        }

        .meta-line span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .meta-line i {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: #cbd5e1;
          flex: 0 0 auto;
        }

        .compact-grid {
          margin-top: 7px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 5px;
        }

        .compact-grid span,
        .compact-grid strong {
          min-height: 24px;
          border-radius: 9px;
          border: 1px solid rgba(219, 229, 241, 0.95);
          background: rgba(255, 255, 255, 0.8);
          color: #334155;
          display: grid;
          place-items: center;
          padding: 0 4px;
          font-size: 9.5px;
          line-height: 1;
          font-weight: 950;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .compact-grid strong.good {
          color: #15803d;
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .compact-grid strong.mid {
          color: #ea580c;
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .compact-grid strong.bad {
          color: #dc2626;
          background: #fff7f7;
          border-color: #fecaca;
        }

        .decision-mini {
          min-height: 55px;
          border-radius: 14px;
          border: 1px solid #dbeafe;
          background: rgba(248, 251, 255, 0.82);
          display: grid;
          align-content: center;
          justify-items: center;
          gap: 4px;
          padding: 6px;
        }

        .decision-mini span {
          color: #64748b;
          font-size: 9px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
        }

        .decision-mini strong {
          max-width: 100%;
          border-radius: 999px;
          padding: 5px 7px;
          font-size: 9.5px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .decision-mini strong.approve {
          background: #dcfce7;
          color: #15803d;
        }

        .decision-mini strong.neutral {
          background: #ffedd5;
          color: #ea580c;
        }

        .decision-mini strong.review {
          background: #fee2e2;
          color: #b91c1c;
        }

        .row-footer {
          margin-top: 8px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 8px;
        }

        .row-footer p {
          margin: 0;
          color: #475569;
          font-size: 10.5px;
          line-height: 1.15;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .row-footer b {
          color: #071332;
        }

        .quick-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .quick-actions button {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid #dbe5f1;
          background: #ffffff;
          color: #071332;
          display: grid;
          place-items: center;
        }

        .quick-actions button.approve {
          background: #ecfdf5;
          color: #16a34a;
          border-color: #bbf7d0;
        }

        .quick-actions button.reject {
          background: #fff7f7;
          color: #dc2626;
          border-color: #fecaca;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.44;
          cursor: not-allowed;
        }

        .bottom-nav {
          position: fixed;
          left: 50%;
          bottom: 10px;
          width: min(calc(100% - 28px), 832px);
          transform: translateX(-50%);
          min-height: 62px;
          border-radius: 22px;
          border: 1px solid #dbe5f1;
          background: rgba(255, 255, 255, 0.95);
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          padding: 7px 8px;
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(18px);
          z-index: 60;
        }

        .bottom-nav a {
          color: #64748b;
          text-decoration: none;
          display: grid;
          place-items: center;
          gap: 2px;
          font-size: 10.5px;
          font-weight: 900;
        }

        .bottom-nav a span {
          font-size: 20px;
          line-height: 1;
        }

        .bottom-nav a.active {
          color: #1557d6;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.42);
          display: grid;
          place-items: center;
          padding: 14px;
          z-index: 100;
        }

        .detail-modal {
          width: min(650px, 100%);
          max-height: calc(100dvh - 28px);
          overflow: auto;
          background: white;
          border-radius: 24px;
          border: 1px solid #dbe5f1;
          padding: 18px;
          position: relative;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
        }

        .modal-close {
          position: absolute;
          top: 13px;
          right: 13px;
          width: 38px;
          height: 38px;
          border-radius: 13px;
          border: 1px solid #dbe5f1;
          background: #ffffff;
          color: #071332;
          display: grid;
          place-items: center;
        }

        .modal-header {
          display: grid;
          grid-template-columns: 48px 1fr;
          align-items: center;
          gap: 12px;
          padding-right: 46px;
          margin-bottom: 14px;
        }

        .modal-avatar {
          width: 48px;
          height: 48px;
          font-size: 16px;
        }

        .modal-header h2 {
          margin: 0;
          color: #071332;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.025em;
        }

        .modal-header p {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
        }

        .decision-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }

        .decision-panel div,
        .note-box {
          border: 1px solid #dbe5f1;
          border-radius: 16px;
          padding: 12px;
          background: #f8fbff;
        }

        .decision-panel span,
        .note-box {
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .decision-panel strong {
          display: block;
          margin-top: 5px;
          color: #071332;
          font-size: 13px;
          font-weight: 950;
        }

        .decision-panel small {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.25;
          font-weight: 750;
        }

        .note-box {
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
        }

        .note-box textarea {
          min-height: 100px;
          width: 100%;
          border: 1px solid #dbe5f1;
          border-radius: 14px;
          padding: 11px;
          outline: none;
          resize: vertical;
          color: #071332;
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
          min-height: 46px;
          border-radius: 15px;
          border: 1px solid #dbe5f1;
          background: white;
          color: #071332;
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

        @media (min-width: 861px) {
          .mobile-shell {
            margin-top: 0;
          }

          .admin-top {
            height: 82px;
          }

          .sticky-command {
            top: 82px;
          }

          .flag-panel {
            height: 110px;
            grid-template-columns: 170px 1fr;
          }

          .flag-left {
            height: 110px;
          }

          .moon {
            width: 56px;
            height: 56px;
            left: 34px;
            top: 27px;
            box-shadow: 16px 0 0 #d51926;
          }

          .star {
            left: 102px;
            top: 37px;
            font-size: 31px;
          }

          .quote-card p {
            font-size: 16px;
          }

          .quote-card span {
            font-size: 13px;
          }

          .page-bar h1 {
            font-size: 28px;
          }

          .summary-strip button {
            min-height: 54px;
          }

          .application-list {
            grid-template-columns: 1fr 1fr;
          }

          .application-card {
            min-height: 132px;
          }
        }

        @media (max-width: 380px) {
          .row-main {
            grid-template-columns: 34px 1fr 74px;
            gap: 7px;
          }

          .mini-avatar {
            width: 34px;
            height: 34px;
            font-size: 12px;
          }

          .identity h2 {
            font-size: 14px;
          }

          .compact-grid {
            grid-template-columns: 1fr 1fr;
          }

          .decision-mini {
            min-height: 50px;
          }

          .quick-actions button {
            width: 31px;
            height: 31px;
          }

          .quote-card p {
            font-size: 10.5px;
          }
        }
      `}</style>
    </main>
  );
}
