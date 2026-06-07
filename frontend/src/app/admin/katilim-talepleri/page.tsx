"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  Eye,
  Menu,
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
  INVITED: "Davet Edildi",
  REGISTERED: "Kayıt Tamamlandı",
};

const laneClasses = ["lane-blue", "lane-green", "lane-violet", "lane-orange", "lane-cyan", "lane-slate"];

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

function shortName(name: string) {
  const clean = name.trim();
  if (clean.length <= 20) return clean;
  return `${clean.slice(0, 20)}...`;
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
      longLabel: "İncelenmeli",
      className: "review",
      text: "Eksik veya riskli bilgi var.",
    };
  }

  if (score >= 80 && (item.referansliMi || item.referansDogrulandiMi)) {
    return {
      label: "Onay",
      longLabel: "Onaylanabilir",
      className: "approve",
      text: "Bilgiler güçlü görünüyor.",
    };
  }

  return {
    label: "Kontrol",
    longLabel: "Kontrol Et",
    className: "neutral",
    text: "Manuel kontrol önerilir.",
  };
}

function getLegalCount(item: ApplicationItem) {
  return [item.kvkkAccepted, item.privacyAccepted, item.platformAccepted, item.userAgreementAccepted].filter(Boolean).length;
}

function getRefText(item: ApplicationItem) {
  if (item.referansliMi || item.basvuruTuru === "REFERANSLI") return "Referanslı";
  return "Refsiz";
}

