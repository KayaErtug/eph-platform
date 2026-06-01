"use client";

import LinaPanel from "../../components/LinaPanel";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  Copy,
  Eye,
  Grid2X2,
  Home,
  List,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import StokPremiumStyles from "@/components/stok/StokPremiumStyles";
import StokKpiCards from "@/components/stok/StokKpiCards";
import StokToolbar from "@/components/stok/StokToolbar";
import StokTable from "@/components/stok/StokTable";
import StokCreateModal from "@/components/stok/StokCreateModal";
import type {
  Project,
  ProjectFormState,
  Unit,
  UnitFormState,
} from "@/components/stok/stokTypes";

type ViewMode = "cards" | "list";

const statusLabels: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  ON_SATIS: "Ön Satış",
  PROJE_ASAMASI: "Proje Aşaması",
  YAKINDA_SATISTA: "Yakında Satışta",
  INSAAT_HALINDE: "İnşaat Halinde",
  HEMEN_TESLIM: "Hemen Teslim",
  INSAAT_PROJESI: "İnşaat Projesi",
  SATILDI: "Satıldı",
  PASIF: "Pasif",
};

export default function StokPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linaOpen, setLinaOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [copiedUnitId, setCopiedUnitId] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectForm, setProjectForm] = useState<ProjectFormState>({
    name: "",
    city: "Denizli",
    district: "",
    address: "",
  });

  const [unitForm, setUnitForm] = useState<UnitFormState>({
    type: "DAIRE",
    floor: "",
    number: "",
    roomCount: "3+1",
    area: "",
    price: "",
    status: "SATILIK",
    description: "",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const canAddUnit =
    user?.role === "MUTEAHHIT" ||
    user?.role === "INSAAT_FIRMASI" ||
    user?.role === "ADMIN" ||
    user?.role === "EMLAKCI";

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.push("/giris");
      return;
    }

    fetchData();
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated || !user) return;

    fetchUnits();
  }, [statusFilter, cityFilter]);

  const fetchData = async () => {
    try {
      const [projectRes, unitRes] = await Promise.all([
        api.get("/projects"),
        api.get("/units"),
      ]);

      setProjects(projectRes.data || []);
      setUnits(unitRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    const params = new URLSearchParams();

    if (statusFilter) params.append("status", statusFilter);
    if (cityFilter) params.append("city", cityFilter);

    const res = await api.get(`/units?${params.toString()}`);

    setUnits(res.data || []);
  };

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");

    if (!q) return units;

    return units.filter((unit) => {
      const text = [
        unit.project?.name,
        unit.project?.city,
        unit.project?.district,
        unit.project?.address,
        unit.number,
        unit.type,
        unit.status,
        unit.roomCount,
        unit.description,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return text.includes(q);
    });
  }, [units, search]);

  const totalValue = useMemo(() => {
    return units.reduce((sum, unit) => sum + (Number(unit.price) || 0), 0);
  }, [units]);

  const verifiedCount = useMemo(() => {
    return units.filter(
      (unit) =>
        unit.isVerified ||
        (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified),
    ).length;
  }, [units]);

  const activeCount = useMemo(() => {
    return units.filter((unit) =>
      [
        "SATILIK",
        "KIRALIK",
        "ON_SATIS",
        "PROJE_ASAMASI",
        "YAKINDA_SATISTA",
        "INSAAT_PROJESI",
        "HEMEN_TESLIM",
      ].includes(unit.status),
    ).length;
  }, [units]);

  const myProjects = user?.role === "ADMIN" ? projects : [];

  const resetForm = () => {
    setSelectedProjectId("");

    setProjectForm({
      name: "",
      city: "Denizli",
      district: "",
      address: "",
    });

    setUnitForm({
      type: "DAIRE",
      floor: "",
      number: "",
      roomCount: "3+1",
      area: "",
      price: "",
      status: "SATILIK",
      description: "",
    });

    setFormError("");
    setFormSuccess(false);
  };

  const handleSubmit = async () => {
    setFormError("");
    setFormLoading(true);

    try {
      let projectId = selectedProjectId;

      if (!selectedProjectId) {
        if (
          !projectForm.name ||
          !projectForm.city ||
          !projectForm.district ||
          !projectForm.address
        ) {
          setFormError("Proje bilgilerini eksiksiz doldurun.");
          setFormLoading(false);
          return;
        }

        const projectRes = await api.post("/projects", projectForm);

        projectId = projectRes.data.id;
      }

      if (!unitForm.number || !unitForm.area || !unitForm.price) {
        setFormError("Birim numarası, alan ve fiyat zorunludur.");
        setFormLoading(false);
        return;
      }

      await api.post(`/units/project/${projectId}`, {
        type: unitForm.type,
        floor: unitForm.floor ? parseInt(unitForm.floor) : undefined,
        number: unitForm.number,
        roomCount: unitForm.roomCount || undefined,
        area: parseFloat(unitForm.area),
        price: parseFloat(unitForm.price),
        status: unitForm.status,
        description: unitForm.description || undefined,
      });

      setFormSuccess(true);
      await fetchData();

      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 900);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdminVerify = async (
    unitId: string,
    payload: {
      tapuVerified?: boolean;
      photoVerified?: boolean;
      yetkiVerified?: boolean;
      isOffMarket?: boolean;
    },
  ) => {
    try {
      await api.patch(`/units/${unitId}/verify`, payload);
      await fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Doğrulama işlemi yapılamadı.");
    }
  };

  const getShareUrl = (unit: Unit) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/stok/${unit.id}`;
  };

  const getShareText = (unit: Unit) => {
    const price = Number(unit.price || 0);
    const location = [unit.project?.district, unit.project?.city]
      .filter(Boolean)
      .join(" / ");

    return [
      unit.project?.name || "EPH Portföy",
      location,
      unit.roomCount ? `${unit.roomCount}` : "",
      unit.area ? `${unit.area} m²` : "",
      unit.status ? statusLabels[unit.status] || unit.status : "",
      price ? `${price.toLocaleString("tr-TR")} ₺` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  };

  const handleCopyShare = async (unit: Unit) => {
    const text = `${getShareText(unit)}\n${getShareUrl(unit)}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedUnitId(unit.id);
      setTimeout(() => setCopiedUnitId(""), 1600);
    } catch {
      alert("Paylaşım metni kopyalanamadı.");
    }
  };

  const handleNativeShare = async (unit: Unit) => {
    const url = getShareUrl(unit);
    const text = getShareText(unit);

    if (navigator.share) {
      await navigator.share({
        title: unit.project?.name || "EPH Portföy",
        text,
        url,
      });
      return;
    }

    await handleCopyShare(unit);
  };

  if (!hydrated || loading) {
    return (
      <div
        className="stock-page-v2"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#F7FBFF",
        }}
      >
        <StokPremiumStyles />

        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "3px solid #1557D6",
            borderTopColor: "transparent",
            animation: "spin .8s linear infinite",
          }}
        />

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FBFF] text-[#27364F]">
      <StokPremiumStyles />

      <header className="sticky top-0 z-50 border-b border-[#DDE7F3] bg-[#F7FBFF]/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-[52px_1fr_52px] items-center gap-3 lg:flex lg:gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[#DDE7F3] bg-white text-[#06194A] shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition hover:bg-[#EFF6FF]"
              aria-label="Dashboard'a dön"
            >
              <ArrowLeft size={20} />
            </button>

            <Link
              href="/dashboard"
              className="flex min-w-0 items-center justify-center gap-3 rounded-[24px] border border-[#DDE7F3] bg-white px-4 py-3 text-center no-underline shadow-[0_14px_40px_rgba(15,23,42,0.06)] lg:justify-start"
            >
              <img src="/LOGO_EPH.png" alt="EPH" className="h-10 w-10 object-contain" />
              <div className="min-w-0">
                <div className="truncate text-sm font-black tracking-[-0.03em] text-[#06194A]">
                  Stok / İlanlarım
                </div>
                <div className="truncate text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#64748B]">
                  Portföy Merkezi
                </div>
              </div>
            </Link>

            <button
              onClick={() => setLinaOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-[#DDE7F3] bg-white text-[#1557D6] shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition hover:bg-[#EFF6FF]"
              aria-label="Lina'yı aç"
            >
              <Sparkles size={19} />
            </button>
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {[
              ["/dashboard", "Dashboard"],
              ["/stok", "Stok"],
              ["/network", "Network"],
              ["/crm", "CRM"],
              ["/market", "Piyasa"],
              ["/profil", "Profil"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-extrabold no-underline transition ${
                  href === "/stok"
                    ? "bg-[#1557D6] text-white shadow-[0_16px_34px_rgba(21,87,214,0.24)]"
                    : "text-[#475569] hover:bg-white hover:text-[#1557D6]"
                }`}
              >
                {label}
              </Link>
            ))}

            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-full px-4 py-2 text-sm font-extrabold text-[#475569] no-underline transition hover:bg-white hover:text-[#1557D6]"
              >
                Admin
              </Link>
            )}

            <button
              className="rounded-full border border-[#DDE7F3] bg-white px-4 py-2 text-sm font-extrabold text-[#475569] transition hover:text-[#1557D6]"
              onClick={() => {
                logout();
                router.push("/giris");
              }}
            >
              Çıkış
            </button>
          </nav>
        </div>
      </header>

      <LinaPanel open={linaOpen} onClose={() => setLinaOpen(false)} />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6">
        <section className="relative overflow-hidden rounded-[32px] border border-[#DDE7F3] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(21,87,214,0.12),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(219,234,254,0.9),transparent_34%),linear-gradient(135deg,rgba(239,246,255,0.92),transparent_42%)]" />

          <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
            <div className="flex min-h-[330px] flex-col justify-between rounded-[28px] border border-[#DDE7F3] bg-[#F7FBFF]/86 p-5 text-center lg:p-7 lg:text-left">
              <div>
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#DDE7F3] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#1557D6] lg:mx-0">
                  <Building2 size={15} />
                  Canlı Portföy Yönetimi
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight tracking-[-0.05em] text-[#06194A] md:text-6xl">
                  Stok ve İlanlarım
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-8 text-[#475569] lg:mx-0">
                  Satılık, kiralık, proje, kat karşılığı ve off-market portföyleri
                  tek merkezden takip edin. Kartlar tıklanabilir, ilan detayına
                  gider ve paylaşım için hazırdır.
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                {canAddUnit && (
                  <button
                    onClick={() => {
                      resetForm();
                      setShowModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#1557D6] px-5 py-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(21,87,214,0.22)] transition hover:bg-[#0F49BD]"
                  >
                    <Plus size={18} />
                    Yeni Portföy Ekle
                  </button>
                )}

                <button
                  onClick={() => setLinaOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-[#DDE7F3] bg-white px-5 py-4 text-sm font-black text-[#1557D6] shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition hover:bg-[#EFF6FF]"
                >
                  <Sparkles size={18} />
                  Lina ile İlan Hazırla
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <HeroMetric
                  icon={<Home size={20} />}
                  label="Toplam Kayıt"
                  value={units.length.toLocaleString("tr-TR")}
                  note="Sistemdeki portföy"
                />

                <HeroMetric
                  icon={<TrendingUp size={20} />}
                  label="Aktif İlan"
                  value={activeCount.toLocaleString("tr-TR")}
                  note="Satış / kiralama akışı"
                />

                <HeroMetric
                  icon={<CheckCircle2 size={20} />}
                  label="Doğrulanmış"
                  value={verifiedCount.toLocaleString("tr-TR")}
                  note="Güven seviyesi"
                />

                <HeroMetric
                  icon={<Star size={20} />}
                  label="Toplam Değer"
                  value={
                    totalValue
                      ? `${(totalValue / 1000000).toFixed(1)}M ₺`
                      : "0 ₺"
                  }
                  note="Yaklaşık envanter"
                />
              </div>

              <div className="rounded-[28px] border border-[#DDE7F3] bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
                <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-[#1557D6]">
                  Hızlı Özet
                </p>

                <div className="mt-4 grid gap-3">
                  <SummaryLine
                    label="Gösterilen kayıt"
                    value={`${filteredUnits.length} / ${units.length}`}
                  />
                  <SummaryLine
                    label="Aktif kullanıcı"
                    value={`${user?.firstName || "EPH"} ${user?.lastName || ""}`}
                  />
                  <SummaryLine
                    label="Sayfa modu"
                    value={viewMode === "cards" ? "Kart görünümü" : "Liste görünümü"}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <StokKpiCards units={units} projects={projects} />
        </div>

        <section className="mt-6 rounded-[32px] border border-[#DDE7F3] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] lg:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-center lg:text-left">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
                Filtre Merkezi
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                Canlı İlan Listesi
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#64748B]">
                Her kart ilan detayına gider. Paylaş butonu ilan linkini hazırlar.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-[22px] border border-[#DDE7F3] bg-[#F7FBFF] p-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`inline-flex h-11 items-center gap-2 rounded-[18px] px-4 text-sm font-black transition ${
                  viewMode === "cards"
                    ? "bg-[#1557D6] text-white shadow-[0_14px_30px_rgba(21,87,214,0.22)]"
                    : "text-[#64748B] hover:bg-white hover:text-[#1557D6]"
                }`}
              >
                <Grid2X2 size={17} />
                Kart
              </button>

              <button
                onClick={() => setViewMode("list")}
                className={`inline-flex h-11 items-center gap-2 rounded-[18px] px-4 text-sm font-black transition ${
                  viewMode === "list"
                    ? "bg-[#1557D6] text-white shadow-[0_14px_30px_rgba(21,87,214,0.22)]"
                    : "text-[#64748B] hover:bg-white hover:text-[#1557D6]"
                }`}
              >
                <List size={17} />
                Liste
              </button>
            </div>
          </div>

          <StokToolbar
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
            visibleCount={filteredUnits.length}
            totalCount={units.length}
            onAdd={() => {
              resetForm();
              setShowModal(true);
            }}
            onLina={() => setLinaOpen(true)}
            canAddUnit={canAddUnit}
          />

          {viewMode === "cards" ? (
            <div className="mt-5 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredUnits.length === 0 ? (
                <EmptyInventory />
              ) : (
                filteredUnits.map((unit) => (
                  <PremiumUnitCard
                    key={unit.id}
                    unit={unit}
                    copied={copiedUnitId === unit.id}
                    onOpen={() => router.push(`/stok/${unit.id}`)}
                    onCopy={() => handleCopyShare(unit)}
                    onShare={() => handleNativeShare(unit)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[28px] border border-[#DDE7F3] bg-[#F7FBFF]">
              <div className="max-h-none overflow-x-auto">
                <StokTable units={filteredUnits} />
              </div>
            </div>
          )}
        </section>
      </main>

      <StokCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        projects={myProjects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        unitForm={unitForm}
        setUnitForm={setUnitForm}
        formError={formError}
        formSuccess={formSuccess}
        formLoading={formLoading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function HeroMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex min-h-[154px] flex-col justify-between rounded-[28px] border border-[#DDE7F3] bg-white p-5 text-center shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[20px] bg-[#EFF6FF] text-[#1557D6]">
        {icon}
      </div>
      <div>
        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
          {label}
        </p>
        <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#06194A]">
          {value}
        </p>
        <p className="mt-1 text-xs font-bold text-[#64748B]">{note}</p>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3">
      <span className="text-sm font-extrabold text-[#64748B]">{label}</span>
      <span className="text-right text-sm font-black text-[#06194A]">{value}</span>
    </div>
  );
}

function PremiumUnitCard({
  unit,
  copied,
  onOpen,
  onCopy,
  onShare,
}: {
  unit: Unit;
  copied: boolean;
  onOpen: () => void;
  onCopy: () => void;
  onShare: () => void;
}) {
  const verified =
    unit.isVerified ||
    (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified);
  const price = Number(unit.price || 0);
  const location =
    [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ") ||
    "Konum bilgisi yok";

  return (
    <article
      onClick={onOpen}
      className="group flex min-h-[430px] cursor-pointer flex-col justify-between overflow-hidden rounded-[30px] border border-[#DDE7F3] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:border-[#1557D6]/35 hover:shadow-[0_28px_70px_rgba(21,87,214,0.14)]"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#1557D6]">
              {statusLabels[unit.status] || unit.status || "Durum Yok"}
            </span>

            {verified && (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Onaylı
              </span>
            )}

            {unit.isOffMarket && (
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
                Off-Market
              </span>
            )}
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#F7FBFF] text-[#1557D6] transition group-hover:bg-[#1557D6] group-hover:text-white">
            <Eye size={18} />
          </div>
        </div>

        <h3 className="mt-5 line-clamp-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#06194A]">
          {unit.project?.name || "EPH Portföy"}
        </h3>

        <div className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-[#64748B] lg:justify-start">
          <MapPin size={16} />
          <span className="line-clamp-1">{location}</span>
        </div>

        <div className="mt-5 rounded-[26px] border border-[#DDE7F3] bg-[#F7FBFF] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
            İlan Değeri
          </p>
          <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#06194A]">
            {price ? `${price.toLocaleString("tr-TR")} ₺` : "Fiyat Yok"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <UnitInfo label="Tip" value={unit.type || "—"} />
          <UnitInfo label="Oda" value={unit.roomCount || "—"} />
          <UnitInfo label="Alan" value={unit.area ? `${unit.area} m²` : "—"} />
          <UnitInfo label="No" value={unit.number || "—"} />
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onShare();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#1557D6] px-4 py-3 text-sm font-black text-white transition hover:bg-[#0F49BD]"
        >
          <Share2 size={16} />
          Paylaş
        </button>

        <a
          onClick={(event) => event.stopPropagation()}
          href={`https://wa.me/?text=${encodeURIComponent(
            `${unit.project?.name || "EPH Portföy"} - ${location}`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-[#F7FBFF] px-4 py-3 text-sm font-black text-[#1557D6] no-underline transition hover:bg-[#EFF6FF]"
        >
          <MessageCircle size={16} />
          WhatsApp
        </a>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onCopy();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-white px-4 py-3 text-sm font-black text-[#475569] transition hover:bg-[#EFF6FF] hover:text-[#1557D6]"
        >
          <Copy size={16} />
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </article>
  );
}

function UnitInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[76px] rounded-[22px] border border-[#DDE7F3] bg-white p-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-2 line-clamp-1 text-sm font-black text-[#06194A]">
        {value}
      </p>
    </div>
  );
}

function EmptyInventory() {
  return (
    <div className="col-span-full rounded-[30px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#1557D6] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <Search size={22} />
      </div>
      <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
        Portföy kaydı bulunamadı
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-[#64748B]">
        Arama veya filtreleri değiştirerek tekrar deneyin.
      </p>
    </div>
  );
}