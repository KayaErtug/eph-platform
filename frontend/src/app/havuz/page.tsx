"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  LockKeyhole,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
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

function getQuota(role?: string | null) {
  if (isBuilderRole(role)) return 100;
  if (normalizeRole(role) === "ADMIN" || normalizeRole(role) === "SUPER_ADMIN") return 250;
  return 20;
}

function isVerified(unit: Unit) {
  return Boolean(unit.isVerified || unit.yetkiVerified || (unit.tapuVerified && unit.photoVerified && unit.yetkiVerified));
}

function getCover(unit: Unit) {
  const images = Array.isArray(unit.images) ? unit.images : [];
  const image = images.find((item) => item.isCover) || images[0];
  return image?.supabaseUrl || image?.url || "";
}

function money(value?: number | null, currency?: string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "Fiyat yok";
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";
  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function compactMoney(value?: number | null, currency?: string | null) {
  const numeric = Number(value || 0);
  if (!numeric) return "—";
  const symbol = CURRENCY_SYMBOLS[currency || "TRY"] || "₺";

  if (numeric >= 1000000) {
    return `${(numeric / 1000000).toLocaleString("tr-TR", {
      maximumFractionDigits: 1,
    })}M ${symbol}`;
  }

  return `${numeric.toLocaleString("tr-TR")} ${symbol}`;
}

function typeLabel(type?: string | null) {
  if (!type) return "Portföy";
  return String(type).replaceAll("_", " ");
}

function statusLabel(status?: string | null) {
  if (!status) return "Durum yok";
  return String(status).replaceAll("_", " ");
}

function getLocation(unit: Unit) {
  return [unit.project?.district, unit.project?.city].filter(Boolean).join(" / ") || "Konum yok";
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

  customers.forEach((customer) => {
    let score = 0;
    const customerCity = String(customer.city || "").toLocaleLowerCase("tr-TR");
    const interestedArea = String(customer.interestedArea || "").toLocaleLowerCase("tr-TR");
    const interestedType = String(customer.interestedType || "").toLocaleLowerCase("tr-TR");
    const notes = String(customer.notes || "").toLocaleLowerCase("tr-TR");

    if (customerCity && unitCity && customerCity === unitCity) score += 25;
    if (interestedArea && (unitDistrict.includes(interestedArea) || unitText.includes(interestedArea))) score += 30;
    if (interestedType && unitText.includes(interestedType)) score += 20;

    if (customer.budget && unit.price) {
      const diff = Math.abs(Number(customer.budget) - Number(unit.price));
      const ratio = diff / Math.max(Number(customer.budget), Number(unit.price));
      if (ratio <= 0.1) score += 20;
      else if (ratio <= 0.2) score += 12;
      else if (ratio <= 0.35) score += 6;
    }

    if (notes && unitText.split(" ").some((word) => word.length > 3 && notes.includes(word))) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestCustomer = customer;
    }
  });

  return {
    score: Math.min(bestScore, 96),
    customer: bestCustomer,
  };
}

