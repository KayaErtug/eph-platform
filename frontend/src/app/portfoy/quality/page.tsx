"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type PortfolioAuthorityType =
  | "YETKI_BELGESI"
  | "TAPU"
  | "TAPU_SAHIBI_KIMLIK"
  | "KAT_KARSILIGI_SOZLESMESI"
  | "DIGER_DOGRULAMA_EVRAKI"
  | "ARSA_TAPUSU"
  | "YAPI_RUHSATI"
  | "MIMARI_PROJE"
  | "ISKAN_BELGESI"
  | "VERGI_LEVHASI"
  | "YETKI_BELGELERI"
  | "OFIS_EVRAKLARI"
  | "SOZLESMELER"
  | "PERSONEL_EVRAKLARI"
  | "TAKIM_EVRAKLARI"
  | "RAPORLAR"
  | "PERFORMANS_BELGELERI";

type PortfolioDocument = {
  id?: string;
  authorityType?: PortfolioAuthorityType;
  fileUrl?: string | null;
  fileName?: string | null;
  originalName?: string | null;
  sizeBytes?: number | null;
  approved?: boolean | null;
  createdAt?: string | null;
};

type PortfolioUnit = {
  id: string;
  type?: string | null;
  status?: string | null;
  roomCount?: string | null;
  area?: number | string | null;
  price?: number | string | null;
  priceCurrency?: string | null;
  isVerified?: boolean | null;
  tapuVerified?: boolean | null;
  yetkiVerified?: boolean | null;
  photoVerified?: boolean | null;
  approvalStatus?: string | null;
  project?: {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    district?: string | null;
    address?: string | null;
  } | null;
};

type DocumentDefinition = {
  type: PortfolioAuthorityType;
  title: string;
  description: string;
  required?: boolean;
};

type DocumentStatusTone = "waiting" | "uploaded" | "reviewing" | "verified";

type RoleDocumentTemplateKey = "EMLAKCI" | "MUTEAHHIT" | "INSAAT_FIRMASI" | "OFIS_SAHIBI" | "TAKIM_LIDERI";

function getDocumentStatus(
  document: PortfolioDocument | undefined,
  unit?: PortfolioUnit | null,
): { label: string; tone: DocumentStatusTone } {
  if (!document?.fileUrl) return { label: "Evrak Bekleniyor", tone: "waiting" };
  if (document?.approved) return { label: "Doğrulandı", tone: "verified" };

  const approvalStatus = String(unit?.approvalStatus || "").toUpperCase();
  if (["INCELEMEYE_GONDERILDI", "INCELEMEDE", "EKSIK_BILGI_BEKLENIYOR"].includes(approvalStatus)) {
    return { label: "İncelemede", tone: "reviewing" };
  }

  return { label: "Yüklendi", tone: "uploaded" };
}

function getStatusBadgeClass(tone: DocumentStatusTone) {
  if (tone === "verified") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "reviewing") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "uploaded") return "border-blue-200 bg-blue-50 text-[#2563EB]";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

const DOCUMENT_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

