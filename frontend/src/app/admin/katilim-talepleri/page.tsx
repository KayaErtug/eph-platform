"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  Download,
  Eye,
  Filter,
  Menu,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import api from "@/lib/api";

type ApplicationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "INVITED"
  | "REGISTERED"
  | string;

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
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  rejectedAt?: string | null;
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

const cardThemes = [
  "theme-blue",
  "theme-green",
  "theme-purple",
  "theme-amber",
  "theme-cyan",
  "theme-rose",
];

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
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
        params: {
          status: selectedStatus,
        },
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

          <p>Sistem</p>
          <a href="/notification-settings">Bildirimler</a>
          <a href="/admin/reports">Raporlar</a>
          <a href="/admin/settings">Ayarlar</a>

          <p>Lina V5</p>
          <a href="/lina">Lina Paneli</a>
          <a href="/admin/lina/decisions">Karar Motoru</a>
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
          <a className="back-button" href="/admin">
            <ArrowLeft size={18} />
            Geri
          </a>

          <div className="mobile-title">
            <h1>Katılım Talepleri</h1>
          </div>

          <div className="top-actions">
            <button aria-label="Bildirimler">
              <Bell size={18} />
              <small>3</small>
            </button>
            <button aria-label="Menü">
              <Menu size={20} />
            </button>
          </div>
        </header>

        <div className="page-title">
          <h1>Katılım Talepleri</h1>
          <p>Platforma katılmak isteyen kullanıcıların başvurularını yönetin.</p>
        </div>

        <section className="summary-grid">
          <article className="summary-card blue">
            <div className="summary-icon">⌛</div>
            <div>
              <span>Bekleyen</span>
              <strong>{summary.pending}</strong>
            </div>
          </article>

          <article className="summary-card green">
            <div className="summary-icon">✓</div>
            <div>
              <span>Onaylanan</span>
              <strong>{summary.approvedThisMonth}</strong>
            </div>
          </article>

          <article className="summary-card red">
            <div className="summary-icon">×</div>
            <div>
              <span>Reddedilen</span>
              <strong>{summary.rejectedThisMonth}</strong>
            </div>
          </article>

          <article className="summary-card purple">
            <div className="summary-icon">👥</div>
            <div>
              <span>Pilot</span>
              <strong>{summary.pilotThisMonth}</strong>
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="filters">
            <label className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ara: ad, e-posta, telefon..."
              />
            </label>

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
              <option value="INVITED">Davet Edildi</option>
              <option value="REGISTERED">Kayıt Tamamlandı</option>
            </select>

            <button className="secondary-button" type="button">
              <Filter size={16} />
              Filtrele
            </button>

            <button className="secondary-button export-button" type="button">
              <Download size={16} />
              Dışa Aktar
            </button>
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          {loading ? (
            <div className="empty-state">Katılım talepleri yükleniyor...</div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">Gösterilecek katılım talebi bulunamadı.</div>
          ) : (
            <>
              <div className="desktop-table">
                <div className="table-head">
                  <span>Başvuru Sahibi</span>
                  <span>Tür</span>
                  <span>Rol</span>
                  <span>Tarih</span>
                  <span>Durum</span>
                  <span>İşlemler</span>
                </div>

                {filteredItems.map((item) => (
                  <article className="table-row" key={item.id}>
                    <div className="person-cell">
                      <div className="avatar soft">{initials(item.applicantName)}</div>
                      <div>
                        <strong>{item.applicantName}</strong>
                        <span>{item.applicantEmail}</span>
                        <small>{item.applicantPhone}</small>
                      </div>
                    </div>

                    <div className="badge-list">
                      {getTypeBadges(item).map((badge) => (
                        <span className={`badge ${badge === "Pilot" ? "pilot" : ""}`} key={badge}>
                          {badge}
                        </span>
                      ))}
                    </div>

                    <span className="role-text">{roleLabels[item.requestedRole] || item.requestedRole}</span>

                    <span className="date-text">{formatDate(item.createdAt)}</span>

                    <span className={`status-pill ${item.status.toLowerCase()}`}>
                      {statusLabels[item.status] || item.status}
                    </span>

                    <div className="row-actions">
                      <button onClick={() => openDetail(item)} title="Detay">
                        <Eye size={16} />
                      </button>
                      <button
                        className="approve"
                        disabled={busyId === item.id || item.status !== "PENDING"}
                        onClick={() => handleStatusChange(item.id, "APPROVED")}
                        title="Onayla"
                      >
                        <Check size={17} />
                      </button>
                      <button
                        className="reject"
                        disabled={busyId === item.id || item.status !== "PENDING"}
                        onClick={() => {
                          setSelected(item);
                          setNote(item.adminNote || "");
                        }}
                        title="Reddet"
                      >
                        <X size={17} />
                      </button>
                      <button onClick={() => openDetail(item)} title="Diğer">
                        <MoreHorizontal size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mobile-list">
                {filteredItems.map((item, index) => (
                  <article className={`mobile-card ${cardThemes[index % cardThemes.length]}`} key={item.id}>
                    <div className="mobile-card-main">
                      <div className="avatar soft">{initials(item.applicantName)}</div>

                      <div className="mobile-person">
                        <div className="mobile-name-row">
                          <strong>{item.applicantName}</strong>
                          <span className={`status-pill ${item.status.toLowerCase()}`}>
                            {statusLabels[item.status] || item.status}
                          </span>
                        </div>

                        <div className="mobile-line">
                          <span>{item.applicantEmail}</span>
                          <span>{item.applicantPhone}</span>
                        </div>

                        <div className="mobile-meta">
                          <span>{roleLabels[item.requestedRole] || item.requestedRole}</span>
                          <span>{formatDate(item.createdAt)}</span>
                          <span>{item.city || item.district ? `${item.city || ""} ${item.district || ""}` : "Konum yok"}</span>
                        </div>

                        <div className="mobile-bottom">
                          <div className="badge-list">
                            {getTypeBadges(item).map((badge) => (
                              <span className={`badge ${badge === "Pilot" ? "pilot" : ""}`} key={badge}>
                                {badge}
                              </span>
                            ))}
                          </div>

                          <div className="mobile-actions">
                            <button onClick={() => openDetail(item)}>
                              <Eye size={15} />
                            </button>
                            <button
                              className="approve"
                              disabled={busyId === item.id || item.status !== "PENDING"}
                              onClick={() => handleStatusChange(item.id, "APPROVED")}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="reject"
                              disabled={busyId === item.id || item.status !== "PENDING"}
                              onClick={() => {
                                setSelected(item);
                                setNote(item.adminNote || "");
                              }}
                            >
                              <X size={16} />
                            </button>
                            <button onClick={() => openDetail(item)}>
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="panel-footer">
                <span>Toplam {filteredItems.length} kayıt</span>
                <span>{summary.total} toplam başvuru</span>
              </div>
            </>
          )}
        </section>
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

            <div className="detail-grid">
              <div>
                <span>E-posta</span>
                <strong>{selected.applicantEmail}</strong>
              </div>
              <div>
                <span>Telefon</span>
                <strong>{selected.applicantPhone}</strong>
              </div>
              <div>
                <span>Şehir</span>
                <strong>
                  {selected.city || "-"} {selected.district || ""}
                </strong>
              </div>
              <div>
                <span>Başvuru Türü</span>
                <strong>{getTypeBadges(selected).join(" / ")}</strong>
              </div>
              <div>
                <span>Referans Kodu</span>
                <strong>{selected.referralCode || "-"}</strong>
              </div>
              <div>
                <span>Durum</span>
                <strong>{statusLabels[selected.status] || selected.status}</strong>
              </div>
            </div>

            {selected.message ? (
              <div className="message-box">
                <span>Başvuru Mesajı</span>
                <p>{selected.message}</p>
              </div>
            ) : null}

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
          letter-spacing: -0.04em;
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

        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          font-weight: 900;
          background: #0f172a;
          color: white;
          flex: 0 0 auto;
        }

        .avatar.soft {
          background: #eff6ff;
          color: #2563eb;
        }

        .avatar.large {
          width: 58px;
          height: 58px;
          border-radius: 22px;
          font-size: 18px;
        }

        .content {
          width: 100%;
          min-width: 0;
          padding: 24px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 18px;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
          text-decoration: none;
          font-weight: 800;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .top-actions button,
        .row-actions button,
        .mobile-actions button,
        .modal-close {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #0f172a;
          display: inline-grid;
          place-items: center;
          cursor: pointer;
          position: relative;
        }

        .top-actions small {
          position: absolute;
          top: -7px;
          right: -7px;
          background: #2563eb;
          color: white;
          border-radius: 999px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 900;
        }

        .mobile-title {
          display: none;
        }

        .page-title {
          text-align: center;
          margin-bottom: 24px;
        }

        .page-title h1,
        .mobile-title h1 {
          margin: 0;
          color: #071332;
          font-size: 28px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .page-title p {
          margin: 8px 0 0;
          color: #475569;
          font-size: 14px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .summary-card {
          min-height: 116px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
        }

        .summary-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          font-weight: 900;
          flex: 0 0 auto;
        }

        .summary-card.blue {
          background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
        }

        .summary-card.green {
          background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%);
        }

        .summary-card.red {
          background: linear-gradient(135deg, #ffffff 0%, #fff1f2 100%);
        }

        .summary-card.purple {
          background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
        }

        .summary-card.blue .summary-icon {
          background: #dbeafe;
          color: #2563eb;
        }

        .summary-card.green .summary-icon {
          background: #dcfce7;
          color: #16a34a;
        }

        .summary-card.red .summary-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .summary-card.purple .summary-icon {
          background: #ede9fe;
          color: #7c3aed;
        }

        .summary-card span {
          display: block;
          color: #0f172a;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .summary-card strong {
          display: block;
          margin-top: 6px;
          font-size: 26px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .panel {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .filters {
          padding: 14px;
          display: grid;
          grid-template-columns: minmax(220px, 1.2fr) repeat(3, minmax(140px, 0.6fr)) auto auto;
          gap: 10px;
          border-bottom: 1px solid #e2e8f0;
        }

        .search-box,
        .filters select,
        .secondary-button,
        .primary-button,
        .danger-button {
          min-height: 44px;
          border-radius: 15px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #0f172a;
          font-weight: 800;
          font-size: 14px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          color: #0f172a;
          font: inherit;
          background: transparent;
          min-width: 0;
        }

        .filters select {
          padding: 0 14px;
        }

        .secondary-button,
        .primary-button,
        .danger-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px;
          cursor: pointer;
        }

        .primary-button {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .danger-button {
          background: #fff7f7;
          border-color: #fecaca;
          color: #dc2626;
        }

        .error-box,
        .empty-state {
          margin: 14px;
          border-radius: 18px;
          padding: 16px;
          font-weight: 800;
          text-align: center;
        }

        .error-box {
          background: #fff7f7;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .empty-state {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .desktop-table {
          display: block;
        }

        .table-head,
        .table-row {
          display: grid;
          grid-template-columns: 1.45fr 0.9fr 0.75fr 0.75fr 0.65fr 0.65fr;
          gap: 14px;
          align-items: center;
          padding: 16px 22px;
        }

        .table-head {
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .table-row {
          border-top: 1px solid #e2e8f0;
          min-height: 92px;
        }

        .person-cell {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .person-cell strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .person-cell span,
        .person-cell small,
        .date-text {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          margin-top: 3px;
        }

        .badge-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .badge {
          border-radius: 9px;
          padding: 5px 7px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          line-height: 1;
        }

        .badge.pilot {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .role-text {
          color: #0f172a;
          font-size: 13px;
          font-weight: 850;
        }

        .status-pill {
          width: fit-content;
          border-radius: 9px;
          padding: 6px 8px;
          background: #fef3c7;
          color: #b45309;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          line-height: 1;
        }

        .status-pill.approved {
          background: #dcfce7;
          color: #15803d;
        }

        .status-pill.rejected {
          background: #fee2e2;
          color: #b91c1c;
        }

        .status-pill.invited,
        .status-pill.registered {
          background: #e0f2fe;
          color: #0369a1;
        }

        .row-actions,
        .mobile-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .row-actions button.approve,
        .mobile-actions button.approve {
          background: #ecfdf5;
          color: #16a34a;
          border-color: #bbf7d0;
        }

        .row-actions button.reject,
        .mobile-actions button.reject {
          background: #fff7f7;
          color: #dc2626;
          border-color: #fecaca;
        }

        button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .mobile-list {
          display: none;
        }

        .mobile-card {
          position: relative;
          overflow: hidden;
          margin: 8px 10px;
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
        }

        .mobile-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #2563eb;
        }

        .mobile-card.theme-blue {
          background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
        }

        .mobile-card.theme-blue::before {
          background: #2563eb;
        }

        .mobile-card.theme-green {
          background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
        }

        .mobile-card.theme-green::before {
          background: #16a34a;
        }

        .mobile-card.theme-purple {
          background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
        }

        .mobile-card.theme-purple::before {
          background: #7c3aed;
        }

        .mobile-card.theme-amber {
          background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
        }

        .mobile-card.theme-amber::before {
          background: #f59e0b;
        }

        .mobile-card.theme-cyan {
          background: linear-gradient(135deg, #ffffff 0%, #ecfeff 100%);
        }

        .mobile-card.theme-cyan::before {
          background: #06b6d4;
        }

        .mobile-card.theme-rose {
          background: linear-gradient(135deg, #ffffff 0%, #fff1f2 100%);
        }

        .mobile-card.theme-rose::before {
          background: #e11d48;
        }

        .mobile-card-main {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          min-width: 0;
        }

        .mobile-person {
          width: 100%;
          min-width: 0;
        }

        .mobile-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
        }

        .mobile-name-row strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #071332;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .mobile-line {
          margin-top: 3px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
          font-size: 11px;
          font-weight: 750;
          min-width: 0;
        }

        .mobile-line span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mobile-line span:first-child {
          max-width: 52%;
        }

        .mobile-meta {
          margin-top: 6px;
          display: grid;
          grid-template-columns: 0.8fr 0.9fr 1fr;
          gap: 6px;
          color: #64748b;
          font-size: 10.5px;
          font-weight: 850;
        }

        .mobile-meta span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mobile-bottom {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .mobile-actions {
          display: grid;
          grid-template-columns: repeat(4, 34px);
          gap: 6px;
        }

        .mobile-actions button {
          width: 34px;
          height: 32px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
        }

        .panel-footer {
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.32);
          display: grid;
          place-items: center;
          padding: 18px;
          z-index: 60;
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
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-right: 46px;
          margin-bottom: 18px;
        }

        .modal-header h2 {
          margin: 0;
          color: #071332;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .modal-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-weight: 800;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }

        .detail-grid div,
        .message-box,
        .note-box {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 14px;
          background: #f8fafc;
        }

        .detail-grid span,
        .message-box span,
        .note-box {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .detail-grid strong {
          display: block;
          margin-top: 6px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 900;
        }

        .message-box {
          margin-bottom: 14px;
        }

        .message-box p {
          margin: 8px 0 0;
          color: #0f172a;
          font-weight: 750;
          line-height: 1.5;
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
          color: #0f172a;
          font: inherit;
          background: white;
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 1120px) {
          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filters {
            grid-template-columns: 1fr 1fr;
          }

          .desktop-table {
            overflow-x: auto;
          }

          .table-head,
          .table-row {
            min-width: 920px;
          }
        }

        @media (max-width: 760px) {
          .admin-page {
            display: block;
            min-height: 100dvh;
            background: #f8fafc;
          }

          .sidebar {
            display: none;
          }

          .content {
            padding: 8px;
            padding-bottom: 76px;
          }

          .topbar {
            position: sticky;
            top: 0;
            z-index: 20;
            margin: -8px -8px 8px;
            padding: 8px 10px;
            min-height: 48px;
            background: rgba(248, 250, 252, 0.94);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid #e2e8f0;
          }

          .mobile-title {
            display: block;
            text-align: center;
          }

          .mobile-title h1 {
            font-size: 18px;
            letter-spacing: -0.03em;
          }

          .page-title {
            display: none;
          }

          .back-button {
            font-size: 12px;
            gap: 5px;
          }

          .top-actions {
            gap: 6px;
          }

          .top-actions button {
            width: 34px;
            height: 34px;
            border-radius: 13px;
          }

          .summary-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 6px;
            margin-bottom: 8px;
          }

          .summary-card {
            min-height: 58px;
            border-radius: 16px;
            padding: 7px 5px;
            display: grid;
            place-items: center;
            text-align: center;
            gap: 3px;
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
          }

          .summary-icon {
            width: 22px;
            height: 22px;
            border-radius: 8px;
            font-size: 11px;
          }

          .summary-card span {
            font-size: 9px;
            line-height: 1.05;
            white-space: normal;
            min-height: 18px;
            display: grid;
            place-items: center;
          }

          .summary-card strong {
            margin-top: 0;
            font-size: 17px;
            line-height: 1;
          }

          .panel {
            border-radius: 18px;
          }

          .filters {
            padding: 8px;
            grid-template-columns: 1fr 1fr 38px 38px;
            gap: 6px;
          }

          .search-box {
            grid-column: 1 / -1;
          }

          .filters select,
          .secondary-button,
          .search-box {
            min-height: 36px;
            height: 36px;
            border-radius: 13px;
            font-size: 11px;
          }

          .search-box {
            padding: 0 10px;
            gap: 7px;
          }

          .search-box input::placeholder {
            color: #94a3b8;
          }

          .filters select {
            padding: 0 9px;
            min-width: 0;
          }

          .secondary-button {
            padding: 0;
            gap: 0;
          }

          .secondary-button svg {
            width: 15px;
            height: 15px;
          }

          .secondary-button {
            font-size: 0;
          }

          .filters select:nth-of-type(3) {
            grid-column: span 2;
          }

          .desktop-table {
            display: none;
          }

          .mobile-list {
            display: block;
            padding-top: 4px;
          }

          .mobile-card .avatar {
            width: 34px;
            height: 34px;
            border-radius: 13px;
            font-size: 12px;
          }

          .badge {
            font-size: 8.5px;
            padding: 4px 5px;
            border-radius: 7px;
          }

          .status-pill {
            font-size: 8.5px;
            padding: 5px 6px;
            border-radius: 7px;
          }

          .panel-footer {
            padding: 8px 12px;
            font-size: 11px;
          }

          .error-box,
          .empty-state {
            margin: 8px;
            padding: 12px;
            font-size: 12px;
          }

          .detail-modal {
            border-radius: 22px;
            padding: 16px;
          }

          .modal-header h2 {
            font-size: 19px;
          }

          .detail-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .detail-grid div,
          .message-box,
          .note-box {
            border-radius: 16px;
            padding: 12px;
          }

          .modal-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}