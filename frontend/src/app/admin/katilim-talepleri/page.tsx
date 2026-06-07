"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Eye,
  Filter,
  Hourglass,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { getRoleDisplayName } from "@/lib/role-labels";

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

function getCompletionText(item: ApplicationItem) {
  const accepted = [
    item.kvkkAccepted,
    item.privacyAccepted,
    item.platformAccepted,
    item.userAgreementAccepted,
  ].filter(Boolean).length;

  return `Profil Tamamlama ${accepted}/4`;
}

function getReferenceLabel(item: ApplicationItem) {
  if (item.referrer?.firstName || item.referrer?.lastName) {
    return `Ref: ${`${item.referrer?.firstName || ""} ${item.referrer?.lastName || ""}`.trim()}`;
  }

  if (item.referrer?.email) {
    return `Ref: ${item.referrer.email}`;
  }

  if (item.referansliMi || item.basvuruTuru === "REFERANSLI") {
    return item.referansDogrulandiMi ? "Referans Doğrulandı" : "Referans Bekliyor";
  }

  return "Referans Yok";
}

function getDecision(item: ApplicationItem) {
  const completion = [
    item.kvkkAccepted,
    item.privacyAccepted,
    item.platformAccepted,
    item.userAgreementAccepted,
  ].filter(Boolean).length;

  if (item.isRisky) {
    return { label: "Risk Kontrolü", className: "danger" };
  }

  if ((item.referansliMi || item.referansDogrulandiMi) && completion >= 4) {
    return { label: "Onaya Hazır", className: "success" };
  }

  if (completion >= 4) {
    return { label: "Manuel Kontrol", className: "warning" };
  }

  return { label: "Eksik Profil", className: "neutral" };
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
    <main className="applications-page">
      <section className="flag-banner" aria-label="Türk Bayrağı ve Ziya Gökalp alıntısı">
        <img src="/admin-bayrak.jpg" alt="Türk Bayrağı" />
        <div className="banner-overlay" />
        <div className="banner-quote">
          <p>Vatan ne Türkiye'dir Türklere, ne Türkistan.</p>
          <p>Vatan büyük ve müebbet bir ülkedir: Turan.</p>
          <span>— Ziya Gökalp</span>
        </div>
      </section>

      <section className="page-shell">
        <header className="page-head">
          <a href="/admin" className="back-button" aria-label="Admin paneline dön">
            <ArrowLeft size={22} />
          </a>

          <div>
            <h1>Katılım Talepleri</h1>
            <p>Başvuru inceleme ve karar merkezi</p>
          </div>

          <div className="head-actions">
            <button type="button" aria-label="Filtreler">
              <Filter size={19} />
            </button>
            <button type="button" aria-label="Yenile" onClick={() => loadApplications(status)}>
              <RefreshCcw size={19} />
            </button>
          </div>
        </header>

        <section className="summary-grid" aria-label="Katılım talebi özeti">
          <article className="summary-card blue">
            <div className="summary-icon"><Hourglass size={17} /></div>
            <span>Bekleyen</span>
            <strong>{summary.pending}</strong>
            <i />
          </article>

          <article className="summary-card green">
            <div className="summary-icon"><CheckCircle2 size={17} /></div>
            <span>Onaylanan</span>
            <strong>{summary.approvedThisMonth}</strong>
            <i />
          </article>

          <article className="summary-card red">
            <div className="summary-icon"><XCircle size={17} /></div>
            <span>Reddedilen</span>
            <strong>{summary.rejectedThisMonth}</strong>
            <i />
          </article>

          <article className="summary-card purple">
            <div className="summary-icon"><UsersRound size={17} /></div>
            <span>Pilot</span>
            <strong>{summary.pilotThisMonth}</strong>
            <i />
          </article>
        </section>

        <section className="filters">
          <label className="search-box">
            <Search size={21} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ara: ad, telefon, e-posta..."
            />
          </label>

          <button className="filter-square" type="button" aria-label="Gelişmiş filtreler">
            <SlidersHorizontal size={21} />
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
              const decision = getDecision(item);

              return (
                <article className={`application-card ${cardThemes[index % cardThemes.length]}`} key={item.id}>
                  <div className="card-main">
                    <div className="avatar">{initials(item.applicantName)}</div>

                    <div className="person-block">
                      <div className="name-row">
                        <h2>{item.applicantName}</h2>
                        <span className={`status-pill ${item.status.toLowerCase()}`}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </div>

                      <p className="contact-line">
                        <span>{item.applicantEmail}</span>
                        <b>•</b>
                        <span>{item.applicantPhone}</span>
                      </p>

                      <p className="meta-line">
                        <BriefcaseBusiness size={14} />
                        <span>{getRoleDisplayName(item.requestedRole)}</span>
                        <b>•</b>
                        <MapPin size={14} />
                        <span>{item.district || "-"} / {item.city || "-"}</span>
                        <b>•</b>
                        <span>{formatDate(item.createdAt)}</span>
                      </p>

                      <div className="info-row">
                        <span className="info-pill reference">
                          <UserRound size={15} />
                          {getReferenceLabel(item)}
                        </span>
                        <span className="info-pill completion">
                          <ShieldCheck size={15} />
                          {getCompletionText(item)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="decision-line">
                    <span className={`decision-pill ${decision.className}`}>{decision.label}</span>
                    <div className="card-actions">
                      <button type="button" onClick={() => openDetail(item)} aria-label="Başvuru detayını gör">
                        <Eye size={18} />
                      </button>
                      <button
                        type="button"
                        className="approve"
                        disabled={busyId === item.id || item.status !== "PENDING"}
                        onClick={() => handleStatusChange(item.id, "APPROVED")}
                        aria-label="Başvuruyu onayla"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        type="button"
                        className="reject"
                        disabled={busyId === item.id || item.status !== "PENDING"}
                        onClick={() => {
                          setSelected(item);
                          setNote(item.adminNote || "");
                        }}
                        aria-label="Başvuruyu reddet"
                      >
                        <X size={20} />
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
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="Pencereyi kapat">
              <X size={18} />
            </button>

            <div className="modal-header">
              <div className="avatar large">{initials(selected.applicantName)}</div>
              <div>
                <h2>{selected.applicantName}</h2>
                <p>{getRoleDisplayName(selected.requestedRole)}</p>
              </div>
            </div>

            <div className="detail-grid">
              <div>
                <span>Referans</span>
                <strong>{getReferenceLabel(selected)}</strong>
              </div>
              <div>
                <span>Profil Durumu</span>
                <strong>{getCompletionText(selected)}</strong>
              </div>
              <div>
                <span>Karar Durumu</span>
                <strong>{getDecision(selected).label}</strong>
              </div>
              <div>
                <span>Başvuru Tarihi</span>
                <strong>{formatDate(selected.createdAt)}</strong>
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
        .applications-page {
          min-height: 100dvh;
          background: linear-gradient(180deg, #f8fbff 0%, #eef5fc 100%);
          color: #071332;
          font-family:
            Roboto,
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          padding-bottom: 96px;
        }

        .flag-banner {
          height: 154px;
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid #dbe5f1;
          background: #ffffff;
        }

        .flag-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.18) 36%, rgba(255, 255, 255, 0.9) 62%, rgba(255, 255, 255, 0.98) 100%);
          pointer-events: none;
        }

        .banner-quote {
          position: absolute;
          right: 28px;
          top: 50%;
          width: min(520px, 58%);
          transform: translateY(-50%);
          color: #06194a;
          text-align: center;
          font-weight: 600;
          text-shadow: 0 1px 10px rgba(255, 255, 255, 0.72);
        }

        .banner-quote p {
          margin: 0 0 6px;
          font-size: 20px;
          line-height: 1.28;
          letter-spacing: -0.02em;
        }

        .banner-quote span {
          display: block;
          margin-top: 7px;
          color: #334155;
          font-size: 17px;
          font-style: italic;
          font-weight: 500;
        }

        .page-shell {
          width: min(1160px, 100%);
          margin: 0 auto;
          padding: 28px 34px 0;
        }

        .page-head {
          display: grid;
          grid-template-columns: 50px 1fr auto;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .back-button,
        .head-actions button,
        .filter-square,
        .card-actions button,
        .modal-close {
          border: 1px solid #dbe5f1;
          background: #ffffff;
          color: #071332;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.055);
          display: grid;
          place-items: center;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .back-button:hover,
        .head-actions button:hover,
        .filter-square:hover,
        .card-actions button:hover,
        .modal-close:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
        }

        .back-button {
          width: 50px;
          height: 50px;
          border-radius: 17px;
          text-decoration: none;
        }

        .page-head h1 {
          margin: 0;
          color: #06194a;
          font-size: 36px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.05em;
        }

        .page-head p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 16px;
          font-weight: 600;
        }

        .head-actions {
          display: flex;
          gap: 12px;
        }

        .head-actions button {
          width: 58px;
          height: 58px;
          border-radius: 18px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .summary-card {
          min-height: 118px;
          border: 1px solid #dbe5f1;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.055);
          padding: 17px 18px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 7px;
          overflow: hidden;
        }

        .summary-icon {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          display: grid;
          place-items: center;
        }

        .summary-card span {
          color: #06194a;
          font-size: 13px;
          line-height: 1;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .summary-card strong {
          color: #1557d6;
          font-size: 30px;
          line-height: 1;
          font-weight: 800;
        }

        .summary-card i {
          width: 100%;
          height: 3px;
          border-radius: 999px;
          margin-top: 5px;
          background: #1557d6;
        }

        .summary-card.blue .summary-icon {
          color: #1557d6;
          background: #eff6ff;
        }

        .summary-card.green .summary-icon {
          color: #16a34a;
          background: #ecfdf5;
        }

        .summary-card.green strong,
        .summary-card.green .summary-icon {
          color: #16a34a;
        }

        .summary-card.green i {
          background: #16a34a;
        }

        .summary-card.red .summary-icon {
          color: #e11d48;
          background: #fff1f2;
        }

        .summary-card.red strong,
        .summary-card.red .summary-icon {
          color: #e11d48;
        }

        .summary-card.red i {
          background: #e11d48;
        }

        .summary-card.purple .summary-icon {
          color: #7c3aed;
          background: #f5f3ff;
        }

        .summary-card.purple strong,
        .summary-card.purple .summary-icon {
          color: #7c3aed;
        }

        .summary-card.purple i {
          background: #7c3aed;
        }

        .filters {
          display: grid;
          grid-template-columns: 1fr 68px;
          gap: 14px;
          margin-bottom: 24px;
        }

        .search-box,
        .filters select {
          width: 100%;
          min-height: 62px;
          border-radius: 20px;
          border: 1px solid #dbe5f1;
          background: rgba(255, 255, 255, 0.92);
          color: #071332;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.045);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 22px;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #071332;
          font-size: 18px;
          font-weight: 600;
        }

        .search-box input::placeholder {
          color: #94a3b8;
        }

        .filter-square {
          width: 68px;
          min-height: 62px;
          border-radius: 20px;
        }

        .filters select {
          grid-column: 1 / -1;
          padding: 0 22px;
          font-size: 18px;
          font-weight: 700;
          text-align: center;
          text-align-last: center;
        }

        .error-box,
        .empty-state {
          border-radius: 20px;
          padding: 18px;
          text-align: center;
          font-weight: 800;
          border: 1px solid #dbe5f1;
          background: #ffffff;
          color: #071332;
        }

        .application-list {
          display: grid;
          gap: 14px;
        }

        .application-card {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #dbe5f1;
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.06);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .application-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: #1557d6;
        }

        .theme-blue::before { background: #1557d6; }
        .theme-green::before { background: #16a34a; }
        .theme-purple::before { background: #7c3aed; }
        .theme-amber::before { background: #f59e0b; }
        .theme-cyan::before { background: #06b6d4; }
        .theme-rose::before { background: #e11d48; }

        .card-main {
          min-width: 0;
          display: grid;
          grid-template-columns: 62px 1fr;
          gap: 16px;
          align-items: start;
        }

        .avatar {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: #eff6ff;
          color: #1557d6;
          border: 1px solid #bfdbfe;
          font-size: 17px;
          font-weight: 800;
        }

        .avatar.large {
          width: 66px;
          height: 66px;
          border-radius: 22px;
        }

        .person-block {
          min-width: 0;
        }

        .name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          margin-bottom: 6px;
        }

        .name-row h2 {
          min-width: 0;
          margin: 0;
          color: #06194a;
          font-family: Roboto, Inter, system-ui, sans-serif;
          font-size: 24px;
          line-height: 1.05;
          font-weight: 500;
          letter-spacing: -0.03em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-pill {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 7px 12px;
          background: #fff7ed;
          color: #ea580c;
          font-size: 11px;
          line-height: 1;
          font-weight: 800;
          text-transform: uppercase;
        }

        .contact-line,
        .meta-line {
          margin: 0;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.45;
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .contact-line b,
        .meta-line b {
          color: #cbd5e1;
        }

        .info-row {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 12px;
        }

        .info-pill {
          min-height: 36px;
          border-radius: 12px;
          border: 1px solid #dbe5f1;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #06194a;
          background: #ffffff;
          font-size: 13px;
          font-weight: 700;
        }

        .info-pill.reference {
          color: #1557d6;
          border-color: #bfdbfe;
          background: #f8fbff;
        }

        .info-pill.completion {
          color: #15803d;
          border-color: #bbf7d0;
          background: #f7fef9;
        }

        .decision-line {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .decision-pill {
          min-width: 126px;
          min-height: 38px;
          border-radius: 999px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .decision-pill.success {
          color: #15803d;
          background: #dcfce7;
        }

        .decision-pill.warning {
          color: #ea580c;
          background: #ffedd5;
        }

        .decision-pill.neutral {
          color: #475569;
          background: #f1f5f9;
        }

        .decision-pill.danger {
          color: #b91c1c;
          background: #fee2e2;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-actions button {
          width: 48px;
          height: 48px;
          border-radius: 16px;
        }

        .card-actions button.approve {
          color: #16a34a;
          background: #ecfdf5;
          border-color: #bbf7d0;
        }

        .card-actions button.reject {
          color: #dc2626;
          background: #fff7f7;
          border-color: #fecaca;
        }

        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.34);
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
          border: 1px solid #dbe5f1;
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
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-right: 46px;
          margin-bottom: 16px;
        }

        .modal-header h2 {
          margin: 0;
          color: #06194a;
          font-size: 23px;
          font-weight: 600;
        }

        .modal-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-weight: 700;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }

        .detail-grid div,
        .note-box {
          border: 1px solid #dbe5f1;
          border-radius: 18px;
          padding: 14px;
          background: #f8fafc;
        }

        .detail-grid span,
        .note-box {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .detail-grid strong {
          display: block;
          margin-top: 6px;
          color: #06194a;
          font-size: 14px;
          font-weight: 700;
        }

        .note-box {
          display: grid;
          gap: 10px;
          margin-bottom: 16px;
        }

        .note-box textarea {
          min-height: 110px;
          width: 100%;
          border: 1px solid #dbe5f1;
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
          min-height: 50px;
          border-radius: 16px;
          border: 1px solid #dbe5f1;
          background: white;
          color: #071332;
          font-weight: 800;
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

        @media (max-width: 760px) {
          .applications-page {
            padding-bottom: 90px;
          }

          .flag-banner {
            height: 116px;
          }

          .banner-overlay {
            background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.12) 35%, rgba(255, 255, 255, 0.82) 65%, rgba(255, 255, 255, 0.94) 100%);
          }

          .banner-quote {
            right: 16px;
            width: 56%;
          }

          .banner-quote p {
            margin-bottom: 4px;
            font-size: 13px;
            line-height: 1.22;
            font-weight: 700;
          }

          .banner-quote span {
            margin-top: 4px;
            font-size: 12px;
          }

          .page-shell {
            padding: 18px 14px 0;
          }

          .page-head {
            grid-template-columns: 44px 1fr auto;
            gap: 10px;
            margin-bottom: 16px;
          }

          .back-button {
            width: 44px;
            height: 44px;
            border-radius: 15px;
          }

          .page-head h1 {
            font-size: 29px;
            text-align: left;
          }

          .page-head p {
            display: none;
          }

          .head-actions {
            gap: 8px;
          }

          .head-actions button {
            width: 48px;
            height: 48px;
            border-radius: 16px;
          }

          .summary-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 16px;
          }

          .summary-card {
            min-height: 62px;
            border-radius: 15px;
            padding: 7px 5px 6px;
            gap: 2px;
          }

          .summary-icon {
            width: 22px;
            height: 22px;
          }

          .summary-icon :global(svg) {
            width: 13px;
            height: 13px;
          }

          .summary-card span {
            width: 100%;
            font-size: 9px;
            line-height: 1.05;
            text-align: center;
          }

          .summary-card strong {
            width: 100%;
            font-size: 21px;
            text-align: center;
          }

          .summary-card i {
            height: 2px;
            margin-top: 4px;
          }

          .filters {
            grid-template-columns: 1fr 52px;
            gap: 10px;
            margin-bottom: 16px;
          }

          .search-box,
          .filters select {
            min-height: 54px;
            border-radius: 16px;
          }

          .search-box {
            padding: 0 16px;
          }

          .search-box input {
            font-size: 16px;
          }

          .filter-square {
            width: 52px;
            min-height: 54px;
            border-radius: 16px;
          }

          .filters select {
            padding: 0 18px;
            font-size: 17px;
          }

          .application-list {
            gap: 12px;
          }

          .application-card {
            grid-template-columns: 1fr;
            gap: 12px;
            border-radius: 22px;
            padding: 15px 14px 14px;
          }

          .card-main {
            grid-template-columns: 50px 1fr;
            gap: 11px;
          }

          .avatar {
            width: 44px;
            height: 44px;
            border-radius: 15px;
            font-size: 15px;
          }

          .name-row {
            align-items: start;
            gap: 7px;
          }

          .name-row h2 {
            font-size: 24px;
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .status-pill {
            padding: 6px 9px;
            font-size: 9px;
            margin-top: 2px;
          }

          .contact-line,
          .meta-line {
            font-size: 12.5px;
            gap: 5px;
          }

          .info-row {
            gap: 7px;
            margin-top: 10px;
          }

          .info-pill {
            min-height: 32px;
            border-radius: 11px;
            padding: 0 9px;
            font-size: 12px;
          }

          .decision-line {
            justify-content: space-between;
            gap: 10px;
            padding-left: 50px;
          }

          .decision-pill {
            min-width: 112px;
            min-height: 34px;
            font-size: 12px;
            padding: 0 11px;
          }

          .card-actions {
            gap: 8px;
          }

          .card-actions button {
            width: 44px;
            height: 44px;
            border-radius: 14px;
          }

          .detail-grid,
          .modal-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
