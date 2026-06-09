"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  Edit3,
  Eye,
  Heart,
  Loader2,
  Map as MapIcon,
  MapPin,
  MoreHorizontal,
  Navigation,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import StokCreateModal from "@/components/stok/StokCreateModal";
import PortfolioShareModal from "@/components/portfolio/PortfolioShareModal";
import type { PortfolioShareData } from "@/components/portfolio/PortfolioShareCard";
import type { LocalPortfolioImage, Project, ProjectFormState, Unit, UnitFormState } from "@/components/stok/stokTypes";

type SortMode = "newest" | "priceDesc" | "priceAsc";
type MapUnit = Unit & {
  project?: Unit["project"] & {
    latitude?: number | null;
    longitude?: number | null;
    mapAddress?: string | null;
    placeId?: string | null;
  };
};

const statusLabels: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük Kiralık",
  DEVREN_SATILIK: "Devren Satılık",
  DEVREN_KIRALIK: "Devren Kiralık",
  ON_SATIS: "Ön Satış",
  PROJE_ASAMASI: "Proje Aşaması",
  YAKINDA_SATISTA: "Yakında Satışta",
  INSAAT_HALINDE: "İnşaat Halinde",
  HEMEN_TESLIM: "Hemen Teslim",
  INSAAT_PROJESI: "İnşaat Projesi",
  KAT_KARSILIGI: "Kat Karşılığı",
  HASILAT_PAYLASIMLI: "Hasılat Paylaşımlı",
  REZERVE: "Rezerve",
  SATILDI: "Satıldı",
  KIRALANDI: "Kiralandı",
  PASIF: "Pasif",
};

const hotStatuses = ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "DEVREN_SATILIK", "DEVREN_KIRALIK", "ON_SATIS", "PROJE_ASAMASI", "YAKINDA_SATISTA", "INSAAT_PROJESI", "HEMEN_TESLIM"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const DEFAULT_CENTER = { lat: 37.783, lng: 29.096 };

declare global {
  interface Window {
    google?: any;
    ephPortfolioGoogleMapsReady?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function getMapsApiKey() {
  return GOOGLE_MAPS_API_KEY;

}

function loadGoogleMapsScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Tarayıcı ortamı bulunamadı."));
  if (window.google?.maps) return Promise.resolve();
  if (window.ephPortfolioGoogleMapsReady) return window.ephPortfolioGoogleMapsReady;

  const apiKey = getMapsApiKey();

  if (!apiKey) return Promise.reject(new Error("Google Maps API anahtarı tanımlı değil."));

  window.ephPortfolioGoogleMapsReady = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-eph-portfolio-google-maps="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Google Maps yüklenemedi.")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=tr&region=TR`;
    script.async = true;
    script.defer = true;
    script.dataset.ephPortfolioGoogleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps yüklenemedi."));
    document.head.appendChild(script);
  });

  return window.ephPortfolioGoogleMapsReady;
}

function parseFormattedNumber(value: string) {
  return Number(String(value || "").replace(/[^0-9]/g, ""));
}

function formatPrice(value?: number, currency?: string) {
  const numeric = Number(value || 0);
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";

  if (!numeric) return "Fiyat yok";

  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function formatCompactPrice(value?: number, currency?: string) {
  const numeric = Number(value || 0);
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";

  if (!numeric) return "—";

  if (numeric >= 1000000) {
    const compact = numeric / 1000000;
    return `${compact.toLocaleString("tr-TR", { maximumFractionDigits: compact >= 10 ? 0 : 1 })}M ${symbol}`;
  }

  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function getUnitImages(unit?: Unit | null) {
  const images = Array.isArray(unit?.images) ? unit.images : [];

  return images
    .filter((image) => image?.url || image?.supabaseUrl)
    .map((image) => ({ ...image, displayUrl: image.supabaseUrl || image.url || "" }))
    .sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      if ((a.sortOrder || 0) !== (b.sortOrder || 0)) return (a.sortOrder || 0) - (b.sortOrder || 0);
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
}

function getUnitCoverImage(unit?: Unit | null) {
  const images = getUnitImages(unit);
  return images.find((image) => image.isCover)?.displayUrl || images[0]?.displayUrl || "";
}

function isUnitVerified(unit?: Unit | null) {
  return Boolean(unit?.isVerified || (unit?.tapuVerified && unit?.photoVerified && unit?.yetkiVerified));
}

function formatFloorInfo(unit: Pick<Unit, "floor" | "floorLabel" | "totalFloors">) {
  const floorText = unit.floorLabel || (unit.floor != null ? `${unit.floor}. Kat` : "Kat yok");
  const totalText = unit.totalFloors ? `${unit.totalFloors} Katlı` : "";
  return totalText ? `${floorText} / ${totalText}` : floorText;
}

function getPortfolioNo(unit: Unit) {
  const raw = String(unit.id || "EPH").replace(/[^a-zA-Z0-9]/g, "");
  return `EPH-${raw.slice(0, 4).toLocaleUpperCase("tr-TR") || "PORT"}-${raw.slice(-4).toLocaleUpperCase("tr-TR") || "0001"}`;
}

function getShareUrl(unit: Unit) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/stok/${unit.id}`;
}

