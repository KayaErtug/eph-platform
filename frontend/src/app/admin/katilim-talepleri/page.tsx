
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

const toneClasses = ["tone-blue", "tone-green", "tone-violet", "tone-orange", "tone-cyan", "tone-slate"];

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

function compactName(name: string) {
  const clean = name.trim();
  if (clean.length <= 18) return clean;
  return `${clean.slice(0, 18)}...`;
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

function getLegalText(item: ApplicationItem) {
  const accepted = [
    item.kvkkAccepted,
    item.privacyAccepted,
    item.platformAccepted,
    item.userAgreementAccepted,
  ].filter(Boolean).length;

  return `${accepted}/4`;
}

function getRefText(item: ApplicationItem) {
  if (item.referansliMi || item.basvuruTuru === "REFERANSLI") return "Ref.";
  return "Refsiz";
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

  const pendingItems = useMemo(() => filteredItems.filter((item) => item.status === "PENDING"), [filteredItems]);

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

  const todayCount = (data?.items || []).filter((item) => {
    const created = new Date(item.createdAt);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  }).length;

  const riskyCount = (data?.items || []).filter((item) => item.isRisky || getTrustScore(item) < 55).length;

  return (
    <main className="command-page">
      <section className="hero-shell">
        <div className="flag-photo" aria-hidden="true">
          <img src="/admin-bayrak.jpg" alt="" />
          <div className="flag-fallback">★</div>
        </div>

        <div className="hero-glass">
          <span>T.C. EPH YÖNETİM MERKEZİ</span>
          <strong>Başvuru İnceleme Komuta Ekranı</strong>
          <p>
            Vatan ne Türkiye'dir Türklere, ne Türkistan. Vatan büyük ve müebbet bir ülkedir: Turan.
            <b> — Ziya Gökalp</b>
          </p>
        </div>
      </section>

      <section className="mission-strip">
        <a href="/admin" className="back-button" aria-label="Admin paneline dön">
          <ArrowLeft size={18} />
        </a>

        <div className="mission-title">
          <span>Karar Masası</span>
          <h1>Katılım Talepleri</h1>
        </div>

        <button className="refresh-button" onClick={() => loadApplications(status)} aria-label="Yenile">
          <RefreshCcw size={18} />
        </button>
      </section>

      <section className="intel-board">
        <article>
          <span>Bekleyen</span>
          <strong>{summary.pending}</strong>
        </article>
        <article>
          <span>Bugün</span>
          <strong>{todayCount}</strong>
        </article>
        <article>
          <span>Risk</span>
          <strong>{riskyCount}</strong>
        </article>
        <article>
          <span>Pilot</span>
          <strong>{summary.pilotThisMonth}</strong>
        </article>
        <article>
          <span>Onay</span>
          <strong>{summary.approvedThisMonth}</strong>
        </article>
      </section>

      <section className="control-panel">
        <label className="search-line">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ad, telefon, e-posta..."
          />
        </label>

        <button className="tune-button" type="button" aria-label="Filtre ayarları">
          <SlidersHorizontal size={18} />
        </button>

        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">Tür</option>
          <option value="referansli">Referanslı</option>
          <option value="referanssiz">Referanssız</option>
          <option value="pilot">Pilot</option>
        </select>

        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="all">Rol</option>
          <option value="EMLAKCI">Emlakçı</option>
          <option value="MUTEAHHIT">Müteahhit</option>
          <option value="INSAAT_FIRMASI">İnşaat Firması</option>
          <option value="MODERATOR">Moderatör</option>
          <option value="ADMIN">Admin</option>
        </select>

        <select value={status} onChange={(event) => handleStatusFilter(event.target.value)}>
          <option value="all">Durum</option>
          <option value="PENDING">Bekliyor</option>
          <option value="APPROVED">Onaylandı</option>
          <option value="REJECTED">Reddedildi</option>
          <option value="INVITED">Davet</option>
          <option value="REGISTERED">Kayıt</option>
        </select>
      </section>

      {pendingItems[0] ? (
        <section className="priority-card">
          <div>
            <span>Sıradaki Öncelik</span>
            <strong>{pendingItems[0].applicantName}</strong>
            <p>
              {roleLabels[pendingItems[0].requestedRole] || pendingItems[0].requestedRole} • {pendingItems[0].district || "-"} / {pendingItems[0].city || "-"}
            </p>
          </div>

          <div className="priority-score">
            <small>Güven</small>
            <b>{getTrustScore(pendingItems[0])}</b>
          </div>
        </section>
      ) : null}

      {error ? <div className="error-box">{error}</div> : null}

      {loading ? (
        <div className="empty-state">Katılım talepleri yükleniyor...</div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">Gösterilecek katılım talebi bulunamadı.</div>
      ) : (
        <section className="dossier-list">
          {filteredItems.map((item, index) => {
            const score = getTrustScore(item);
            const decision = getDecision(item);
            const legal = getLegalText(item);

            return (
              <article className={`dossier-card ${toneClasses[index % toneClasses.length]}`} key={item.id}>
                <div className="identity-dot">{initials(item.applicantName)}</div>

                <button className="dossier-main" onClick={() => openDetail(item)} type="button">
                  <div className="dossier-line-one">
                    <h2>{compactName(item.applicantName)}</h2>
                    <span className={`state ${item.status.toLowerCase()}`}>{statusLabels[item.status] || item.status}</span>
                  </div>

                  <div className="dossier-line-two">
                    <span>{roleLabels[item.requestedRole] || item.requestedRole}</span>
                    <i />
                    <span>{item.district || "-"} / {item.city || "-"}</span>
                    <i />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>

                  <div className="micro-chips">
                    <b>{getRefText(item)}</b>
                    {item.pilotBasvuruMu ? <b>Pilot</b> : null}
                    <b>Yasal {legal}</b>
                    <b className={score >= 80 ? "good" : score >= 60 ? "mid" : "bad"}>{score}/100</b>
                    <b className={decision.className}>Lina: {decision.label}</b>
                  </div>

                  <p>
                    Yetki: <strong>{item.onayYetkiSeviyesi || "ADMIN_SUPER_ADMIN"}</strong>
                  </p>
                </button>

                <div className="quick-actions">
                  <button onClick={() => openDetail(item)} aria-label="Detay">
                    <Eye size={17} />
                  </button>
                  <button
                    className="accept"
                    disabled={busyId === item.id || item.status !== "PENDING"}
                    onClick={() => handleStatusChange(item.id, "APPROVED")}
                    aria-label="Onayla"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    className="deny"
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

      {selected ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="detail-modal">
            <button className="modal-close" onClick={() => setSelected(null)}>
              <X size={18} />
            </button>

            <div className="modal-header">
              <div className="identity-dot big">{initials(selected.applicantName)}</div>
              <div>
                <span>Başvuru Dosyası</span>
                <h2>{selected.applicantName}</h2>
                <p>{selected.applicantEmail} • {selected.applicantPhone}</p>
              </div>
            </div>

            <div className="decision-panel">
              <div>
                <Sparkles size={18} />
                <span>Lina Ön Değerlendirme</span>
                <strong>{getDecision(selected).longLabel}</strong>
                <small>{getDecision(selected).text}</small>
              </div>
              <div>
                <ShieldCheck size={18} />
                <span>Güven Skoru</span>
                <strong>{getTrustScore(selected)}/100</strong>
                <small>{selected.isRisky ? selected.riskNote || "Riskli başvuru" : "Kritik risk görünmüyor"}</small>
              </div>
            </div>

            <div className="detail-grid">
              <span>Rol <b>{roleLabels[selected.requestedRole] || selected.requestedRole}</b></span>
              <span>Konum <b>{selected.district || "-"} / {selected.city || "-"}</b></span>
              <span>Referans <b>{getRefText(selected)}</b></span>
              <span>Yasal Onay <b>{getLegalText(selected)}</b></span>
              <span>Durum <b>{statusLabels[selected.status] || selected.status}</b></span>
              <span>Tarih <b>{formatDate(selected.createdAt)}</b></span>
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
          min-height: 100dvh;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.09), transparent 32%),
            linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
          color: #06194a;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          padding-bottom: 104px;
        }

        .hero-shell {
          position: sticky;
          top: 0;
          z-index: 25;
          height: 128px;
          display: grid;
          align-items: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(15, 23, 42, 0.1);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
        }

        .flag-photo {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, #df1f30 0%, #df1f30 42%, #ffffff 100%);
        }

        .flag-photo img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          opacity: 0.98;
        }

        .flag-fallback {
          position: absolute;
          left: 18px;
          top: 34px;
          width: 58px;
          height: 58px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          color: #dc2626;
          display: grid;
          place-items: center;
          font-size: 26px;
          font-weight: 950;
        }

        .hero-glass {
          position: relative;
          margin: 0 12px 0 104px;
          min-height: 86px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.72);
          box-shadow: 0 18px 46px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(13px);
          padding: 12px 14px;
          display: grid;
          align-content: center;
          gap: 3px;
        }

        .hero-glass span {
          color: #64748b;
          font-size: 10px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.13em;
        }

        .hero-glass strong {
          color: #06194a;
          font-size: 17px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .hero-glass p {
          margin: 3px 0 0;
          color: #0f1f44;
          font-size: 11px;
          line-height: 1.28;
          font-weight: 850;
        }

        .hero-glass b {
          font-weight: 950;
          font-style: italic;
        }

        .mission-strip {
          height: 70px;
          display: grid;
          grid-template-columns: 42px 1fr 42px;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.72);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(16px);
        }

        .back-button,
        .refresh-button,
        .tune-button,
        .quick-actions button,
        .modal-close {
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: #ffffff;
          color: #06194a;
          display: grid;
          place-items: center;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
        }

        .back-button,
        .refresh-button {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          text-decoration: none;
        }

        .mission-title {
          text-align: center;
        }

        .mission-title span {
          display: block;
          color: #64748b;
          font-size: 10px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .mission-title h1 {
          margin: 3px 0 0;
          color: #06194a;
          font-size: 25px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .intel-board {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 7px;
          padding: 10px;
        }

        .intel-board article {
          min-height: 52px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.24);
          display: grid;
          place-items: center;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
        }

        .intel-board span {
          color: #64748b;
          font-size: 9.5px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
        }

        .intel-board strong {
          color: #1557d6;
          font-size: 21px;
          line-height: 1;
          font-weight: 950;
        }

        .control-panel {
          display: grid;
          grid-template-columns: 1fr 42px 0.72fr 0.64fr 0.72fr;
          gap: 7px;
          padding: 0 10px 9px;
        }

        .search-line,
        .control-panel select,
        .tune-button {
          height: 46px;
          border-radius: 15px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 7px 18px rgba(15, 23, 42, 0.04);
        }

        .search-line {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          color: #06194a;
        }

        .search-line input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #06194a;
          font-size: 14px;
          font-weight: 850;
        }

        .search-line input::placeholder {
          color: #94a3b8;
        }

        .control-panel select {
          min-width: 0;
          padding: 0 8px;
          color: #06194a;
          font-size: 12px;
          font-weight: 950;
        }

        .priority-card {
          margin: 0 10px 9px;
          min-height: 64px;
          border-radius: 19px;
          background:
            linear-gradient(135deg, rgba(6, 25, 74, 0.96), rgba(21, 87, 214, 0.86)),
            radial-gradient(circle at right, rgba(255, 255, 255, 0.3), transparent 36%);
          color: #ffffff;
          padding: 12px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 16px 34px rgba(21, 87, 214, 0.2);
        }

        .priority-card span {
          display: block;
          color: rgba(255, 255, 255, 0.7);
          font-size: 10px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .priority-card strong {
          display: block;
          margin-top: 4px;
          font-size: 17px;
          line-height: 1;
          font-weight: 950;
        }

        .priority-card p {
          margin: 4px 0 0;
          color: rgba(255, 255, 255, 0.84);
          font-size: 11px;
          font-weight: 850;
        }

        .priority-score {
          width: 58px;
          height: 48px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.22);
          display: grid;
          place-items: center;
        }

        .priority-score small {
          color: rgba(255, 255, 255, 0.72);
          font-size: 9px;
          line-height: 1;
          font-weight: 950;
        }

        .priority-score b {
          font-size: 19px;
          line-height: 1;
          font-weight: 950;
        }

        .error-box,
        .empty-state {
          margin: 0 10px 9px;
          border-radius: 18px;
          padding: 14px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.28);
          text-align: center;
          font-weight: 900;
          color: #06194a;
        }

        .dossier-list {
          display: grid;
          gap: 8px;
          padding: 0 10px;
        }

        .dossier-card {
          min-height: 96px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.22);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
          display: grid;
          grid-template-columns: 44px 1fr 112px;
          gap: 8px;
          padding: 9px;
          position: relative;
          overflow: hidden;
        }

        .dossier-card::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: var(--tone);
        }

        .tone-blue { --tone: #2563eb; --soft: #eff6ff; }
        .tone-green { --tone: #16a34a; --soft: #ecfdf5; }
        .tone-violet { --tone: #7c3aed; --soft: #f5f3ff; }
        .tone-orange { --tone: #f97316; --soft: #fff7ed; }
        .tone-cyan { --tone: #0891b2; --soft: #ecfeff; }
        .tone-slate { --tone: #475569; --soft: #f8fafc; }

        .identity-dot {
          width: 38px;
          height: 38px;
          border-radius: 15px;
          background: var(--soft, #eff6ff);
          color: var(--tone, #2563eb);
          border: 1px solid rgba(148, 163, 184, 0.24);
          display: grid;
          place-items: center;
          font-size: 13px;
          font-weight: 950;
          align-self: start;
          margin-left: 2px;
        }

        .identity-dot.big {
          width: 56px;
          height: 56px;
          border-radius: 20px;
          font-size: 17px;
          margin: 0;
        }

        .dossier-main {
          min-width: 0;
          border: 0;
          background: transparent;
          text-align: left;
          padding: 0;
          color: inherit;
        }

        .dossier-line-one {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .dossier-line-one h2 {
          margin: 0;
          color: #06194a;
          font-size: 16px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.035em;
          min-width: 0;
        }

        .state {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 4px 7px;
          background: #fff7ed;
          color: #ea580c;
          font-size: 8px;
          line-height: 1;
          font-weight: 950;
          text-transform: uppercase;
        }

        .state.approved { background: #dcfce7; color: #15803d; }
        .state.rejected { background: #fee2e2; color: #b91c1c; }
        .state.registered { background: #dbeafe; color: #1557d6; }
        .state.invited { background: #f5f3ff; color: #7c3aed; }

        .dossier-line-two {
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #475569;
          font-size: 10.5px;
          line-height: 1;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
        }

        .dossier-line-two i {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: #cbd5e1;
          flex: 0 0 auto;
        }

        .micro-chips {
          margin-top: 6px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
          max-height: 42px;
          overflow: hidden;
        }

        .micro-chips b {
          border-radius: 999px;
          padding: 4px 6px;
          background: #f8fafc;
          color: #06194a;
          border: 1px solid rgba(148, 163, 184, 0.18);
          font-size: 9.5px;
          line-height: 1;
          font-weight: 950;
        }

        .micro-chips .good { background: #dcfce7; color: #15803d; }
        .micro-chips .mid { background: #ffedd5; color: #ea580c; }
        .micro-chips .bad { background: #fee2e2; color: #b91c1c; }
        .micro-chips .approve { background: #dcfce7; color: #15803d; }
        .micro-chips .neutral { background: #ffedd5; color: #ea580c; }
        .micro-chips .review { background: #fee2e2; color: #b91c1c; }

        .dossier-main p {
          margin: 7px 0 0;
          color: #334155;
          font-size: 10.5px;
          line-height: 1;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          align-content: end;
          gap: 6px;
        }

        .quick-actions button {
          width: 32px;
          height: 32px;
          border-radius: 12px;
          color: #06194a;
        }

        .quick-actions .accept {
          color: #15803d;
          background: #ecfdf5;
          border-color: #bbf7d0;
        }

        .quick-actions .deny {
          color: #dc2626;
          background: #fff7f7;
          border-color: #fecaca;
        }

        button:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.36);
          display: grid;
          place-items: center;
          padding: 14px;
          z-index: 100;
        }

        .detail-modal {
          width: min(680px, 100%);
          max-height: calc(100vh - 28px);
          overflow: auto;
          background: #ffffff;
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          padding: 18px;
          position: relative;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
        }

        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 40px;
          height: 40px;
          border-radius: 14px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-right: 44px;
          margin-bottom: 14px;
        }

        .modal-header span {
          color: #64748b;
          font-size: 10px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .modal-header h2 {
          margin: 4px 0 0;
          color: #06194a;
          font-size: 21px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .modal-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .decision-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-bottom: 10px;
        }

        .decision-panel div,
        .detail-grid span,
        .note-box {
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 16px;
          background: #f8fafc;
        }

        .decision-panel div {
          padding: 12px;
        }

        .decision-panel svg {
          color: #1557d6;
          margin-bottom: 7px;
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
          color: #06194a;
          font-size: 15px;
          line-height: 1;
          font-weight: 950;
        }

        .decision-panel small {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-weight: 750;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }

        .detail-grid span {
          padding: 10px;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .detail-grid b {
          display: block;
          margin-top: 4px;
          color: #06194a;
          font-size: 12px;
          font-weight: 950;
        }

        .note-box {
          display: grid;
          gap: 8px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .note-box textarea {
          min-height: 104px;
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.28);
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
          min-height: 46px;
          border-radius: 15px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: white;
          color: #06194a;
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

        @media (min-width: 761px) {
          .command-page {
            max-width: 980px;
            margin: 0 auto;
            border-left: 1px solid rgba(148, 163, 184, 0.18);
            border-right: 1px solid rgba(148, 163, 184, 0.18);
          }

          .hero-shell {
            height: 150px;
          }

          .hero-glass {
            margin-left: 150px;
            margin-right: 28px;
            padding: 18px 22px;
          }

          .hero-glass strong {
            font-size: 24px;
          }

          .hero-glass p {
            font-size: 14px;
          }

          .dossier-card {
            grid-template-columns: 54px 1fr 128px;
          }

          .identity-dot {
            width: 46px;
            height: 46px;
          }
        }

        @media (max-width: 430px) {
          .control-panel {
            grid-template-columns: 1fr 42px;
          }

          .control-panel select {
            height: 42px;
          }
        }
      `}</style>
    </main>
  );
}
