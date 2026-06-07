"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  Eye,
  Filter,
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

const cardThemes = ["theme-blue", "theme-green", "theme-purple", "theme-amber", "theme-cyan", "theme-rose"];

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function getTypeBadges(item: ApplicationItem) {
  const badges: string[] = [];

  if (item.referansliMi || item.basvuruTuru === "REFERANSLI") {
    badges.push("Referanslı");
  } else {
    badges.push("Referanssız");
  }

  if (item.pilotBasvuruMu) {
    badges.push("Pilot");
  }

  return badges;
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

function getLegalText(item: ApplicationItem) {
  const accepted = [
    item.kvkkAccepted,
    item.privacyAccepted,
    item.platformAccepted,
    item.userAgreementAccepted,
  ].filter(Boolean).length;

  return `Yasal Onay ${accepted}/4`;
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
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">EPH</div>
          <div>
            <strong>EPH</strong>
            <span>Emlak Portföy Havuzu</span>
          </div>
        </div>

        <nav className="side-nav">
          <p>Kontrol Merkezi</p>
          <a href="/admin">Dashboard</a>
          <a className="active" href="/admin/katilim-talepleri">
            Katılım Talepleri <small>{summary.pending}</small>
          </a>
          <a href="/admin/ref-kodlari">Ref Kodları</a>
          <a href="/admin/users">Kullanıcılar</a>
          <a href="/admin/roles">Roller & Yetkiler</a>
          <a href="/admin/invitations">Davet Yönetimi</a>
        </nav>

        <div className="admin-card">
          <div className="avatar">ME</div>
          <div>
            <strong>Mustafa Ertuğ Kaya</strong>
            <span>Süper Admin</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <button className="top-icon" aria-label="Menü">
            <Menu size={22} />
          </button>

          <strong>ADMIN</strong>

          <div className="top-actions">
            <button className="top-icon" aria-label="Bildirimler">
              <Bell size={20} />
              <small>3</small>
            </button>
            <button className="top-icon" aria-label="Profil">
              <User size={20} />
            </button>
          </div>
        </header>

        <section className="flag-banner">
          <div className="flag-symbol">★</div>
          <div className="quote">
            <p>Vatan ne Türkiye'dir Türklere, ne Türkistan.</p>
            <p>Vatan büyük ve müebbet bir ülkedir: Turan.</p>
            <span>- Ziya Gökalp</span>
          </div>
        </section>

        <section className="page-head">
          <a href="/admin" className="back-link">
            <ArrowLeft size={22} />
          </a>

          <h1>Katılım Talepleri</h1>

          <div className="head-actions">
            <button>
              <Filter size={19} />
              <span>Filtre</span>
            </button>
            <button onClick={() => loadApplications(status)}>
              <RefreshCcw size={19} />
            </button>
          </div>
        </section>

        <section className="summary-grid">
          <article className="summary-card blue">
            <div className="summary-icon">⌛</div>
            <span>Bekleyen</span>
            <strong>{summary.pending}</strong>
            <i />
          </article>

          <article className="summary-card green">
            <div className="summary-icon">✓</div>
            <span>Onaylanan</span>
            <strong>{summary.approvedThisMonth}</strong>
            <i />
          </article>

          <article className="summary-card red">
            <div className="summary-icon">×</div>
            <span>Reddedilen</span>
            <strong>{summary.rejectedThisMonth}</strong>
            <i />
          </article>

          <article className="summary-card purple">
            <div className="summary-icon">👥</div>
            <span>Pilot</span>
            <strong>{summary.pilotThisMonth}</strong>
            <i />
          </article>
        </section>

        <section className="filters">
          <label className="search-box">
            <Search size={22} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ara: ad, telefon, e-posta..."
            />
          </label>

          <button className="filter-square" type="button">
            <SlidersHorizontal size={22} />
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

              return (
                <article className={`application-card ${cardThemes[index % cardThemes.length]}`} key={item.id}>
                  <div className="card-top">
                    <div className="avatar soft">{initials(item.applicantName)}</div>

                    <div className="person-info">
                      <h2>{item.applicantName}</h2>
                      <p>
                        {item.applicantEmail}
                        <span>|</span>
                        {item.applicantPhone}
                      </p>
                      <p>
                        🧰 {roleLabels[item.requestedRole] || item.requestedRole}
                        <span>|</span>
                        📍 {item.district || "Pamukkale"} / {item.city || "Denizli"}
                      </p>
                    </div>

                    <div className="status-block">
                      <span className={`status-pill ${item.status.toLowerCase()}`}>
                        {statusLabels[item.status] || item.status}
                      </span>
                      <small>{formatDate(item.createdAt)}</small>
                    </div>
                  </div>

                  <div className="decision-row">
                    <span className="info-pill blue-pill">
                      <User size={17} />
                      {getTypeBadges(item)[0]}
                    </span>

                    <span className={`info-pill ${item.referansDogrulandiMi ? "green-pill" : "red-pill"}`}>
                      <ShieldCheck size={17} />
                      {item.referansDogrulandiMi ? "Ref. Doğrulandı" : item.referansliMi ? "Ref. Bekliyor" : "Ref. Yok"}
                    </span>

                    <span className="info-pill green-pill">
                      <ShieldCheck size={17} />
                      {getLegalText(item)}
                    </span>

                    <span className={`trust-box ${score >= 80 ? "good" : score >= 60 ? "mid" : "bad"}`}>
                      <small>Güven Skoru</small>
                      <strong>{score}<b>/100</b></strong>
                    </span>
                  </div>

                  <div className="lina-row">
                    <span>✦ Lina Ön Değerlendirme</span>
                    <strong className={decision.className}>{decision.label}</strong>
                  </div>

                  <div className="card-bottom">
                    <p>
                      Evet Onay Yetkisi: <b>{item.onayYetkiSeviyesi || "ADMIN_SUPER_ADMIN"}</b>
                      <br />
                      İlçe: <b>{item.district || "Pamukkale"}</b>
                    </p>

                    <div className="card-actions">
                      <button onClick={() => openDetail(item)}>
                        <Eye size={19} />
                      </button>
                      <button
                        className="approve"
                        disabled={busyId === item.id || item.status !== "PENDING"}
                        onClick={() => handleStatusChange(item.id, "APPROVED")}
                      >
                        <Check size={21} />
                      </button>
                      <button
                        className="reject"
                        disabled={busyId === item.id || item.status !== "PENDING"}
                        onClick={() => {
                          setSelected(item);
                          setNote(item.adminNote || "");
                        }}
                      >
                        <X size={21} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>

      {selected ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="detail-modal">
            <button className="modal-close" onClick={() => setSelected(null)}>
              <X size={18} />
            </button>

            <div className="modal-header">
              <div className="avatar soft large">{initials(selected.applicantName)}</div>
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
          min-height: 100vh;
          background: #f8fafc;
          color: #071332;
          display: flex;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .sidebar {
          width: 280px;
          min-height: 100vh;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          padding: 24px 18px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: sticky;
          top: 0;
        }

        .brand,
        .admin-card {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-mark {
          width: 48px;
          height: 48px;
          border-radius: 18px;
          background: #eff6ff;
          color: #2563eb;
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .brand strong,
        .admin-card strong {
          display: block;
          font-size: 16px;
          font-weight: 900;
        }

        .brand span,
        .admin-card span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-top: 2px;
        }

        .side-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .side-nav p {
          margin: 16px 8px 6px;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
        }

        .side-nav a {
          min-height: 44px;
          border-radius: 16px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #475569;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
        }

        .side-nav a.active,
        .side-nav a:hover {
          background: #eff6ff;
          color: #2563eb;
        }

        .side-nav small {
          background: #2563eb;
          color: white;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
        }

        .admin-card {
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 14px;
        }

        .content {
          width: 100%;
          min-width: 0;
          padding-bottom: 40px;
        }

        .topbar {
          height: 96px;
          padding: 0 34px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .topbar > strong {
          color: #071332;
          font-size: 28px;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .top-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #071332;
          display: grid;
          place-items: center;
          position: relative;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        }

        .top-icon small {
          position: absolute;
          top: -7px;
          right: -7px;
          min-width: 22px;
          height: 22px;
          border-radius: 999px;
          background: #ef1235;
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 950;
        }

        .flag-banner {
          height: 150px;
          background:
            linear-gradient(90deg, rgba(220, 38, 38, 0.92) 0%, rgba(220, 38, 38, 0.72) 22%, rgba(255, 255, 255, 0.92) 48%, rgba(255, 255, 255, 1) 100%),
            radial-gradient(circle at 80% 70%, rgba(15, 23, 42, 0.12), transparent 34%);
          border-bottom: 1px solid #e2e8f0;
          display: grid;
          grid-template-columns: 240px 1fr;
          align-items: center;
          padding: 0 48px;
          overflow: hidden;
          position: relative;
        }

        .flag-symbol {
          width: 128px;
          height: 128px;
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 84px;
          text-shadow: 0 8px 18px rgba(127, 29, 29, 0.22);
        }

        .quote {
          color: #0f1f44;
          font-weight: 800;
          text-align: left;
        }

        .quote p {
          margin: 0 0 8px;
          font-size: 21px;
          line-height: 1.28;
        }

        .quote span {
          display: block;
          margin-top: 4px;
          font-size: 18px;
          font-family: cursive;
          opacity: 0.74;
          text-align: right;
        }

        .page-head {
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: center;
          gap: 16px;
          padding: 30px 34px 22px;
        }

        .back-link {
          color: #071332;
          display: grid;
          place-items: center;
        }

        .page-head h1 {
          margin: 0;
          color: #071332;
          font-size: 38px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .head-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .head-actions button {
          min-width: 72px;
          height: 56px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #071332;
          border-radius: 18px;
          font-size: 17px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.055);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          padding: 0 34px 22px;
        }

        .summary-card {
          min-height: 92px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 13px 16px 12px;
          display: grid;
          grid-template-columns: 40px 1fr;
          grid-template-rows: auto auto 4px;
          align-items: center;
          column-gap: 10px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
        }

        .summary-icon {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-weight: 950;
          grid-row: 1 / span 2;
          font-size: 20px;
        }

        .summary-card span {
          color: #0f1f44;
          font-size: 13px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
        }

        .summary-card strong {
          color: #2563eb;
          font-size: 28px;
          line-height: 1;
          font-weight: 950;
          margin-top: 4px;
        }

        .summary-card i {
          grid-column: 1 / -1;
          height: 3px;
          border-radius: 999px;
          background: #2563eb;
          margin-top: 9px;
        }

        .summary-card.blue .summary-icon {
          background: #eff6ff;
          color: #2563eb;
        }

        .summary-card.green .summary-icon {
          background: #ecfdf5;
          color: #16a34a;
        }

        .summary-card.green strong {
          color: #16a34a;
        }

        .summary-card.green i {
          background: #16a34a;
        }

        .summary-card.red .summary-icon {
          background: #fff1f2;
          color: #e11d48;
        }

        .summary-card.red strong {
          color: #e11d48;
        }

        .summary-card.red i {
          background: #e11d48;
        }

        .summary-card.purple .summary-icon {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .summary-card.purple strong {
          color: #7c3aed;
        }

        .summary-card.purple i {
          background: #7c3aed;
        }

        .filters {
          padding: 0 34px 26px;
          display: grid;
          grid-template-columns: 1fr 74px;
          gap: 14px;
        }

        .search-box,
        .filter-square,
        .filters select {
          min-height: 58px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #071332;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 18px;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 19px;
          color: #071332;
          font-weight: 750;
        }

        .filter-square {
          display: grid;
          place-items: center;
        }

        .filters select {
          padding: 0 18px;
          font-size: 17px;
          font-weight: 900;
        }

        .error-box,
        .empty-state {
          margin: 0 34px 18px;
          border-radius: 20px;
          padding: 16px;
          text-align: center;
          font-weight: 900;
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .application-list {
          display: grid;
          gap: 20px;
          padding: 0 34px 100px;
        }

        .application-card {
          position: relative;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 26px;
          padding: 24px;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.075);
        }

        .application-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: #2563eb;
        }

        .theme-blue::before {
          background: #2563eb;
        }

        .theme-green::before {
          background: #16a34a;
        }

        .theme-purple::before {
          background: #7c3aed;
        }

        .theme-amber::before {
          background: #f59e0b;
        }

        .theme-cyan::before {
          background: #06b6d4;
        }

        .theme-rose::before {
          background: #e11d48;
        }

        .card-top {
          display: grid;
          grid-template-columns: 64px 1fr auto;
          gap: 16px;
          align-items: start;
        }

        .avatar {
          width: 52px;
          height: 52px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #0f172a;
          color: white;
          font-weight: 950;
          font-size: 18px;
        }

        .avatar.soft {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }

        .avatar.large {
          width: 64px;
          height: 64px;
        }

        .person-info h2 {
          margin: 0 0 6px;
          color: #071332;
          font-size: 24px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .person-info p {
          margin: 0 0 7px;
          color: #334155;
          font-size: 14px;
          font-weight: 850;
        }

        .person-info span {
          margin: 0 12px;
          color: #cbd5e1;
        }

        .status-block {
          display: grid;
          justify-items: end;
          gap: 9px;
        }

        .status-block small {
          color: #475569;
          font-size: 14px;
          font-weight: 850;
          white-space: nowrap;
        }

        .status-pill {
          width: fit-content;
          border-radius: 999px;
          padding: 9px 18px;
          background: #fef3c7;
          color: #b45309;
          font-size: 13px;
          font-weight: 950;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .decision-row {
          margin-top: 22px;
          display: grid;
          grid-template-columns: 1fr 1.22fr 1.25fr 1.1fr;
          gap: 14px;
          align-items: center;
        }

        .info-pill,
        .trust-box {
          min-height: 52px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.78);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #0f1f44;
          font-size: 14px;
          font-weight: 950;
          white-space: nowrap;
        }

        .blue-pill {
          color: #2563eb;
          border-color: #bfdbfe;
          background: #f8fbff;
        }

        .green-pill {
          color: #15803d;
          border-color: #bbf7d0;
          background: #f7fef9;
        }

        .red-pill {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .trust-box {
          display: grid;
          grid-template-columns: 34px 1fr;
          column-gap: 7px;
          justify-content: start;
          padding: 0 12px;
          color: #15803d;
        }

        .trust-box::before {
          content: "盾";
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          font-size: 20px;
        }

        .trust-box small {
          color: #475569;
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 950;
          display: block;
        }

        .trust-box strong {
          display: block;
          color: #16a34a;
          font-size: 23px;
          line-height: 1;
          font-weight: 950;
        }

        .trust-box b {
          font-size: 13px;
          color: #334155;
        }

        .trust-box.mid {
          color: #ea580c;
        }

        .trust-box.mid strong {
          color: #ea580c;
        }

        .trust-box.bad,
        .trust-box.bad strong {
          color: #dc2626;
        }

        .lina-row {
          margin-top: 18px;
          width: min(470px, 100%);
          min-height: 50px;
          border-radius: 14px;
          border: 1px solid #dbeafe;
          background: #f8fbff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 0 18px;
          color: #0f1f44;
          font-size: 15px;
          font-weight: 950;
        }

        .lina-row strong {
          border-radius: 999px;
          padding: 9px 18px;
          font-size: 14px;
          text-transform: uppercase;
        }

        .lina-row strong.approve {
          background: #dcfce7;
          color: #15803d;
        }

        .lina-row strong.neutral {
          background: #ffedd5;
          color: #ea580c;
        }

        .lina-row strong.review {
          background: #fee2e2;
          color: #b91c1c;
        }

        .card-bottom {
          margin-top: 16px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 18px;
        }

        .card-bottom p {
          margin: 0;
          color: #334155;
          font-size: 15px;
          font-weight: 850;
          line-height: 1.45;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .card-actions button {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #071332;
          display: grid;
          place-items: center;
        }

        .card-actions button.approve {
          background: #ecfdf5;
          color: #16a34a;
          border-color: #bbf7d0;
        }

        .card-actions button.reject {
          background: #fff7f7;
          color: #dc2626;
          border-color: #fecaca;
        }

        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.32);
          display: grid;
          place-items: center;
          padding: 18px;
          z-index: 100;
        }

        .detail-modal {
          width: min(680px, 100%);
          max-height: calc(100vh - 36px);
          overflow: auto;
          background: white;
          border-radius: 28px;
          border: 1px solid #e2e8f0;
          padding: 22px;
          position: relative;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #071332;
          display: grid;
          place-items: center;
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-right: 46px;
          margin-bottom: 14px;
        }

        .modal-header h2 {
          margin: 0;
          color: #071332;
          font-size: 22px;
          font-weight: 950;
        }

        .modal-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-weight: 800;
        }

        .decision-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .decision-panel div,
        .note-box {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 14px;
          background: #f8fafc;
        }

        .decision-panel span,
        .note-box {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .decision-panel strong {
          display: block;
          margin-top: 6px;
          color: #071332;
          font-size: 14px;
          font-weight: 900;
        }

        .decision-panel small {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-weight: 750;
        }

        .note-box {
          display: grid;
          gap: 10px;
          margin-bottom: 16px;
        }

        .note-box textarea {
          min-height: 110px;
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 12px;
          outline: none;
          resize: vertical;
          color: #071332;
          font: inherit;
          background: white;
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        .secondary-button,
        .primary-button,
        .danger-button {
          min-height: 48px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #071332;
          font-weight: 900;
        }

        .primary-button {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .danger-button {
          background: #fff7f7;
          color: #dc2626;
          border-color: #fecaca;
        }

        @media (max-width: 760px) {
          .admin-page {
            display: block;
            min-height: 100dvh;
          }

          .sidebar {
            display: none;
          }

          .topbar {
            height: 78px;
            padding: 0 18px;
          }

          .topbar > strong {
            font-size: 22px;
          }

          .top-icon {
            width: 52px;
            height: 52px;
            border-radius: 17px;
          }

          .flag-banner {
            height: 112px;
            grid-template-columns: 118px 1fr;
            padding: 0 16px;
            background:
              linear-gradient(90deg, rgba(220, 38, 38, 0.95) 0%, rgba(220, 38, 38, 0.68) 30%, rgba(255, 255, 255, 0.92) 58%, rgba(255, 255, 255, 1) 100%),
              radial-gradient(circle at 82% 80%, rgba(15, 23, 42, 0.13), transparent 38%);
          }

          .flag-symbol {
            width: 92px;
            height: 92px;
            font-size: 60px;
          }

          .quote p {
            font-size: 13px;
            line-height: 1.35;
            margin-bottom: 4px;
          }

          .quote span {
            font-size: 12px;
          }

          .page-head {
            grid-template-columns: 28px 1fr auto;
            gap: 9px;
            padding: 20px 18px 14px;
          }

          .page-head h1 {
            font-size: 30px;
          }

          .head-actions {
            gap: 9px;
          }

          .head-actions button {
            min-width: 48px;
            height: 48px;
            border-radius: 16px;
            font-size: 0;
          }

          .head-actions button span {
            display: none;
          }

          .summary-grid {
            gap: 8px;
            padding: 0 18px 14px;
          }

          .summary-card {
            min-height: 64px;
            border-radius: 16px;
            padding: 8px 8px 7px;
            grid-template-columns: 25px 1fr;
            column-gap: 6px;
          }

          .summary-icon {
            width: 25px;
            height: 25px;
            font-size: 14px;
          }

          .summary-card span {
            font-size: 9.5px;
            line-height: 1;
          }

          .summary-card strong {
            font-size: 20px;
          }

          .summary-card i {
            margin-top: 5px;
          }

          .filters {
            padding: 0 18px 18px;
            grid-template-columns: 1fr 58px;
            gap: 10px;
          }

          .search-box,
          .filter-square,
          .filters select {
            min-height: 54px;
            border-radius: 17px;
          }

          .search-box input {
            font-size: 17px;
          }

          .filters select {
            font-size: 15px;
          }

          .application-list {
            gap: 16px;
            padding: 0 18px 96px;
          }

          .application-card {
            border-radius: 24px;
            padding: 20px;
          }

          .card-top {
            grid-template-columns: 55px 1fr auto;
            gap: 12px;
          }

          .avatar {
            width: 48px;
            height: 48px;
            font-size: 17px;
          }

          .person-info h2 {
            font-size: 22px;
          }

          .person-info p {
            font-size: 13px;
            line-height: 1.35;
          }

          .status-block small {
            font-size: 13px;
          }

          .status-pill {
            padding: 8px 15px;
            font-size: 12px;
          }

          .decision-row {
            margin-top: 18px;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .info-pill,
          .trust-box {
            min-height: 48px;
            font-size: 13px;
          }

          .trust-box {
            grid-column: span 1;
          }

          .lina-row {
            margin-top: 14px;
            min-height: 48px;
            font-size: 14px;
            padding: 0 13px;
          }

          .lina-row strong {
            font-size: 12px;
            padding: 8px 12px;
          }

          .card-bottom {
            margin-top: 14px;
          }

          .card-bottom p {
            font-size: 13px;
          }

          .card-actions button {
            width: 54px;
            height: 54px;
          }
        }
      `}</style>
    </main>
  );
}