export default function HavuzPage() {
  const { user } = useAuthStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Tümü");
  const [search, setSearch] = useState("");

  const quota = getQuota(user?.role);
  const builder = isBuilderRole(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [unitsRes, customersRes] = await Promise.allSettled([
        api.get("/units"),
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

  const publishedCount = Math.min(eligibleUnits.length, quota);

  const filteredUnits = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("tr-TR");

    return eligibleUnits
      .filter((unit) => {
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
      .filter((unit) => {
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
  }, [builder, category, eligibleUnits, search]);

  const linaMatches = useMemo(() => {
    return eligibleUnits
      .map((unit) => ({
        unit,
        match: calculateMatch(unit, customers),
      }))
      .filter((item) => item.match.score >= 35)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 3);
  }, [customers, eligibleUnits]);

  if (loading) {
    return (
      <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-[#F7FBFF] px-4 text-[#06194A]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#1557D6] border-t-transparent" />
          <p className="mt-3 text-xs font-black text-[#64748B]">Havuz hazırlanıyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-[#F7FBFF] px-3 pb-4 pt-3 text-[#06194A]">
      <div className="mx-auto w-full max-w-[430px] space-y-2">
        <section className="rounded-[24px] border border-[#DDE7F3] bg-white p-3 text-center shadow-[0_12px_28px_rgba(15,23,42,0.055)]">
          <h1 className="text-[20px] font-black leading-none tracking-[-0.035em] text-[#06194A]">
            Yetkili Portföy Havuzu
          </h1>
          <p className="mx-auto mt-1.5 max-w-[330px] text-[12px] font-bold leading-5 text-[#64748B]">
            Portföyünüz sizde kalsın. Fırsatları Lina bulsun.
          </p>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            <MiniStat label="Portföy" value={units.length} />
            <MiniStat label="Uygun" value={eligibleUnits.length} />
            <MiniStat label="Yayın" value={publishedCount} />
            <MiniStat label="Lina" value={linaMatches.length} accent />
          </div>
        </section>

        <section className="rounded-[22px] border border-[#DDE7F3] bg-[#F4F0FF] px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-2 text-center">
            <Sparkles className="shrink-0 text-[#6D4AFF]" size={17} />
            <p className="text-[11px] font-black leading-4 text-[#27364F]">
              Lina veriyi paylaşmaz, fırsatı gösterir.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <ColorPanel
            icon={<ShieldCheck size={18} />}
            title={builder ? "Kota Hakkı" : "Yetki Şartı"}
            text={builder ? `${quota} portföye kadar havuza açabilirsiniz.` : "Sadece yetkili portföyler havuza açılır."}
            bg="#EFF6FF"
            color="#1557D6"
          />
          <ColorPanel
            icon={<Target size={18} />}
            title="Fırsat Motoru"
            text="CRM, Forum ve Havuz eşleşmeleri Lina tarafından izlenir."
            bg="#FFF7ED"
            color="#EA580C"
          />
        </section>

        <section className="rounded-[22px] border border-[#DDE7F3] bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-2 rounded-[17px] bg-[#F7FBFF] px-3 py-2">
            <Search size={16} className="text-[#94A3B8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 min-w-0 flex-1 bg-transparent text-[12px] font-bold text-[#06194A] outline-none placeholder:text-[#94A3B8]"
              placeholder="Portföy, şehir, ilçe ara..."
            />
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${
                  category === item
                    ? "bg-[#1557D6] text-white"
                    : "border border-[#DDE7F3] bg-white text-[#64748B]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-[#DDE7F3] bg-white p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[15px] font-black tracking-[-0.025em] text-[#06194A]">
              Lina Fırsatları
            </h2>
            <span className="text-[10px] font-black text-[#6D4AFF]">CRM ↔ Havuz</span>
          </div>

          {linaMatches.length > 0 ? (
            <div className="grid gap-1.5">
              {linaMatches.map(({ unit, match }) => (
                <LinaMatchCard key={unit.id} unit={unit} match={match} />
              ))}
            </div>
          ) : (
            <p className="rounded-[18px] bg-[#F7FBFF] px-3 py-3 text-center text-[12px] font-bold text-[#64748B]">
              Şu an yüksek uyumlu fırsat görünmüyor.
            </p>
          )}
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[15px] font-black tracking-[-0.025em] text-[#06194A]">
              Havuzdaki Portföyler
            </h2>
            <span className="text-[10px] font-black text-[#64748B]">
              İlk 12 kayıt
            </span>
          </div>

          {filteredUnits.length > 0 ? (
            filteredUnits.map((unit) => <PoolUnitCard key={unit.id} unit={unit} builder={builder} />)
          ) : (
            <section className="rounded-[24px] border border-dashed border-[#DDE7F3] bg-white p-6 text-center">
              <LockKeyhole className="mx-auto text-[#1557D6]" size={24} />
              <h2 className="mt-3 text-[17px] font-black text-[#06194A]">Havuza uygun portföy yok</h2>
              <p className="mt-1 text-[12px] font-bold leading-5 text-[#64748B]">
                Emlakçı hesaplarında yetki/onay şartı aranır. Müteahhit ve inşaat firmaları kota dahilinde portföy paylaşabilir.
              </p>
              <Link
                href="/stok"
                className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-[16px] bg-[#1557D6] px-4 text-[12px] font-black text-white"
              >
                Portföy Merkezi
              </Link>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`min-h-[54px] rounded-[17px] px-1.5 py-2 text-center ${accent ? "bg-[#F4F0FF]" : "bg-[#F7FBFF]"}`}>
      <p className={`text-[18px] font-black leading-none ${accent ? "text-[#6D4AFF]" : "text-[#06194A]"}`}>
        {value}
      </p>
      <p className="mt-1 text-[9px] font-black text-[#64748B]">{label}</p>
    </div>
  );
}

function ColorPanel({
  icon,
  title,
  text,
  bg,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  bg: string;
  color: string;
}) {
  return (
    <section className="min-h-[92px] rounded-[22px] border border-[#DDE7F3] p-3 text-left" style={{ background: bg }}>
      <div className="flex h-8 w-8 items-center justify-center rounded-[14px] bg-white" style={{ color }}>
        {icon}
      </div>
      <h3 className="mt-2 text-[13px] font-black text-[#06194A]">{title}</h3>
      <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-[#64748B]">{text}</p>
    </section>
  );
}

function LinaMatchCard({
  unit,
  match,
}: {
  unit: Unit;
  match: { score: number; customer: Customer | null };
}) {
  return (
    <article className="rounded-[18px] border border-[#DDE7F3] bg-[#F7FBFF] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#6D4AFF]">
            Lina fırsat buldu
          </p>
          <h3 className="mt-0.5 truncate text-[13px] font-black text-[#06194A]">
            {unit.project?.name || "EPH Portföy"}
          </h3>
        </div>

        <span className="shrink-0 rounded-full bg-[#6D4AFF] px-2.5 py-1 text-[10px] font-black text-white">
          %{match.score}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <SmallInfo label="Portföy" value={`${getLocation(unit)} · ${unit.roomCount || "—"}`} />
        <SmallInfo
          label="CRM"
          value={match.customer ? `${match.customer.firstName} ${match.customer.lastName}` : "Yakın kayıt"}
        />
      </div>
    </article>
  );
}

function PoolUnitCard({ unit, builder }: { unit: Unit; builder: boolean }) {
  const image = getCover(unit);

  return (
    <article className="grid min-h-[96px] grid-cols-[84px_1fr] overflow-hidden rounded-[22px] border border-[#DDE7F3] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.045)]">
      <Link href={`/stok/${unit.id}`} className="relative bg-[#EFF6FF]">
        {image ? (
          <img src={image} alt={unit.project?.name || "Portföy"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#1557D6]">
            <Building2 size={24} />
          </div>
        )}

        <span className="absolute left-1.5 top-1.5 rounded-full bg-white/92 px-1.5 py-0.5 text-[8px] font-black text-[#1557D6]">
          {isVerified(unit) ? "YETKİ" : builder ? "KOTA" : "KONTROL"}
        </span>
      </Link>

      <div className="min-w-0 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-black text-[#06194A]">
              {unit.project?.name || "EPH Portföy"}
            </h3>
            <p className="mt-0.5 truncate text-[10px] font-bold text-[#64748B]">
              {getLocation(unit)}
            </p>
          </div>

          <BadgeCheck className={isVerified(unit) ? "text-emerald-600" : "text-[#94A3B8]"} size={17} />
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1">
          <SmallInfo label="Tip" value={typeLabel(unit.type)} />
          <SmallInfo label="Oda" value={unit.roomCount || "—"} />
          <SmallInfo label="Fiyat" value={compactMoney(unit.price, unit.priceCurrency)} />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Link
            href={`/stok/${unit.id}`}
            className="flex min-h-[30px] items-center justify-center gap-1 rounded-[13px] border border-[#DDE7F3] bg-white text-[10px] font-black text-[#1557D6]"
          >
            <Eye size={13} />
            İncele
          </Link>
          <Link
            href="/messages"
            className="flex min-h-[30px] items-center justify-center gap-1 rounded-[13px] bg-[#1557D6] text-[10px] font-black text-white"
          >
            <MessageCircle size={13} />
            Görüş
          </Link>
        </div>
      </div>
    </article>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[13px] bg-white px-2 py-1.5">
      <p className="truncate text-[8px] font-black uppercase tracking-[0.05em] text-[#94A3B8]">{label}</p>
      <p className="mt-0.5 truncate text-[10px] font-black text-[#27364F]">{value}</p>
    </div>
  );
}