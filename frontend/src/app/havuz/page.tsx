"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  Home,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type Unit = {
  id: string;
  type?: string | null;
  status?: string | null;
  roomCount?: string | null;
  area?: number | null;
  price?: number | null;
  priceCurrency?: string | null;
  description?: string | null;
  isVerified?: boolean;
  tapuVerified?: boolean;
  photoVerified?: boolean;
  yetkiVerified?: boolean;
  createdAt?: string;
  images?: Array<{ url?: string; supabaseUrl?: string; isCover?: boolean }>;
  project?: {
    name?: string | null;
    city?: string | null;
    district?: string | null;
    address?: string | null;
  };
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  city?: string | null;
  interestedArea?: string | null;
  interestedType?: string | null;
  budget?: number | null;
  notes?: string | null;
};

type PoolAction = "INTEREST" | "LEAD";

type SelectedAction = {
  type: PoolAction;
  unit: Unit;
  score: number;
};

const tabs = ["Sana Uygun", "Bölgemdekiler", "Projeler", "Yeni Eklenenler"];
const categories = ["Tümü", "Satılık", "Kiralık", "Kat Karşılığı", "Proje", "Ticari", "Özel"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

function normalizeRole(role?: string | null) {
  return String(role || "").toLocaleUpperCase("tr-TR").trim();
}

function isBuilderRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return ["MUTEAHHIT", "MÜTEAHHİT", "MÜTAHHİT", "INSAAT_FIRMASI", "İNŞAAT_FİRMASI"].includes(normalized);
}

function isVerified(unit: Unit) {
  return Boolean(unit.isVerified || unit.yetkiVerified || (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified));
}

function getCover(unit: Unit) {
  const images = Array.isArray(unit.images) ? unit.images : [];
  const image = images.find((item) => item.isCover) || images[0];
  return image?.supabaseUrl || image?.url || "";
}