function statusClass(status: ApplicationStatus) {
  if (status === "APPROVED" || status === "REGISTERED") return "ok";
  if (status === "REJECTED") return "bad";
  return "wait";
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

  const priorityItem = useMemo(() => {
    return [...filteredItems]
      .filter((item) => item.status === "PENDING")
      .sort((first, second) => getTrustScore(second) - getTrustScore(first))[0];
  }, [filteredItems]);

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

  const riskyCount = (data?.items || []).filter((item) => item.isRisky || getTrustScore(item) < 55).length;
  const todayCount = (data?.items || []).filter((item) => {
    if (!item.createdAt) return false;
    const created = new Date(item.createdAt);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  }).length;

  return (
    <main className="command-page">
      <section className="phone-shell">
        <header className="topbar">
          <button className="icon-button" aria-label="Menü">
            <Menu size={20} />
          </button>

          <div className="top-title">
            <strong>ADMİN</strong>
            <span>Başvuru Karar Merkezi</span>
          </div>

          <div className="top-actions">
            <button className="icon-button" aria-label="Bildirimler">
              <Bell size={18} />
              <small>3</small>
            </button>
            <button className="icon-button" aria-label="Profil">
              <User size={18} />
            </button>
          </div>
        </header>

        <section className="hero-panel">
          <div className="flag-bg" />
          <div className="hero-glass">
            <span>T.C. EPH YÖNETİM MERKEZİ</span>
            <h1>Katılım Talepleri</h1>
            <p>Vatan ne Türkiye'dir Türklere, ne Türkistan. Vatan büyük ve müebbet bir ülkedir: Turan.</p>
            <b>— Ziya Gökalp</b>
          </div>
        </section>

        <section className="page-strip">
          <a href="/admin" className="round-link" aria-label="Geri dön">
            <ArrowLeft size={18} />
          </a>

          <div>
            <span>KARAR MASASI</span>
            <h2>İnceleme Sırası</h2>
          </div>

          <button className="round-link" onClick={() => loadApplications(status)} aria-label="Yenile">
            <RefreshCcw size={18} />
          </button>
        </section>

        <section className="metrics-bar">
          <div>
            <span>Bekleyen</span>
            <strong>{summary.pending}</strong>
          </div>
          <div>
            <span>Bugün</span>
            <strong>{todayCount || summary.pending}</strong>
          </div>
          <div>
            <span>Risk</span>
            <strong>{riskyCount}</strong>
          </div>
          <div>
            <span>Pilot</span>
            <strong>{summary.pilotThisMonth}</strong>
          </div>
          <div>
            <span>Onay</span>
            <strong>{summary.approvedThisMonth}</strong>
          </div>
        </section>

        {priorityItem ? (
          <section className="priority-card">
            <div>
              <span>SIRADAKİ ÖNCELİK</span>
              <strong>{shortName(priorityItem.applicantName)}</strong>
              <p>{roleLabels[priorityItem.requestedRole] || priorityItem.requestedRole} • {priorityItem.district || "-"} / {priorityItem.city || "Denizli"}</p>
            </div>
            <button onClick={() => openDetail(priorityItem)}>
              <small>Güven</small>
              <b>{getTrustScore(priorityItem)}</b>
            </button>
          </section>
        ) : null}

        <section className="filter-dock">
          <label className="search-box">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ad, telefon, e-posta..."
            />
          </label>

          <button className="filter-button" type="button" aria-label="Filtre">
            <SlidersHorizontal size={18} />
          </button>

          <label className="select-box">
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">Tüm Türler</option>
              <option value="referansli">Referanslı</option>
              <option value="referanssiz">Referanssız</option>
              <option value="pilot">Pilot</option>
            </select>
            <ChevronDown size={16} />
          </label>

          <label className="select-box compact-select">
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="all">Rol</option>
              <option value="EMLAKCI">Emlakçı</option>
              <option value="MUTEAHHIT">Müteahhit</option>
              <option value="INSAAT_FIRMASI">İnşaat Firması</option>
              <option value="MODERATOR">Moderatör</option>
              <option value="ADMIN">Admin</option>
            </select>
            <ChevronDown size={16} />
          </label>

          <label className="select-box full-select">
            <select value={status} onChange={(event) => handleStatusFilter(event.target.value)}>
              <option value="all">Tüm Durumlar</option>
              <option value="PENDING">Bekliyor</option>
              <option value="APPROVED">Onaylandı</option>
              <option value="REJECTED">Reddedildi</option>
              <option value="INVITED">Davet Edildi</option>
              <option value="REGISTERED">Kayıt Tamamlandı</option>
            </select>
            <ChevronDown size={16} />
          </label>
        </section>

        {error ? <div className="feedback-box error">{error}</div> : null}

        {loading ? (
          <div className="feedback-box">Katılım talepleri yükleniyor...</div>
        ) : filteredItems.length === 0 ? (
          <div className="feedback-box">Gösterilecek katılım talebi bulunamadı.</div>
        ) : (
          <section className="application-stream">
            {filteredItems.map((item, index) => {
              const score = getTrustScore(item);
              const decision = getDecision(item);

              return (
                <article className={`mini-card ${laneClasses[index % laneClasses.length]}`} key={item.id}>
                  <div className="mini-avatar">{initials(item.applicantName)}</div>

                  <div className="mini-main">
                    <div className="mini-line-one">
                      <h3>{shortName(item.applicantName)}</h3>
                      <span className={`status-pill ${statusClass(item.status)}`}>{statusLabels[item.status] || item.status}</span>
                    </div>

                    <div className="mini-line-two">
                      <span>{roleLabels[item.requestedRole] || item.requestedRole}</span>
                      <i />
                      <span>{item.district || "-"} / {item.city || "Denizli"}</span>
                      <i />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>

                    <div className="chip-row">
                      <span>{getRefText(item)}</span>
                      {item.pilotBasvuruMu ? <span>Pilot</span> : null}
                      <span>Yasal {getLegalCount(item)}/4</span>
                      <span className={score >= 80 ? "score-good" : score >= 60 ? "score-mid" : "score-bad"}>{score}/100</span>
                      <span className={`lina-chip ${decision.className}`}>Lina: {decision.label}</span>
                    </div>

                    <div className="authority-line">Yetki: {item.onayYetkiSeviyesi || "ADMIN_SUPER_ADMIN"}</div>
                  </div>

                  <div className="mini-actions">
                    <button onClick={() => openDetail(item)} aria-label="Detay">
                      <Eye size={17} />
                    </button>
                    <button
                      className="yes"
                      disabled={busyId === item.id || item.status !== "PENDING"}
                      onClick={() => handleStatusChange(item.id, "APPROVED")}
                      aria-label="Onayla"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      className="no"
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
                </article>
              );
            })}
          </section>
        )}

        <button className="lina-float" aria-label="Lina">
          <Sparkles size={22} />
          <span>Lina</span>
        </button>

        <nav className="bottom-nav">
          <a className="active" href="/admin">▦<span>Özet</span></a>
          <a href="/admin/users">♟<span>Üyeler</span></a>
          <a href="/admin/traffic">⌁<span>Trafik</span></a>
          <a href="/admin/radar">◎<span>Radar</span></a>
          <a href="/admin/system-messages">☷<span>Mesaj</span></a>
        </nav>
      </section>

      {selected ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="detail-modal">
            <button className="modal-close" onClick={() => setSelected(null)}>
              <X size={18} />
            </button>

            <div className="modal-head">
              <div className="modal-avatar">{initials(selected.applicantName)}</div>
              <div>
                <span>Başvuru Dosyası</span>
                <h2>{selected.applicantName}</h2>
                <p>{roleLabels[selected.requestedRole] || selected.requestedRole} • {selected.district || "-"} / {selected.city || "Denizli"}</p>
              </div>
            </div>

            <div className="modal-grid">
              <div>
                <span>Lina Kararı</span>
                <strong>{getDecision(selected).longLabel}</strong>
                <small>{getDecision(selected).text}</small>
              </div>
              <div>
                <span>Güven Skoru</span>
                <strong>{getTrustScore(selected)}/100</strong>
                <small>{selected.isRisky ? selected.riskNote || "Riskli başvuru" : "Kritik risk görünmüyor"}</small>
              </div>
              <div>
                <span>Yasal Onay</span>
                <strong>{getLegalCount(selected)}/4</strong>
                <small>KVKK, gizlilik, platform ve kullanıcı sözleşmesi.</small>
              </div>
              <div>
                <span>Referans</span>
                <strong>{getRefText(selected)}</strong>
                <small>{selected.referansDogrulandiMi ? "Referans doğrulandı." : "Doğrulama kontrol edilebilir."}</small>
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
        .command-page {
          min-height: 100vh;
          background: #263244;
          color: #071332;
          display: flex;
          justify-content: center;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .phone-shell {
          width: min(100%, 430px);
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% 0%, rgba(219, 234, 254, 0.95), transparent 250px),
            linear-gradient(180deg, #f8fbff 0%, #edf4fb 100%);
          position: relative;
          overflow: hidden;
          padding-bottom: 100px;
          box-shadow: 0 22px 70px rgba(15, 23, 42, 0.28);
        }

        .topbar {
          height: 70px;
          display: grid;
          grid-template-columns: 50px 1fr 104px;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          background: rgba(255, 255, 255, 0.92);
          border-bottom: 1px solid #dce6f2;
          position: sticky;
          top: 0;
          z-index: 60;
          backdrop-filter: blur(18px);
        }

        .top-title {
          text-align: center;
          min-width: 0;
        }

        .top-title strong {
          display: block;
          font-size: 17px;
          font-weight: 950;
          letter-spacing: 0.015em;
          color: #06194a;
        }

        .top-title span {
          display: block;
          margin-top: 2px;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 950;
          color: #64748b;
        }

        .top-actions {
          display: grid;
          grid-template-columns: 48px 48px;
          gap: 8px;
          justify-content: end;
        }

        .icon-button,
        .round-link,
        .filter-button {
          border: 1px solid #dbe5f0;
          background: rgba(255, 255, 255, 0.92);
          color: #071332;
          display: grid;
          place-items: center;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.065);
          position: relative;
        }

        .icon-button,
        .round-link {
          width: 48px;
          height: 48px;
          border-radius: 17px;
        }

        .icon-button small {
          position: absolute;
          top: -5px;
          right: -4px;
          min-width: 19px;
          height: 19px;
          border-radius: 999px;
          background: #ef1235;
          color: white;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 950;
        }

        .hero-panel {
          height: 130px;
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid #dbe5f0;
          background: #dc1f2e;
        }

        .flag-bg {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(0, 0, 0, 0.12), rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.12)),
            url("/admin-bayrak.jpg") center / cover no-repeat;
          filter: saturate(1.08) contrast(1.03);
          transform: scale(1.02);
        }

        .hero-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(111, 12, 24, 0.1), rgba(248, 250, 252, 0.42));
        }

        .hero-glass {
          position: absolute;
          right: 12px;
          top: 14px;
          width: 72%;
          min-height: 100px;
          border-radius: 23px;
          border: 1px solid rgba(255, 255, 255, 0.74);
          background: rgba(255, 255, 255, 0.76);
          backdrop-filter: blur(12px);
          box-shadow: 0 14px 36px rgba(127, 29, 29, 0.22);
          text-align: center;
          padding: 12px 14px;
          z-index: 2;
        }

        .hero-glass span {
          color: #66718a;
          font-size: 9px;
          line-height: 1;
          letter-spacing: 0.16em;
          font-weight: 950;
        }

        .hero-glass h1 {
          margin: 4px 0 6px;
          color: #071332;
          font-size: 18px;
          line-height: 0.95;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .hero-glass p {
          margin: 0;
          color: #071332;
          font-size: 11px;
          line-height: 1.25;
          font-weight: 850;
        }

        .hero-glass b {
          display: block;
          margin-top: 2px;
          color: #071332;
          font-size: 11px;
          font-style: italic;
          font-weight: 950;
        }

        .page-strip {
          height: 68px;
          display: grid;
          grid-template-columns: 50px 1fr 50px;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          background: rgba(255, 255, 255, 0.68);
          border-bottom: 1px solid #dce6f2;
        }

        .page-strip div {
          text-align: center;
          min-width: 0;
        }

        .page-strip span {
          display: block;
          color: #7a869a;
          font-size: 9px;
          line-height: 1;
          letter-spacing: 0.22em;
          font-weight: 950;
        }

        .page-strip h2 {
          margin: 5px 0 0;
          color: #071332;
          font-size: 25px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .metrics-bar {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 7px;
          padding: 10px 10px 8px;
        }

        .metrics-bar div {
          min-height: 50px;
          border: 1px solid #dbe5f0;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.86);
          display: grid;
          place-items: center;
          align-content: center;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);
        }

        .metrics-bar span {
          color: #64748b;
          font-size: 8.5px;
          line-height: 1;
          letter-spacing: 0.035em;
          text-transform: uppercase;
          font-weight: 950;
        }

        .metrics-bar strong {
          margin-top: 4px;
          color: #1557d6;
          font-size: 22px;
          line-height: 1;
          font-weight: 950;
        }

        .priority-card {
          margin: 0 10px 8px;
          min-height: 76px;
          border-radius: 20px;
          background:
            linear-gradient(135deg, rgba(11, 35, 86, 0.96), rgba(21, 87, 214, 0.94)),
            radial-gradient(circle at 90% 20%, rgba(255, 255, 255, 0.25), transparent 90px);
          color: white;
          display: grid;
          grid-template-columns: 1fr 68px;
          align-items: center;
          gap: 8px;
          padding: 11px 12px 11px 22px;
          box-shadow: 0 14px 28px rgba(21, 87, 214, 0.22);
        }

        .priority-card span {
          display: block;
          color: rgba(255, 255, 255, 0.78);
          font-size: 9px;
          line-height: 1;
          letter-spacing: 0.14em;
          font-weight: 950;
        }

        .priority-card strong {
          display: block;
          margin-top: 5px;
          font-size: 18px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .priority-card p {
          margin: 5px 0 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 11px;
          font-weight: 850;
        }

        .priority-card button {
          width: 62px;
          height: 56px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.18);
          color: white;
          display: grid;
          place-items: center;
          align-content: center;
        }

        .priority-card small {
          font-size: 9px;
          font-weight: 900;
        }

        .priority-card b {
          font-size: 22px;
          line-height: 1;
          font-weight: 950;
        }

        .filter-dock {
          padding: 0 10px 10px;
          display: grid;
          grid-template-columns: 1fr 48px;
          gap: 8px;
        }

        .search-box,
        .select-box,
        .filter-button {
          min-height: 44px;
          border: 1px solid #dbe5f0;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          color: #071332;
        }

        .search-box input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #071332;
          font-size: 15px;
          font-weight: 850;
        }

        .search-box input::placeholder {
          color: #94a3b8;
        }

        .select-box {
          position: relative;
          display: flex;
          align-items: center;
          padding: 0 10px 0 14px;
        }

        .select-box select {
          appearance: none;
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #071332;
          font-size: 15px;
          font-weight: 950;
          text-align: center;
        }

        .select-box svg {
          flex: 0 0 auto;
        }

        .compact-select {
          max-width: 100%;
        }

        .full-select {
          grid-column: 1 / -1;
        }

        .feedback-box {
          margin: 8px 10px;
          border-radius: 18px;
          border: 1px solid #dbe5f0;
          background: rgba(255, 255, 255, 0.88);
          color: #071332;
          padding: 14px;
          text-align: center;
          font-weight: 900;
        }

        .feedback-box.error {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }

        .application-stream {
          display: grid;
          gap: 9px;
          padding: 0 10px 18px;
        }

        .mini-card {
          min-height: 116px;
          border-radius: 20px;
          border: 1px solid #dbe5f0;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.055);
          display: grid;
          grid-template-columns: 48px 1fr 108px;
          gap: 8px;
          padding: 9px 10px 9px 12px;
          position: relative;
          overflow: hidden;
        }

        .mini-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #1557d6;
        }

        .lane-green::before { background: #16a34a; }
        .lane-violet::before { background: #7c3aed; }
        .lane-orange::before { background: #f97316; }
        .lane-cyan::before { background: #06b6d4; }
        .lane-slate::before { background: #475569; }

        .mini-avatar,
        .modal-avatar {
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1557d6;
          font-weight: 950;
        }

        .mini-avatar {
          width: 38px;
          height: 38px;
          margin-top: 5px;
          font-size: 13px;
        }

        .mini-main {
          min-width: 0;
          align-self: center;
        }

        .mini-line-one {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .mini-line-one h3 {
          min-width: 0;
          margin: 0;
          color: #071332;
          font-size: 20px;
          line-height: 0.94;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .status-pill {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 8px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
        }

        .status-pill.wait {
          background: #fff7ed;
          color: #ea580c;
        }

        .status-pill.ok {
          background: #ecfdf5;
          color: #15803d;
        }

        .status-pill.bad {
          background: #fff1f2;
          color: #be123c;
        }

        .mini-line-two {
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #334155;
          font-size: 10.5px;
          line-height: 1;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
        }

        .mini-line-two span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mini-line-two i {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: #cbd5e1;
          flex: 0 0 auto;
        }

        .chip-row {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .chip-row span {
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #071332;
          padding: 3px 6px;
          font-size: 8.5px;
          line-height: 1;
          font-weight: 950;
          white-space: nowrap;
        }

        .chip-row .score-good {
          background: #ecfdf5;
          color: #15803d;
          border-color: #bbf7d0;
        }

        .chip-row .score-mid {
          background: #fff7ed;
          color: #ea580c;
          border-color: #fed7aa;
        }

        .chip-row .score-bad {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }

        .chip-row .lina-chip.approve {
          background: #ecfdf5;
          color: #15803d;
          border-color: #bbf7d0;
        }

        .chip-row .lina-chip.neutral {
          background: #fff7ed;
          color: #ea580c;
          border-color: #fed7aa;
        }

        .chip-row .lina-chip.review {
          background: #fff1f2;
          color: #be123c;
          border-color: #fecdd3;
        }

        .authority-line {
          margin-top: 6px;
          color: #071332;
          font-size: 10px;
          line-height: 1;
          font-weight: 950;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mini-actions {
          align-self: stretch;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          align-items: end;
        }

        .mini-actions button {
          width: 32px;
          height: 42px;
          border-radius: 13px;
          border: 1px solid #dbe5f0;
          background: #ffffff;
          color: #071332;
          display: grid;
          place-items: center;
        }

        .mini-actions .yes {
          color: #16a34a;
          background: #ecfdf5;
          border-color: #bbf7d0;
        }

        .mini-actions .no {
          color: #dc2626;
          background: #fff7f7;
          border-color: #fecaca;
        }

        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .lina-float {
          position: fixed;
          left: calc(50% + 129px);
          bottom: 86px;
          width: 64px;
          height: 64px;
          border: 0;
          border-radius: 23px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 1px;
          box-shadow: 0 18px 34px rgba(79, 70, 229, 0.35);
          z-index: 80;
        }

        .lina-float span {
          font-size: 12px;
          line-height: 1;
          font-weight: 950;
        }

        .bottom-nav {
          position: fixed;
          left: 50%;
          bottom: 12px;
          width: min(calc(100% - 20px), 410px);
          transform: translateX(-50%);
          height: 62px;
          border-radius: 24px;
          border: 1px solid #dbe5f0;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          z-index: 70;
        }

        .bottom-nav a {
          color: #64748b;
          text-decoration: none;
          display: grid;
          place-items: center;
          gap: 3px;
          font-size: 16px;
          font-weight: 950;
        }

        .bottom-nav a span {
          font-size: 10px;
          line-height: 1;
          font-weight: 950;
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
          padding: 18px;
          z-index: 120;
        }

        .detail-modal {
          width: min(680px, 100%);
          max-height: calc(100vh - 36px);
          overflow: auto;
          background: #ffffff;
          border-radius: 28px;
          border: 1px solid #e2e8f0;
          padding: 20px;
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

        .modal-head {
          display: flex;
          align-items: center;
          gap: 13px;
          padding-right: 46px;
          margin-bottom: 14px;
        }

        .modal-avatar {
          width: 58px;
          height: 58px;
          font-size: 18px;
        }

        .modal-head span {
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 950;
        }

        .modal-head h2 {
          margin: 3px 0 0;
          color: #071332;
          font-size: 22px;
          line-height: 1;
          font-weight: 950;
        }

        .modal-head p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 850;
        }

        .modal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }

        .modal-grid div,
        .note-box {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 13px;
          background: #f8fafc;
        }

        .modal-grid span,
        .note-box {
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .modal-grid strong {
          display: block;
          margin-top: 5px;
          color: #071332;
          font-size: 14px;
          font-weight: 950;
        }

        .modal-grid small {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
        }

        .note-box {
          display: grid;
          gap: 9px;
          margin-bottom: 14px;
        }

        .note-box textarea {
          min-height: 100px;
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

        @media (max-width: 430px) {
          .phone-shell {
            width: 100%;
          }

          .lina-float {
            left: auto;
            right: 14px;
          }
        }

        @media (max-width: 380px) {
          .mini-card {
            grid-template-columns: 42px 1fr 96px;
          }

          .mini-line-one h3 {
            font-size: 18px;
          }

          .mini-actions button {
            width: 29px;
          }
        }
      `}</style>
    </main>
  );
}
