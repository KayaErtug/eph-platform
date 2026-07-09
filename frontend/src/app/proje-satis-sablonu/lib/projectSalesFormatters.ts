import type { ProjectSalesStockDraft, ProjectSalesStockUnit } from "./projectSalesTypes";
import { SALES_STATUS_OPTIONS, UNIT_TYPE_OPTIONS } from "./projectSalesOptions";

export function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

export function isEligibleRole(role?: string | null) {
  return ["MUTEAHHIT", "INSAAT_FIRMASI", "SUPER_ADMIN"].includes(
    normalizeRole(role),
  );
}

export function roleLabel(role?: string | null) {
  const roleValue = normalizeRole(role);

  if (roleValue === "MUTEAHHIT") return "Müteahhit";
  if (roleValue === "INSAAT_FIRMASI") return "İnşaat Firması";
  if (roleValue === "SUPER_ADMIN") return "Yazılım Ekibi";

  return "EPH Üyesi";
}

export function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    TASLAK: "Taslak",
    YAPI_OLUSTURULUYOR: "Yapı oluşturuluyor",
    BILGI_GIRISI_EKSIK: "Bilgi girişi eksik",
    KONTROLE_HAZIR: "Kontrole hazır",
    TAMAMLANDI: "Tamamlandı",
    ARSIVLENDI: "Arşivlendi",
  };

  return labels[String(status || "")] || "Taslak";
}

export function salesStatusLabel(status?: string | null) {
  return (
    SALES_STATUS_OPTIONS.find((option) => option.value === status)?.label ||
    String(status || "Durum yok")
  );
}

export function unitTypeLabel(unitType?: string | null) {
  return (
    UNIT_TYPE_OPTIONS.find((option) => option.value === unitType)?.label ||
    String(unitType || "Bağımsız bölüm")
  );
}

export function formatCurrency(value?: number | null) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) return "0 TL";

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(amount)} TL`;
}

export function salesPriceDigits(value: string | number | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function parseSalesPrice(value: string) {
  const digits = salesPriceDigits(value);

  if (!digits) return null;

  const parsed = Number(digits);

  return Number.isFinite(parsed) ? parsed : null;
}

export function formatSalesPriceInput(value: string | number | null | undefined) {
  const digits = salesPriceDigits(value);

  if (!digits) return "";

  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(Number(digits));
}

export function salesUnitIdentity(unit: ProjectSalesStockUnit) {
  return [
    unit.type,
    unit.roomCount || "",
    unit.netArea ?? "",
    unit.grossArea ?? "",
    unit.commercialPurpose,
    unit.conceptLabel || "",
  ].join("|");
}

const SALES_UNIT_CARD_PALETTES = [
  { background: "#DCEAFF", border: "#6F9FDB", accent: "#194E93" },
  { background: "#D9F0E2", border: "#6DAF88", accent: "#0A603B" },
  { background: "#F6E3BE", border: "#D1A14B", accent: "#784307" },
  { background: "#E8DCF7", border: "#A37FCE", accent: "#5B278F" },
  { background: "#F5D9E3", border: "#D47C9C", accent: "#8D1E4B" },
  { background: "#DCEFEF", border: "#6CA8A8", accent: "#165D5D" },
  { background: "#F2DED1", border: "#C58E69", accent: "#793E1E" },
  { background: "#E0E6F7", border: "#8296D0", accent: "#304A94" },
  { background: "#E7E3CF", border: "#AAA066", accent: "#645C20" },
  { background: "#E2DCE8", border: "#9982AA", accent: "#5A3D6B" },
];

export function salesUnitCardPalette(unit: ProjectSalesStockUnit) {
  const signature = salesUnitIdentity(unit);
  let hash = 0;

  for (let index = 0; index < signature.length; index += 1) {
    hash = (hash * 31 + signature.charCodeAt(index)) >>> 0;
  }

  return SALES_UNIT_CARD_PALETTES[hash % SALES_UNIT_CARD_PALETTES.length];
}

export function isSalesDraftDirty(
  unit: ProjectSalesStockUnit,
  draft: ProjectSalesStockDraft,
) {
  return (
    (parseSalesPrice(draft.price) ?? 0) !== Number(unit.price || 0) ||
    draft.status !== unit.status
  );
}

export function salesStatusPalette(status?: string | null) {
  if (["SATILDI", "KIRALANDII"].includes(String(status || ""))) {
    return {
      background: "#DCFCE7",
      border: "#86EFAC",
      color: "#166534",
    };
  }

  if (["REZERVE", "OPSIYONLU"].includes(String(status || ""))) {
    return {
      background: "#FEF3C7",
      border: "#FCD34D",
      color: "#92400E",
    };
  }

  if (status === "PASIF") {
    return {
      background: "#F1F5F9",
      border: "#CBD5E1",
      color: "#64748B",
    };
  }

  return {
    background: "#EAF2FF",
    border: "#93C5FD",
    color: "#1557D6",
  };
}

export function designReviewStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    BEKLIYOR: "İnceleme bekliyor",
    INCELEMEDE: "İnceleniyor",
    EK_BILGI_BEKLENIYOR: "Ek bilgi bekleniyor",
    ONAYLANDI: "Onaylandı",
    REDDEDILDI: "Reddedildi",
    TAMAMLANDI: "Tamamlandı",
    IPTAL_EDILDI: "İptal edildi",
  };

  return labels[String(status || "")] || "İnceleme bekliyor";
}

export function formatBytes(value?: number | null) {
  const size = Number(value || 0);

  if (!Number.isFinite(size) || size <= 0) return "0 KB";

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toLocaleString("tr-TR", {
    maximumFractionDigits: 1,
  })} MB`;
}

export function mediaActionLabel(action?: string | null) {
  if (action === "CREATE_ASSETS") return "Yeni görseller";
  if (action === "REPLACE_ASSETS") return "Mevcutları değiştir";
  if (action === "BLOCKED") return "Değiştirme izni gerekli";

  return String(action || "Hazır");
}

export function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function apiMessage(error: unknown) {
  const candidate = error as {
    response?: { data?: { message?: unknown } };
    message?: string;
  };
  const message = candidate?.response?.data?.message;

  if (Array.isArray(message)) return message.join(" ");
  if (message) return String(message);
  if (candidate?.message) return candidate.message;

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