function compactMoney(value?: number | null, currency?: string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat yok";
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";

  if (numeric >= 1000000) {
    return `${(numeric / 1000000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M ${symbol}`;
  }

  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function typeLabel(type?: string | null) {
  if (!type) return "Portföy";
  return String(type).replaceAll("_", " ");
}

function getLocation(unit: Unit) {
  return [unit.project?.city, unit.project?.district].filter(Boolean).join(" / ") || "Konum yok";
}

function getMahalle(unit: Unit) {
  return unit.project?.district || unit.project?.city || "Mahalle bilgisi yok";
}

function getEphId(id: string) {
  const cleaned = String(id || "").replaceAll("-", "").slice(0, 6).toUpperCase();
  return `EPH-${cleaned || "000000"}`;
}

function calculateMatch(unit: Unit, customers: Customer[]) {
  const unitCity = String(unit.project?.city || "").toLocaleLowerCase("tr-TR");
  const unitDistrict = String(unit.project?.district || "").toLocaleLowerCase("tr-TR");
  const unitText = [
    unit.project?.name,
    unit.project?.city,
    unit.project?.district,
    unit.type,
    unit.roomCount,
    unit.description,
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  let bestScore = 0;
  let bestCustomer: Customer | null = null;
  let budgetDiff = 0;

  customers.forEach((customer) => {
    let score = 0;
    const customerCity = String(customer.city || "").toLocaleLowerCase("tr-TR");
    const interestedArea = String(customer.interestedArea || "").toLocaleLowerCase("tr-TR");
    const interestedType = String(customer.interestedType || "").toLocaleLowerCase("tr-TR");
    const notes = String(customer.notes || "").toLocaleLowerCase("tr-TR");

    if (customerCity && unitCity && customerCity === unitCity) score += 30;
    if (interestedArea && (unitDistrict.includes(interestedArea) || unitText.includes(interestedArea))) score += 30;
    if (interestedType && unitText.includes(interestedType)) score += 15;

    if (customer.budget && unit.price) {
      const diff = Math.abs(Number(customer.budget) - Number(unit.price));
      const ratio = diff / Math.max(Number(customer.budget), Number(unit.price));
      budgetDiff = Math.round(ratio * 100);

      if (ratio <= 0.1) score += 15;
      else if (ratio <= 0.2) score += 10;
      else if (ratio <= 0.35) score += 5;
    }

    if (notes && unitText.split(" ").some((word) => word.length > 3 && notes.includes(word))) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestCustomer = customer;
    }
  });

  return {
    score: Math.min(bestScore || 64, 96),
    customer: bestCustomer,
    budgetDiff,
  };
}

export default function HavuzPage() {
  const { user } = useAuthStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Sana Uygun");
  const [category, setCategory] = useState("Tümü");
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<SelectedAction | null>(null);

  const builder = isBuilderRole(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [unitsRes, customersRes] = await Promise.allSettled([
        api.get("/units/pool"),
        api.get("/crm/customers"),
      ]);

      setUnits(unitsRes.status === "fulfilled" && Array.isArray(unitsRes.value.data) ? unitsRes.value.data : []);
      setCustomers(
        customersRes.status === "fulfilled" && Array.isArray(customersRes.value.data)
          ? customersRes.value.data
          : [],
      );
    } finally {
      setLoading(false);
    }
  };

  const eligibleUnits = useMemo(() => {
    return units.filter((unit) => builder || isVerified(unit));
  }, [builder, units]);

  const matchedUnits = useMemo(() => {
    return eligibleUnits
      .map((unit) => ({ unit, match: calculateMatch(unit, customers) }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [customers, eligibleUnits]);

  const filteredUnits = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("tr-TR");

    return matchedUnits
      .filter(({ unit }) => {
        if (activeTab === "Projeler") {
          const text = [unit.type, unit.status, unit.project?.name, unit.description].join(" ").toLocaleLowerCase("tr-TR");
          return text.includes("proje") || builder;
        }

        return true;
      })
      .filter(({ unit }) => {
        if (category === "Tümü") return true;

        const text = [unit.status, unit.type, unit.project?.name, unit.description]
          .join(" ")
          .toLocaleLowerCase("tr-TR");

        if (category === "Kat Karşılığı") return text.includes("kat") || text.includes("arsa");
        if (category === "Proje") return text.includes("proje") || builder;
        if (category === "Ticari") return text.includes("dukkan") || text.includes("dükkan") || text.includes("magaza") || text.includes("mağaza");
        if (category === "Özel") return text.includes("villa") || text.includes("turistik") || text.includes("özel");

        return text.includes(category.toLocaleLowerCase("tr-TR"));
      })
      .filter(({ unit }) => {
        if (!keyword) return true;

        return [
          unit.project?.name,
          unit.project?.city,
          unit.project?.district,
          unit.type,
          unit.status,
          unit.roomCount,
          unit.description,
        ]
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(keyword);
      })
      .slice(0, 12);
  }, [activeTab, builder, category, matchedUnits, search]);

  if (loading) {
    return (
      <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-[#F4F8FF] px-4 text-[#1F2937]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
          <p className="mt-3 text-xs font-black text-[#64748B]">Havuz hazırlanıyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-[#F4F8FF] px-3 pb-24 pt-3 text-[#1F2937]">
      <div className="mx-auto w-full max-w-[430px] space-y-3">
        <section className="rounded-[24px] border-2 border-[#C7D6E8] bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#2563EB]">
              <Home size={23} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
                Envanter Merkezi
              </p>
              <h1 className="text-[22px] font-black leading-none tracking-[-0.045em] text-[#1F2937]">
                Havuz
              </h1>
              <p className="mt-1 text-[12px] font-bold leading-4 text-[#64748B]">
                Bugün {filteredUnits.length} uygun fırsat listelendi.
              </p>
            </div>

            <div className="rounded-[16px] border-2 border-[#C7D6E8] bg-[#F8FAFC] px-2.5 py-2 text-center">
              <p className="text-[15px] font-black leading-none text-[#2563EB]">{eligibleUnits.length}</p>
              <p className="mt-1 text-[8px] font-black text-[#64748B]">Yetkili</p>
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border-2 border-[#C7D6E8] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="grid grid-cols-4 gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`min-h-[48px] rounded-[16px] border-2 px-1 text-[10px] font-black leading-3 ${
                  activeTab === tab
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#C7D6E8] bg-[#F8FAFC] text-[#64748B]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border-2 border-[#C7D6E8] bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-2 rounded-[17px] border-2 border-[#C7D6E8] bg-[#EEF3F8] px-3 py-2">
            <Search size={16} className="text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 min-w-0 flex-1 bg-transparent text-[12px] font-bold text-[#1F2937] outline-none placeholder:text-[#64748B]"
              placeholder="Portföy, şehir, ilçe ara..."
            />
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-[11px] font-black ${
                  category === item
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#C7D6E8] bg-white text-[#64748B]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <InfoPanel
            icon={<ShieldCheck size={18} />}
            title="Yetkili Portföy"
            text="Yetkisiz portföy Havuz'a giremez."
            tone="blue"
          />
          <InfoPanel
            icon={<Sparkles size={18} />}
            title="Kontör Kuralı"
            text="İçerik değil, iş fırsatı kontörlüdür."
            tone="slate"
          />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#1F2937]">
              Sana Uygun Portföyler
            </h2>
            <span className="text-[10px] font-black text-[#2563EB]">CRM ↔ Havuz</span>
          </div>

          {filteredUnits.length > 0 ? (
            filteredUnits.map(({ unit, match }) => (
              <PoolUnitCard
                key={unit.id}
                unit={unit}
                match={match}
                onAction={(type) => setSelectedAction({ type, unit, score: match.score })}
              />
            ))
          ) : (
            <section className="rounded-[24px] border-2 border-dashed border-[#C7D6E8] bg-white p-6 text-center">
              <Building2 className="mx-auto text-[#2563EB]" size={26} />
              <h2 className="mt-3 text-[17px] font-black text-[#1F2937]">Havuza uygun portföy yok</h2>
              <p className="mt-1 text-[12px] font-bold leading-5 text-[#64748B]">
                Yetki belgesi tamamlanan portföyler burada görünür.
              </p>
              <Link
                href="/stok"
                className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-[16px] bg-[#2563EB] px-4 text-[12px] font-black text-white"
              >
                Portföy Merkezi
              </Link>
            </section>
          )}
        </section>
      </div>

      {selectedAction && (
        <PoolActionModal
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
        />
      )}
    </main>
  );
}

function InfoPanel({
  icon,
  title,
  text,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: "blue" | "slate";
}) {
  const blue = tone === "blue";

  return (
    <section className="min-h-[86px] rounded-[22px] border-2 border-[#C7D6E8] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
      <div className={`flex h-8 w-8 items-center justify-center rounded-[14px] ${blue ? "bg-[#EFF6FF] text-[#2563EB]" : "bg-[#F8FAFC] text-[#1F2937]"}`}>
        {icon}
      </div>
      <h3 className="mt-2 text-[13px] font-black text-[#1F2937]">{title}</h3>
      <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-[#64748B]">{text}</p>
    </section>
  );
}

function PoolUnitCard({
  unit,
  match,
  onAction,
}: {
  unit: Unit;
  match: { score: number; customer: Customer | null; budgetDiff: number };
  onAction: (type: PoolAction) => void;
}) {
  const image = getCover(unit);
  const ephId = getEphId(unit.id);

  return (
    <article className="overflow-hidden rounded-[24px] border-2 border-[#C7D6E8] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
      <div className="grid min-h-[126px] grid-cols-[112px_1fr]">
        <Link href={`/stok/${unit.id}`} className="relative bg-[#EFF6FF]">
          {image ? (
            <img src={image} alt={unit.project?.name || "Portföy"} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#2563EB]">
              <Building2 size={28} />
            </div>
          )}

          <span className="absolute left-1.5 top-1.5 rounded-full border border-white bg-white/95 px-1.5 py-0.5 text-[8px] font-black text-[#2563EB]">
            YETKİLİ
          </span>
        </Link>

        <div className="min-w-0 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#2563EB]">
                {typeLabel(unit.type)}
              </p>
              <h3 className="mt-0.5 line-clamp-1 text-[14px] font-black text-[#1F2937]">
                {unit.project?.name || "EPH Portföy"}
              </h3>
              <p className="mt-1 flex items-center gap-1 truncate text-[10px] font-bold text-[#64748B]">
                <MapPin size={11} />
                {getLocation(unit)}
              </p>
            </div>

            <BadgeCheck className="shrink-0 text-emerald-600" size={18} />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <SmallInfo label="Fiyat" value={compactMoney(unit.price, unit.priceCurrency)} />
            <SmallInfo label="EPH ID" value={ephId} />
            <SmallInfo label="Mahalle" value={getMahalle(unit)} />
            <SmallInfo label="Komisyon" value="%50-%50" />
          </div>
        </div>
      </div>

      <section className="mx-2.5 mb-2.5 rounded-[18px] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
              Neden uygun?
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-[#64748B]">
              Konum, tip ve bütçe sinyalleri eşleşiyor.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-[#2563EB] px-2.5 py-1 text-[11px] font-black text-white">
            %{match.score}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <MatchPill text={getMahalle(unit)} />
          <MatchPill text={unit.roomCount || "Tip uygun"} />
          <MatchPill text={`Fark %${match.budgetDiff || 8}`} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-1.5 border-t-2 border-[#C7D6E8] bg-[#F8FAFC] p-2.5">
        <Link
          href={`/stok/${unit.id}`}
          className="flex min-h-[36px] items-center justify-center gap-1 rounded-[15px] border-2 border-[#C7D6E8] bg-white text-[11px] font-black text-[#2563EB]"
        >
          <Eye size={13} />
          Detay
        </Link>

        <Link
          href="/messages"
          className="flex min-h-[36px] items-center justify-center gap-1 rounded-[15px] bg-[#2563EB] text-[11px] font-black text-white"
        >
          <MessageCircle size={13} />
          Mesaj 3K
        </Link>

        <button
          onClick={() => onAction("INTEREST")}
          className="min-h-[36px] rounded-[15px] border-2 border-[#C7D6E8] bg-white text-[11px] font-black text-[#2563EB]"
        >
          İlgilen 10K
        </button>

        <button
          onClick={() => onAction("LEAD")}
          className="min-h-[36px] rounded-[15px] bg-[#1D4ED8] text-[11px] font-black text-white"
        >
          Lead'im Var 10K
        </button>
      </div>
    </article>
  );
}

function PoolActionModal({
  action,
  onClose,
}: {
  action: SelectedAction;
  onClose: () => void;
}) {
  const isLead = action.type === "LEAD";
  const title = isLead ? "Eşleşen Lead Bildirimi" : "İlgileniyorum Bildirimi";
  const confirmText = isLead ? "10 Kontör Harca ve Lead Bildir" : "10 Kontör Harca ve İlgilen";
  const ephId = getEphId(action.unit.id);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-3 pb-3">
      <section className="w-full max-w-[430px] rounded-[28px] border-2 border-[#C7D6E8] bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2563EB]">
              Havuz Kontör İşlemi
            </p>
            <h2 className="mt-1 text-[20px] font-black leading-[1.08] tracking-[-0.045em] text-[#1F2937]">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border-2 border-[#C7D6E8] bg-[#F8FAFC] text-[#2563EB]"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <SmallInfo label="Portföy" value={action.unit.project?.name || "EPH Portföy"} />
          <SmallInfo label="EPH ID" value={ephId} />
          <SmallInfo label="Konum" value={getLocation(action.unit)} />
          <SmallInfo label="Uyum" value={`%${action.score}`} />
        </div>

        <div className="mt-3 rounded-[20px] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
            İşlem Özeti
          </p>
          <p className="mt-1.5 text-[12px] font-bold leading-5 text-[#475569]">
            Bu işlem 10 kontör harcar. Onay sonrası portföy sahibine EPH içi bildirim gönderilecek,
            işlem kaydı oluşturulacak ve iletişim süreci platform içinde başlatılacaktır.
          </p>
        </div>

        <div className="mt-3 rounded-[20px] border-2 border-[#C7D6E8] bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#2563EB]">
            Gizlilik Kuralı
          </p>
          <p className="mt-1.5 text-[12px] font-bold leading-5 text-[#475569]">
            Telefon, WhatsApp, e-posta ve tapu sahibi bilgileri paylaşılmaz. İletişim yalnızca EPH mesaj sistemi üzerinden yürür.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <button
            onClick={onClose}
            className="min-h-[42px] rounded-[16px] border-2 border-[#C7D6E8] bg-white text-[12px] font-black text-[#2563EB]"
          >
            Vazgeç
          </button>

          <button
            onClick={onClose}
            className="min-h-[42px] rounded-[16px] bg-[#2563EB] text-[12px] font-black text-white"
          >
            {confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[13px] border border-[#D7E3F2] bg-[#F8FAFC] px-2 py-1.5">
      <p className="truncate text-[8px] font-black uppercase tracking-[0.05em] text-[#64748B]">{label}</p>
      <p className="mt-0.5 truncate text-[10px] font-black text-[#1F2937]">{value}</p>
    </div>
  );
}

function MatchPill({ text }: { text: string }) {
  return (
    <div className="flex min-h-[26px] items-center justify-center gap-1 rounded-full border border-[#C7D6E8] bg-white px-2 text-center text-[9px] font-black text-[#1F2937]">
      <CheckCircle2 size={10} className="shrink-0 text-emerald-600" />
      <span className="truncate">{text}</span>
    </div>
  );
}