const ROLE_DOCUMENTS: Record<RoleDocumentTemplateKey, DocumentDefinition[]> = {
  EMLAKCI: [
    {
      type: "YETKI_BELGESI",
      title: "Yetki Belgesi",
      description: "Portföy temsil yetkisini gösteren belge.",
      required: true,
    },
    {
      type: "TAPU",
      title: "Tapu",
      description: "Portföyün tapu veya mülkiyet evrakı.",
      required: true,
    },
    {
      type: "TAPU_SAHIBI_KIMLIK",
      title: "Tapu Sahibi Kimlik",
      description: "Tapu sahibine ait kimlik doğrulama evrakı.",
    },
    {
      type: "DIGER_DOGRULAMA_EVRAKI",
      title: "Diğer Evrak",
      description: "Doğrulamaya yardımcı ek belge.",
    },
  ],
  MUTEAHHIT: [
    {
      type: "ARSA_TAPUSU",
      title: "Arsa Tapusu",
      description: "Proje arsasına ait tapu evrakı.",
      required: true,
    },
    {
      type: "YAPI_RUHSATI",
      title: "Yapı Ruhsatı",
      description: "İlgili projeye ait resmi yapı ruhsatı.",
      required: true,
    },
    {
      type: "MIMARI_PROJE",
      title: "Mimari Proje",
      description: "Onaylı mimari proje dosyası.",
    },
    {
      type: "KAT_KARSILIGI_SOZLESMESI",
      title: "Kat Karşılığı Sözleşmesi",
      description: "Arsa sahibi ile yapılan kat karşılığı sözleşmesi.",
    },
    {
      type: "ISKAN_BELGESI",
      title: "İskan Belgesi",
      description: "Yapı kullanım izin belgesi.",
    },
    {
      type: "DIGER_DOGRULAMA_EVRAKI",
      title: "Diğer Evrak",
      description: "Projeye ait ek doğrulama evrakı.",
    },
  ],
  INSAAT_FIRMASI: [
    {
      type: "VERGI_LEVHASI",
      title: "Vergi Levhası",
      description: "Firmaya ait güncel vergi levhası.",
      required: true,
    },
    {
      type: "YAPI_RUHSATI",
      title: "Yapı Ruhsatı",
      description: "Projeye ait resmi yapı ruhsatı.",
      required: true,
    },
    {
      type: "MIMARI_PROJE",
      title: "Mimari Proje",
      description: "Onaylı mimari proje dosyası.",
    },
    {
      type: "ISKAN_BELGESI",
      title: "İskan Belgesi",
      description: "Yapı kullanım izin belgesi.",
    },
    {
      type: "DIGER_DOGRULAMA_EVRAKI",
      title: "Diğer Evrak",
      description: "Firmaya veya projeye ait ek evrak.",
    },
  ],
  OFIS_SAHIBI: [
    {
      type: "YETKI_BELGELERI",
      title: "Yetki Belgeleri",
      description: "Ofis ve danışmanlık yetkilerini gösteren belgeler.",
      required: true,
    },
    {
      type: "OFIS_EVRAKLARI",
      title: "Ofis Evrakları",
      description: "Ofis kaydı ve operasyon evrakları.",
    },
    {
      type: "SOZLESMELER",
      title: "Sözleşmeler",
      description: "Ofise ait sözleşme dosyaları.",
    },
    {
      type: "PERSONEL_EVRAKLARI",
      title: "Personel Evrakları",
      description: "Ofis ekibiyle ilgili personel evrakları.",
    },
    {
      type: "DIGER_DOGRULAMA_EVRAKI",
      title: "Diğer Evrak",
      description: "Ofis doğrulamasına yardımcı ek belge.",
    },
  ],
  TAKIM_LIDERI: [
    {
      type: "TAKIM_EVRAKLARI",
      title: "Takım Evrakları",
      description: "Takım yapısı ve operasyonuna ait evraklar.",
      required: true,
    },
    {
      type: "RAPORLAR",
      title: "Raporlar",
      description: "Takım faaliyet ve takip raporları.",
    },
    {
      type: "PERFORMANS_BELGELERI",
      title: "Performans Belgeleri",
      description: "Takım performansına ait değerlendirme belgeleri.",
    },
    {
      type: "DIGER_DOGRULAMA_EVRAKI",
      title: "Diğer Evrak",
      description: "Takım doğrulamasına yardımcı ek belge.",
    },
  ],
};