function makeWhatsappLocationText(unit: MapUnit) {
  const lat = unit.project?.latitude;
  const lng = unit.project?.longitude;
  const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : getShareUrl(unit);
  const location = [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ");

  return [
    "Merhaba, size EPH üzerinden portföy konumu gönderiyorum.",
    "",
    `Portföy: ${unit.project?.name || "EPH Portföy"}`,
    location ? `Konum: ${location}` : "",
    unit.price ? `Fiyat: ${formatPrice(unit.price, unit.priceCurrency)}` : "",
    "",
    `Harita: ${mapsUrl}`,
  ]
    .filter((item) => item !== "")
    .join("\n");
}

export default function StokPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuthStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<MapUnit[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSelectedUnitId, setMapSelectedUnitId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<PortfolioShareData | null>(null);
  const [deletingUnitId, setDeletingUnitId] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectForm, setProjectForm] = useState<ProjectFormState>({ name: "", city: "Denizli", district: "", address: "" });
  const [unitForm, setUnitForm] = useState<UnitFormState>({
    type: "DAIRE",
    floor: "",
    floorLabel: "",
    totalFloors: "",
    number: "",
    roomCount: "3+1",
    area: "",
    price: "",
    priceCurrency: "TRY",
    status: "SATILIK",
    description: "",
  });
  const [coverImage, setCoverImage] = useState<LocalPortfolioImage | null>(null);
  const [galleryImages, setGalleryImages] = useState<LocalPortfolioImage[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const canAddUnit = user?.role === "MUTEAHHIT" || user?.role === "INSAAT_FIRMASI" || user?.role === "ADMIN" || user?.role === "EMLAKCI";

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push("/giris");
      return;
    }
    fetchData();
  }, [hydrated, user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectRes, unitRes] = await Promise.all([api.get("/projects"), api.get("/units")]);
      setProjects(projectRes.data || []);
      setUnits(unitRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");

    let list = units.filter((unit) => {
      if (statusFilter && unit.status !== statusFilter) return false;
      if (cityFilter && unit.project?.city !== cityFilter) return false;
      if (!q) return true;

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

    list = [...list].sort((a, b) => {
      if (sortMode === "priceDesc") return Number(b.price || 0) - Number(a.price || 0);
      if (sortMode === "priceAsc") return Number(a.price || 0) - Number(b.price || 0);
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

    return list;
  }, [cityFilter, search, sortMode, statusFilter, units]);

  const mapUnits = useMemo(() => {
    return filteredUnits.filter((unit) => Number(unit.project?.latitude) && Number(unit.project?.longitude));
  }, [filteredUnits]);

  const activeCount = useMemo(() => units.filter((unit) => hotStatuses.includes(unit.status)).length, [units]);
  const rentCount = useMemo(() => units.filter((unit) => String(unit.status || "").includes("KIRALIK")).length, [units]);
  const saleCount = useMemo(() => units.filter((unit) => String(unit.status || "").includes("SATILIK") || unit.status === "SATILIK").length, [units]);
  const averageValue = useMemo(() => {
    if (!units.length) return 0;
    return Math.round(units.reduce((sum, unit) => sum + (Number(unit.price) || 0), 0) / units.length);
  }, [units]);
  const uniqueCities = useMemo(() => Array.from(new Set(units.map((unit) => unit.project?.city).filter((city): city is string => Boolean(city)))).sort((a, b) => a.localeCompare(b, "tr")), [units]);

  const resetSelectedImages = () => {
    if (coverImage?.previewUrl) URL.revokeObjectURL(coverImage.previewUrl);
    galleryImages.forEach((image) => {
      if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
    });
    setCoverImage(null);
    setGalleryImages([]);
  };

  const resetForm = () => {
    setSelectedProjectId("");
    setProjectForm({ name: "", city: "Denizli", district: "", address: "" } as ProjectFormState);
    setUnitForm({
      type: "DAIRE",
      floor: "",
      floorLabel: "",
      totalFloors: "",
      number: "",
      roomCount: "3+1",
      area: "",
      price: "",
      priceCurrency: "TRY",
      status: "SATILIK",
      description: "",
    });
    setFormError("");
    setFormSuccess(false);
    resetSelectedImages();
  };

  const uploadPortfolioImage = async (unitId: string, file: File, isCover: boolean, sortOrder: number) => {
    const payload = new FormData();
    payload.append("portfolioId", unitId);
    payload.append("isCover", isCover ? "true" : "false");
    payload.append("sortOrder", String(sortOrder));
    payload.append("file", file);

    return api.post("/portfolio-images/upload", payload, { headers: { "Content-Type": "multipart/form-data" } });
  };

  const handleSubmit = async () => {
    setFormError("");
    setFormLoading(true);

    try {
      let projectId = selectedProjectId;

      if (!selectedProjectId) {
        if (!projectForm.name || !projectForm.city || !projectForm.district || !projectForm.address) {
          setFormError("Proje bilgilerini eksiksiz doldurun.");
          setFormLoading(false);
          return;
        }

        const projectRes = await api.post("/projects", {
          ...(projectForm as any),
          latitude: (projectForm as any).latitude ?? null,
          longitude: (projectForm as any).longitude ?? null,
          mapAddress: (projectForm as any).mapAddress ?? null,
          placeId: (projectForm as any).placeId ?? null,
        });

        projectId = projectRes.data.id;
      }

      const numericPrice = parseFormattedNumber(unitForm.price);

      if (!unitForm.number || !unitForm.area || !numericPrice) {
        setFormError("Birim numarası, alan ve fiyat zorunludur.");
        setFormLoading(false);
        return;
      }

      if (!coverImage) {
        setFormError("Kapak fotoğrafı zorunludur.");
        setFormLoading(false);
        return;
      }

      const unitRes = await api.post(`/units/project/${projectId}`, {
        type: unitForm.type,
        floor: unitForm.floor ? parseInt(unitForm.floor, 10) : undefined,
        floorLabel: unitForm.floorLabel || undefined,
        totalFloors: unitForm.totalFloors ? parseInt(unitForm.totalFloors, 10) : undefined,
        number: unitForm.number,
        roomCount: unitForm.roomCount || undefined,
        area: parseFloat(unitForm.area),
        price: numericPrice,
        priceCurrency: unitForm.priceCurrency || "TRY",
        status: unitForm.status,
        description: unitForm.description || undefined,
      });

      const createdUnitId = unitRes.data?.id;

      if (!createdUnitId) {
        setFormError("Portföy oluşturuldu ancak görsel yükleme için unitId alınamadı.");
        setFormLoading(false);
        return;
      }

      await uploadPortfolioImage(createdUnitId, coverImage.file, true, 0);

      if (galleryImages.length > 0) {
        await Promise.all(galleryImages.map((image, index) => uploadPortfolioImage(createdUnitId, image.file, false, index + 1)));
      }

      setFormSuccess(true);
      await fetchData();

      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 700);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setFormLoading(false);
    }
  };

  const getPortfolioShareData = (unit: MapUnit): PortfolioShareData => {
    const title = unit.project?.name || "EPH Portföy";
    const location = [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ") || "Konum bilgisi yok";

    return {
      id: unit.id,
      title,
      location,
      price: unit.price ? formatPrice(unit.price, unit.priceCurrency) : "Fiyat bilgisi yok",
      roomCount: unit.roomCount || "—",
      area: unit.area ? `${unit.area} m²` : "—",
      floor: formatFloorInfo(unit),
      authorization: unit.yetkiVerified || unit.isVerified ? "Yetkili" : "Kontrol",
      coverImage: getUnitCoverImage(unit) || "/LOGO_EPH.png",
      consultantName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "EPH Üyesi",
      consultantPhone: "Telefon bilgisi",
      portfolioNo: getPortfolioNo(unit),
      score: 86,
      scoreLabel: "Çok İyi",
      shortDescription: unit.description || "Yetkili portföy statüsünde paylaşım için hazır gayrimenkul kaydı.",
      longDescription: unit.description || "Bu portföy EPH Portföy Merkezi üzerinden hazırlanmıştır.",
      features: [
        { icon: "security", label: unit.yetkiVerified || unit.isVerified ? "Yetkili Portföy" : "Yetki Kontrol" },
        { icon: "smart", label: "Lina Kartı" },
        { icon: "car", label: "Portföy Kaydı" },
        { icon: "pool", label: statusLabels[unit.status] || unit.status || "Portföy" },
      ],
    };
  };

  const handlePortfolioShare = (unit: MapUnit) => {
    setShareData(getPortfolioShareData(unit));
    setShareOpen(true);
  };

  const handleDeleteUnit = async (unit: MapUnit) => {
    if (!confirm("Bu portföyü silmek istiyor musunuz?")) return;

    try {
      setDeletingUnitId(unit.id);
      await api.delete(`/units/${unit.id}`);
      setUnits((current) => current.filter((item) => item.id !== unit.id));
    } catch (error: any) {
      alert(error?.response?.data?.message || "Portföy silinemedi.");
    } finally {
      setDeletingUnitId("");
    }
  };

  const handleWhatsappLocation = (unit: MapUnit) => {
    const text = encodeURIComponent(makeWhatsappLocationText(unit));
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FBFF] text-[#06194A]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={32} />
          <p className="mt-3 text-[12px] font-black text-[#64748B]">Portföy merkezi yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FBFF] pb-28 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] px-3 pt-3">
        <section className="rounded-[28px] border border-[#DDE7F3] bg-white p-3 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F8FBFF] text-[#06194A]">
              <SlidersHorizontal size={20} />
            </button>
            <div className="text-center">
              <h1 className="text-[22px] font-black tracking-[-0.05em] text-[#06194A]">PORTFÖY</h1>
              <p className="text-[10px] font-bold text-[#64748B]">Harita + ultra compact liste</p>
            </div>
            <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F8FBFF] text-[#06194A]">
              <Bell size={20} />
              <span className="absolute right-2 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">3</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_1fr_72px] gap-2">
            <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className="h-10 rounded-[16px] border border-[#DDE7F3] bg-white px-2 text-center text-[12px] font-black outline-none">
              <option value="">Tüm Şehirler</option>
              {uniqueCities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-[16px] border border-[#DDE7F3] bg-white px-2 text-center text-[12px] font-black outline-none">
              <option value="">Tümü</option>
              <option value="SATILIK">Satılık</option>
              <option value="KIRALIK">Kiralık</option>
            </select>
            <button type="button" onClick={() => setSortMode((current) => current === "newest" ? "priceDesc" : current === "priceDesc" ? "priceAsc" : "newest")} className="h-10 rounded-[16px] border border-[#DDE7F3] bg-white text-[12px] font-black">
              Sırala
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-[#F8FBFF] px-3 py-2">
            <Search size={17} className="text-[#64748B]" />
            <input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Portföy, şehir, ilçe ara..." className="h-8 min-w-0 flex-1 bg-transparent text-[13px] font-bold outline-none placeholder:text-[#94A3B8]" />
            {search && <button type="button" onClick={() => setSearch("")}><X size={16} /></button>}
          </div>

          <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-[18px] border border-[#E2EAF5] bg-white text-center">
            <MiniMetric label="Portföy" value={units.length} />
            <MiniMetric label="Ort. Fiyat" value={averageValue ? formatCompactPrice(averageValue) : "0"} tone="green" />
            <MiniMetric label="Satılık" value={saleCount} tone="blue" />
            <MiniMetric label="Kiralık" value={rentCount} tone="orange" />
          </div>
        </section>

        <button type="button" onClick={() => setMapOpen((current) => !current)} className="mt-3 flex h-13 min-h-[52px] w-full items-center justify-between rounded-[22px] border border-[#DDE7F3] bg-white px-4 text-[14px] font-black shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <span className="inline-flex items-center gap-2"><MapIcon size={19} className="text-[#1557D6]" /> {mapOpen ? "Haritayı Kapat" : "Haritayı Göster"}</span>
          <ChevronDown size={19} className={mapOpen ? "rotate-180 transition" : "transition"} />
        </button>

        {mapOpen && (
          <section className="mt-3 overflow-hidden rounded-[26px] border border-[#DDE7F3] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            <PortfolioMap
              units={mapUnits}
              selectedUnitId={mapSelectedUnitId}
              onSelectUnit={(unitId) => setMapSelectedUnitId(unitId)}
            />
            <div className="flex items-center justify-between px-3 py-2 text-[12px] font-black text-[#64748B]">
              <span>{mapUnits.length} konumlu portföy</span>
              <span>Sırala: En Yeni</span>
            </div>
          </section>
        )}

        <section className="mt-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[13px] font-black text-[#64748B]">{filteredUnits.length} portföy listeleniyor</p>
            <button type="button" onClick={() => { resetForm(); setShowModal(true); }} disabled={!canAddUnit} className="inline-flex h-10 items-center gap-1 rounded-[18px] bg-[#1557D6] px-3 text-[12px] font-black text-white disabled:opacity-50">
              <Plus size={17} /> Yeni Portföy
            </button>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="rounded-[26px] border border-[#DDE7F3] bg-white p-6 text-center shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
              <Building2 className="mx-auto text-[#1557D6]" size={34} />
              <h2 className="mt-3 text-[20px] font-black">Portföy bulunamadı</h2>
              <p className="mt-2 text-[13px] font-bold leading-5 text-[#64748B]">Filtreleri temizleyin veya yeni portföy ekleyin.</p>
            </div>
          ) : (
            filteredUnits.map((unit) => (
              <CompactPortfolioCard
                key={unit.id}
                unit={unit}
                selected={mapSelectedUnitId === unit.id}
                deleting={deletingUnitId === unit.id}
                onOpen={() => router.push(`/stok/${unit.id}`)}
                onUpdate={() => router.push(`/stok/${unit.id}`)}
                onShare={() => handlePortfolioShare(unit)}
                onDelete={() => handleDeleteUnit(unit)}
                onWhatsappLocation={() => handleWhatsappLocation(unit)}
              />
            ))
          )}
        </section>
      </div>

      <button type="button" onClick={() => { resetForm(); setShowModal(true); }} className="fixed bottom-[86px] left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-[#1557D6] text-white shadow-[0_18px_38px_rgba(21,87,214,0.34)]">
        <Plus size={28} />
      </button>

      <StokCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        unitForm={unitForm}
        setUnitForm={setUnitForm}
        formError={formError}
        formSuccess={formSuccess}
        formLoading={formLoading}
        coverImage={coverImage}
        setCoverImage={setCoverImage}
        galleryImages={galleryImages}
        setGalleryImages={setGalleryImages}
        onSubmit={handleSubmit}
      />

      <PortfolioShareModal open={shareOpen} data={shareData} onClose={() => setShareOpen(false)} />
    </main>
  );
}

function MiniMetric({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "slate" | "green" | "blue" | "orange" }) {
  const color = tone === "green" ? "text-emerald-600" : tone === "blue" ? "text-[#1557D6]" : tone === "orange" ? "text-orange-600" : "text-[#06194A]";

  return (
    <div className="border-r border-[#E2EAF5] px-1.5 py-2 last:border-r-0">
      <p className={`text-[15px] font-black leading-none ${color}`}>{value}</p>
      <p className="mt-1 text-[9px] font-black text-[#64748B]">{label}</p>
    </div>
  );
}

function CompactPortfolioCard({
  unit,
  selected,
  deleting,
  onOpen,
  onUpdate,
  onShare,
  onDelete,
  onWhatsappLocation,
}: {
  unit: MapUnit;
  selected: boolean;
  deleting: boolean;
  onOpen: () => void;
  onUpdate: () => void;
  onShare: () => void;
  onDelete: () => void;
  onWhatsappLocation: () => void;
}) {
  const image = getUnitCoverImage(unit) || "/LOGO_EPH.png";
  const status = statusLabels[unit.status] || unit.status || "Portföy";
  const location = [unit.project?.address, unit.project?.district].filter(Boolean).join(" · ") || unit.project?.city || "Konum yok";
  const hasLocation = Boolean(unit.project?.latitude && unit.project?.longitude);

  return (
    <article className={`grid min-h-[116px] grid-cols-[92px_1fr_44px] gap-2 rounded-[22px] border bg-white p-2 shadow-[0_10px_26px_rgba(15,23,42,0.045)] ${selected ? "border-[#1557D6] ring-2 ring-blue-100" : "border-[#DDE7F3]"}`}>
      <button type="button" onClick={onOpen} className="relative h-[100px] overflow-hidden rounded-[18px] bg-[#EEF5FF]">
        <img src={image} alt={unit.project?.name || "Portföy"} className="h-full w-full object-cover" />
        <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[8.5px] font-black text-white ${unit.status === "KIRALIK" ? "bg-[#1557D6]" : "bg-emerald-600"}`}>{status}</span>
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/62 px-1.5 py-0.5 text-[9px] font-black text-white">📷 {getUnitImages(unit).length}</span>
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-black tracking-[-0.03em] text-[#06194A]">{unit.project?.name || "EPH Portföy"}</h2>
            <p className="mt-0.5 truncate text-[11px] font-bold text-[#64748B]">{location}</p>
          </div>
          <Heart size={18} className="shrink-0 text-[#94A3B8]" />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-black text-[#06194A]">
          {unit.roomCount && <span>{unit.roomCount}</span>}
          {unit.area && <span>{unit.area} m²</span>}
          <span>{formatFloorInfo(unit)}</span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className={`text-[15px] font-black ${unit.status === "KIRALIK" ? "text-[#1557D6]" : "text-emerald-600"}`}>{formatPrice(unit.price, unit.priceCurrency)}</p>
          {isUnitVerified(unit) && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">Yetkili</span>}
        </div>

        <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-[#64748B]">
          <span className="inline-flex items-center gap-1"><Eye size={12} /> Aç</span>
          <span className="inline-flex items-center gap-1"><Edit3 size={12} /> Güncelle</span>
          {hasLocation && <span className="inline-flex items-center gap-1 text-emerald-700"><MapPin size={12} /> Konumlu</span>}
        </div>
      </button>

      <div className="flex flex-col items-center justify-between gap-1">
        <button type="button" onClick={onOpen} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1557D6]"><Eye size={15} /></button>
        <button type="button" onClick={onUpdate} className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[#1557D6]"><Edit3 size={15} /></button>
        <button type="button" onClick={hasLocation ? onWhatsappLocation : onShare} className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">{hasLocation ? <Navigation size={15} /> : <Share2 size={15} />}</button>
        <button type="button" onClick={onDelete} disabled={deleting} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 disabled:opacity-50">{deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button>
      </div>
    </article>
  );
}

function PortfolioMap({ units, selectedUnitId, onSelectUnit }: { units: MapUnit[]; selectedUnitId: string; onSelectUnit: (unitId: string) => void }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setError("");

    loadGoogleMapsScript()
      .then(() => {
        if (!alive || !window.google?.maps || !mapRef.current) return;

        const firstUnit = units[0];
        const center = firstUnit?.project?.latitude && firstUnit?.project?.longitude
          ? { lat: Number(firstUnit.project.latitude), lng: Number(firstUnit.project.longitude) }
          : DEFAULT_CENTER;

        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
        });
      })
      .catch((err: Error) => setError(err.message || "Harita yüklenemedi."))
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      markersRef.current.forEach((marker) => marker.setMap?.(null));
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!googleMapRef.current || !window.google?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap?.(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    units.forEach((unit) => {
      const lat = Number(unit.project?.latitude || 0);
      const lng = Number(unit.project?.longitude || 0);

      if (!lat || !lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        label: {
          text: formatCompactPrice(unit.price, unit.priceCurrency).replace(" ₺", "₺"),
          color: "white",
          fontWeight: "900",
          fontSize: "11px",
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: selectedUnitId === unit.id ? 18 : 15,
          fillColor: unit.status === "KIRALIK" ? "#1557D6" : "#059669",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: unit.project?.name || "EPH Portföy",
      });

      marker.addListener("click", () => onSelectUnit(unit.id));
      markersRef.current.push(marker);
      bounds.extend({ lat, lng });
    });

    if (units.length > 0 && !bounds.isEmpty()) googleMapRef.current.fitBounds(bounds, 56);
  }, [onSelectUnit, selectedUnitId, units]);

  return (
    <div className="relative h-[360px] bg-[#EEF5FF]">
      <div ref={mapRef} className="h-full w-full" />
      {(loading || error) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/76 backdrop-blur-sm">
          <div className="max-w-[260px] text-center">
            {loading && <Loader2 className="mx-auto animate-spin text-[#1557D6]" size={28} />}
            <p className="mt-2 text-[12px] font-black text-[#64748B]">{error || "Google Maps yükleniyor..."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