function getUserDocumentTemplateKey(user?: any): RoleDocumentTemplateKey {
  const role = String(user?.role || "").toUpperCase();
  const capabilities = Array.isArray(user?.capabilities) ? user.capabilities.map((item: unknown) => String(item).toUpperCase()) : [];
  const capabilityNames = Array.isArray(user?.userCapabilities)
    ? user.userCapabilities.map((item: any) => String(item?.capability || item?.name || item).toUpperCase())
    : [];
  const allCapabilities = [...capabilities, ...capabilityNames];

  if (allCapabilities.includes("OFFICE_OWNER") || role === "OFIS_SAHIBI" || role === "OFFICE_OWNER") return "OFIS_SAHIBI";
  if (allCapabilities.includes("TEAM_LEADER") || role === "TAKIM_LIDERI" || role === "TEAM_LEADER") return "TAKIM_LIDERI";
  if (role === "MUTEAHHIT") return "MUTEAHHIT";
  if (role === "INSAAT_FIRMASI") return "INSAAT_FIRMASI";
  return "EMLAKCI";
}

function getRoleTemplateLabel(templateKey: RoleDocumentTemplateKey) {
  if (templateKey === "MUTEAHHIT") return "Müteahhit Evrakları";
  if (templateKey === "INSAAT_FIRMASI") return "İnşaat Firması Evrakları";
  if (templateKey === "OFIS_SAHIBI") return "Ofis Sahibi Evrakları";
  if (templateKey === "TAKIM_LIDERI") return "Takım Lideri Evrakları";
  return "Emlakçı Evrakları";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

function formatMoney(value?: number | string | null, currency?: string | null) {
  const numeric = Number(value || 0);
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";

  if (!numeric) return "Fiyat yok";

  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function formatArea(value?: number | string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "m² yok";
  return `${numeric.toLocaleString("tr-TR")} m²`;
}

function formatFileSize(size?: number | null) {
  const numeric = Number(size || 0);
  if (!numeric) return "Boyut yok";
  if (numeric < 1024 * 1024) return `${Math.max(1, Math.round(numeric / 1024))} KB`;
  return `${(numeric / (1024 * 1024)).toFixed(1)} MB`;
}

function getPortfolioTitle(unit?: PortfolioUnit | null) {
  if (!unit) return "Portföy seçiniz";
  return unit.project?.name || "EPH Portföy";
}

function getLocation(unit?: PortfolioUnit | null) {
  return [unit?.project?.district, unit?.project?.city].filter(Boolean).join(" / ") || "Konum yok";
}

function getDocumentByType(documents: PortfolioDocument[], type: PortfolioAuthorityType) {
  return documents.find((document) => document.authorityType === type);
}

function getVerifiedCount(documents: PortfolioDocument[], documentDefinitions: DocumentDefinition[]) {
  return documentDefinitions.filter((item) => getDocumentByType(documents, item.type)?.fileUrl).length;
}

function getRequiredUploadedCount(documents: PortfolioDocument[], documentDefinitions: DocumentDefinition[]) {
  return documentDefinitions.filter((item) => item.required && getDocumentByType(documents, item.type)?.fileUrl).length;
}

function getRequiredDocumentCount(documentDefinitions: DocumentDefinition[]) {
  return documentDefinitions.filter((item) => item.required).length;
}

function getMissingCriticalLabels(documents: PortfolioDocument[], documentDefinitions: DocumentDefinition[]) {
  return documentDefinitions.filter(
    (item) => item.required && !getDocumentByType(documents, item.type)?.fileUrl,
  ).map((item) => item.title);
}

function getCompletionPercent(documents: PortfolioDocument[], documentDefinitions: DocumentDefinition[]) {
  if (!documentDefinitions.length) return 0;
  return Math.round((getVerifiedCount(documents, documentDefinitions) / documentDefinitions.length) * 100);
}

function validateDocumentFile(file: File) {
  const fileType = String(file.type || "").toLowerCase();
  const fileName = String(file.name || "").toLowerCase();
  const allowed =
    ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp", "application/octet-stream", ""].includes(fileType) ||
    /\.(pdf|jpg|jpeg|png|webp)$/i.test(fileName);

  if (!allowed) return "Sadece PDF, JPG, PNG veya WEBP formatında belge yükleyebilirsiniz.";
  if (file.size > 15 * 1024 * 1024) return `Belge çok büyük. En fazla 15 MB olabilir. Seçilen: ${(file.size / (1024 * 1024)).toFixed(1)} MB.`;
  if (file.size < 2 * 1024) return "Seçilen belge çok küçük görünüyor. Lütfen geçerli bir dosya yükleyiniz.";

  return "";
}

export default function PortfolioQualityPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<PortfolioUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [documents, setDocuments] = useState<PortfolioDocument[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [documentLoading, setDocumentLoading] = useState("");
  const [deleteLoading, setDeleteLoading] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);

  const inputRefs = useRef<Partial<Record<PortfolioAuthorityType, HTMLInputElement | null>>>({});

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push("/giris");
      return;
    }

    fetchUnits();
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!selectedUnitId) {
      setDocuments([]);
      return;
    }

    fetchDocuments(selectedUnitId);
  }, [selectedUnitId]);

  const filteredUnits = useMemo(() => {
    const value = search.trim().toLocaleLowerCase("tr-TR");

    if (!value) return units;

    return units.filter((unit) => {
      const haystack = [
        unit.project?.name,
        unit.project?.city,
        unit.project?.district,
        unit.project?.address,
        unit.type,
        unit.status,
        unit.roomCount,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return haystack.includes(value);
    });
  }, [search, units]);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );
  const documentTemplateKey = getUserDocumentTemplateKey(user);
  const documentDefinitions = ROLE_DOCUMENTS[documentTemplateKey];
  const documentTemplateLabel = getRoleTemplateLabel(documentTemplateKey);

  const uploadedCount = getVerifiedCount(documents, documentDefinitions);
  const requiredDocumentCount = getRequiredDocumentCount(documentDefinitions);
  const requiredUploadedCount = getRequiredUploadedCount(documents, documentDefinitions);
  const missingCriticalLabels = getMissingCriticalLabels(documents, documentDefinitions);
  const completionPercent = getCompletionPercent(documents, documentDefinitions);
  const hasRequiredDocument = requiredDocumentCount === 0 || requiredUploadedCount === requiredDocumentCount;
  const documentReadyLabel = hasRequiredDocument ? "İncelemeye Hazır" : "Kritik Evrak Bekleniyor";

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/units");
      const nextUnits = Array.isArray(response.data) ? response.data : [];
      setUnits(nextUnits);
      setSelectedUnitId((current) => current || nextUnits[0]?.id || "");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Portföyler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (portfolioId: string) => {
    try {
      setError("");
      const response = await api.get(`/portfolio-documents/${portfolioId}`);
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setDocuments([]);
      setError(err?.response?.data?.message || "Belgeler yüklenemedi.");
    }
  };

  const uploadDocument = async (file: File, authorityType: PortfolioAuthorityType) => {
    if (!selectedUnitId) {
      setError("Önce portföy seçiniz.");
      return;
    }

    const validationError = validateDocumentFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = new FormData();
    payload.append("portfolioId", selectedUnitId);
    payload.append("authorityType", authorityType);
    payload.append("file", file);

    try {
      setError("");
      setMessage("");
      setDocumentLoading(authorityType);
      await api.post("/portfolio-documents/upload", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchDocuments(selectedUnitId);
      setMessage("Belge yüklendi.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Belge yüklenemedi.");
    } finally {
      setDocumentLoading("");
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    authorityType: PortfolioAuthorityType,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    await uploadDocument(file, authorityType);
  };

  const deleteDocument = async (documentId?: string) => {
    if (!documentId || !selectedUnitId) return;
    if (!confirm("Bu belgeyi silmek istiyor musunuz?")) return;

    try {
      setError("");
      setMessage("");
      setDeleteLoading(documentId);
      await api.delete(`/portfolio-documents/${documentId}`);
      await fetchDocuments(selectedUnitId);
      setMessage("Belge silindi.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Belge silinemedi.");
    } finally {
      setDeleteLoading("");
    }
  };

  const submitApproval = async () => {
    if (!selectedUnitId) return;

    try {
      setError("");
      setMessage("");
      setApprovalLoading(true);
      await api.post(`/units/${selectedUnitId}/submit-approval`);
      await fetchUnits();
      await fetchDocuments(selectedUnitId);
      setMessage("Portföy incelemeye gönderildi.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "İncelemeye gönderilemedi.");
    } finally {
      setApprovalLoading(false);
    }
  };

  if (!hydrated || loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#F4F8FF] text-[#06194A]">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#2563EB]" size={34} />
          <p className="mt-3 text-[12px] font-black text-[#64748B]">Belge merkezi yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#F4F8FF] pb-[calc(112px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <div className="mx-auto w-full max-w-[430px] px-3 py-3">
        <section className="rounded-[28px] border border-[#C7D6E8] bg-white p-3 text-center shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/uretkenlik")}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F8FAFC] text-[#1F2937] active:scale-[0.98]"
              aria-label="Üretkenlik sayfasına dön"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex min-h-11 min-w-0 flex-col items-center justify-center text-center">
              <h1 className="flex min-h-[28px] items-center justify-center break-words text-center text-[22px] font-black tracking-[-0.05em] text-[#06194A]">
                Belge Yükleme Merkezi
              </h1>
              <p className="mx-auto mt-1 max-w-[320px] text-center text-[11px] font-bold leading-5 text-[#64748B]">
                {documentTemplateLabel} tek merkezden yönetilir.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchUnits}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F8FAFC] text-[#2563EB] active:scale-[0.98]"
              aria-label="Yenile"
            >
              <RefreshCcw size={19} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[18px] border border-[#DDE7F3] bg-white text-center">
            <Metric label="Portföy" value={units.length} />
            <Metric label="Yüklendi" value={uploadedCount} tone="green" />
            <Metric label="Hazırlık" value={`%${completionPercent}`} tone={completionPercent >= 80 ? "green" : "orange"} />
          </div>

          <div className="mt-3 rounded-[18px] border border-[#DDE7F3] bg-[#F8FAFC] p-3 text-center">
            <div className="flex items-center justify-between gap-2 text-[11px] font-black text-[#64748B]">
              <span>Evrak Tamamlama</span>
              <span className={completionPercent >= 80 ? "text-emerald-700" : "text-amber-700"}>%{completionPercent}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div
                className={completionPercent >= 80 ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-amber-500"}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className={hasRequiredDocument ? "mt-2 text-[11px] font-black text-emerald-700" : "mt-2 text-[11px] font-black text-rose-700"}>
              {selectedUnit ? documentReadyLabel : "Önce portföy seçiniz"}
            </p>
          </div>
        </section>

        {message && (
          <div className="mt-3 rounded-[18px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-[12px] font-black leading-5 text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-[18px] border border-rose-100 bg-rose-50 px-3 py-2 text-center text-[12px] font-black leading-5 text-rose-700">
            {error}
          </div>
        )}

        <section className="mt-3 rounded-[24px] border border-[#C7D6E8] bg-white p-3 text-center shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-center gap-2 text-[#2563EB]">
            <Building2 size={18} />
            <h2 className="text-center text-[16px] font-black text-[#06194A]">Portföy Seç</h2>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-[#DDE7F3] bg-[#F8FAFC] px-3 py-2">
            <Search size={17} className="text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Portföy, şehir, ilçe ara..."
              className="h-8 min-w-0 flex-1 bg-transparent text-center text-[13px] font-bold outline-none placeholder:text-[#94A3B8]"
            />
          </div>

          {filteredUnits.length === 0 ? (
            <div className="mt-3 rounded-[18px] border border-dashed border-[#DDE7F3] bg-[#F8FAFC] px-3 py-5 text-center">
              <AlertCircle className="mx-auto text-[#94A3B8]" size={25} />
              <p className="mt-2 text-[12px] font-black text-[#64748B]">Portföy bulunamadı.</p>
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {filteredUnits.map((unit) => {
                const selected = unit.id === selectedUnitId;

                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => setSelectedUnitId(unit.id)}
                    className={`w-full rounded-[20px] border p-3 text-center active:scale-[0.99] ${
                      selected
                        ? "border-[#2563EB] bg-[#EFF6FF] ring-2 ring-blue-100"
                        : "border-[#DDE7F3] bg-white"
                    }`}
                  >
                    <p className="break-words text-center text-[14px] font-black leading-5 text-[#06194A]">
                      {getPortfolioTitle(unit)}
                    </p>
                    <p className="mt-1 break-words text-center text-[11px] font-bold leading-4 text-[#64748B]">
                      {getLocation(unit)} · {formatArea(unit.area)} · {formatMoney(unit.price, unit.priceCurrency)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-3 rounded-[24px] border border-[#C7D6E8] bg-white p-3 text-center shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-center gap-2 text-[#2563EB]">
            <ShieldCheck size={18} />
            <h2 className="text-center text-[16px] font-black text-[#06194A]">{documentTemplateLabel}</h2>
          </div>

          <p className="mx-auto mt-1 max-w-[320px] text-center text-[11px] font-bold leading-5 text-[#64748B]">
            {selectedUnit ? getPortfolioTitle(selectedUnit) : "Portföy seçildiğinde evraklar burada görünür."}
          </p>

          {selectedUnit && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => router.push(`/portfoy/${selectedUnit.id}`)}
                className="flex min-h-[38px] items-center justify-center rounded-[14px] border border-[#DDE7F3] bg-white px-3 text-[11px] font-black text-[#2563EB]"
              >
                Detaya Git
              </button>
              <button
                type="button"
                onClick={() => router.push(`/portfoy?edit=${selectedUnit.id}`)}
                className="flex min-h-[38px] items-center justify-center rounded-[14px] bg-[#EFF6FF] px-3 text-[11px] font-black text-[#2563EB]"
              >
                Güncelle
              </button>
            </div>
          )}

          {selectedUnit && missingCriticalLabels.length > 0 && (
            <div className="mt-3 rounded-[16px] border border-rose-100 bg-rose-50 px-3 py-2 text-center text-[11px] font-black leading-5 text-rose-700">
              Evrak bekleniyor: {missingCriticalLabels.join(" + ")}
            </div>
          )}

          <div className="mt-3 grid gap-2">
            {documentDefinitions.map((item) => {
              const document = getDocumentByType(documents, item.type);
              const hasFile = Boolean(document?.fileUrl);
              const status = getDocumentStatus(document, selectedUnit);
              const loadingUpload = documentLoading === item.type;
              const loadingDelete = Boolean(document?.id && deleteLoading === document.id);

              return (
                <div
                  key={item.type}
                  className="rounded-[20px] border-[3px] border-[#2563EB] bg-white p-3 text-center shadow-[0_10px_24px_rgba(37,99,235,0.10)]"
                >
                  <div className="flex items-start justify-center gap-2 text-center">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] ${hasFile ? "bg-emerald-50 text-emerald-700" : "bg-white text-[#2563EB]"}`}>
                      {hasFile ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                    </div>
                    <div className="min-w-0 flex-1 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2 text-center">
                        <p className="break-words text-center text-[15px] font-black text-[#2563EB]">{item.title}</p>
                        <span className={`inline-flex min-h-[24px] items-center justify-center rounded-full border px-2.5 text-[10px] font-black ${getStatusBadgeClass(status.tone)}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-0.5 break-words text-center text-[10.5px] font-bold leading-4 text-[#64748B]">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {hasFile && (
                    <div className="mt-2 rounded-[16px] border border-emerald-100 bg-white px-3 py-2 text-center">
                      <p className="break-words text-[11px] font-black text-emerald-700">
                        {document?.fileName || document?.originalName || "Evrak yüklendi"}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-[#64748B]">
                        {formatFileSize(document?.sizeBytes)}
                      </p>
                      {document?.createdAt && (
                        <p className="mt-0.5 text-[10px] font-bold text-[#94A3B8]">
                          Yükleme: {new Date(document.createdAt).toLocaleDateString("tr-TR")}
                        </p>
                      )}
                    </div>
                  )}

                  <input
                    ref={(element) => {
                      inputRefs.current[item.type] = element;
                    }}
                    type="file"
                    accept={DOCUMENT_ACCEPT}
                    className="hidden"
                    onChange={(event) => handleFileChange(event, item.type)}
                  />

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => inputRefs.current[item.type]?.click()}
                      disabled={!selectedUnit || loadingUpload}
                      className="flex min-h-[40px] items-center justify-center gap-1 rounded-[14px] bg-[#2563EB] px-2 text-[11px] font-black text-white disabled:opacity-50"
                    >
                      <Upload size={14} />
                      {loadingUpload ? "..." : hasFile ? "Yenile" : "Yükle"}
                    </button>

                    <a
                      href={document?.fileUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!hasFile}
                      className={`flex min-h-[40px] items-center justify-center gap-1 rounded-[14px] px-2 text-[11px] font-black ${
                        hasFile
                          ? "border border-[#DDE7F3] bg-white text-[#2563EB]"
                          : "pointer-events-none border border-[#DDE7F3] bg-white text-[#94A3B8]"
                      }`}
                    >
                      <ExternalLink size={14} />
                      Aç
                    </a>

                    <a
                      href={document?.fileUrl || undefined}
                      download={document?.fileName || document?.originalName || item.title}
                      aria-disabled={!hasFile}
                      className={`flex min-h-[40px] items-center justify-center gap-1 rounded-[14px] px-2 text-[11px] font-black ${
                        hasFile
                          ? "border border-[#DDE7F3] bg-white text-[#2563EB]"
                          : "pointer-events-none border border-[#DDE7F3] bg-white text-[#94A3B8]"
                      }`}
                    >
                      İndir
                    </a>

                    <button
                      type="button"
                      onClick={() => deleteDocument(document?.id)}
                      disabled={!hasFile || loadingDelete}
                      className="flex min-h-[40px] items-center justify-center gap-1 rounded-[14px] border border-rose-100 bg-white px-2 text-[11px] font-black text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      {loadingDelete ? "..." : "Sil"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-3 rounded-[24px] border border-[#C7D6E8] bg-white p-3 text-center shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-center gap-2 text-[#2563EB]">
            <Send size={18} />
            <h2 className="text-center text-[16px] font-black text-[#06194A]">İnceleme Akışı</h2>
          </div>
          <p className="mx-auto mt-1 max-w-[320px] text-center text-[11px] font-bold leading-5 text-[#64748B]">
            Rolünüze göre tanımlanan zorunlu evraklar tamamlandığında portföyü incelemeye gönderebilirsiniz.
          </p>
          <button
            type="button"
            onClick={submitApproval}
            disabled={!selectedUnit || !hasRequiredDocument || approvalLoading}
            className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#06194A] px-4 text-[13px] font-black text-white disabled:opacity-50"
          >
            {approvalLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            {approvalLoading ? "Gönderiliyor..." : "İncelemeye Gönder"}
          </button>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "green" | "orange";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-700"
      : tone === "orange"
        ? "text-amber-700"
        : "text-[#06194A]";

  return (
    <div className="border-r border-[#E2EAF5] px-2 py-2 last:border-r-0">
      <p className={`text-[15px] font-black leading-none ${toneClass}`}>{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[-0.01em] text-[#64748B]">{label}</p>
    </div>
  );
}
