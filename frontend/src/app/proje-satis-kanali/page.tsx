"use client";

import {
  Building2,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchDistrictOptions,
  fetchProvinceOptions,
  type LocationOption,
} from "@/components/stok/locationData";
import api from "@/lib/api";

type ChannelItem = {
  unitId: string;
  inventoryCode: string | null;
  type: string;
  status: string;
  roomCount: string | null;
  conceptLabel: string | null;
  area: number | null;
  netArea: number | null;
  grossArea: number | null;
  floor: number | null;
  floorLabel: string | null;
  totalFloors: number | null;
  facades: string[];
  features: string[];
  price: number;
  priceCurrency: string;
  deliveryDate: string | null;
  coverImage: string | null;
  block: { code: string; name: string | null } | null;
  project: {
    id: string;
    name: string;
    code: string | null;
    lifecycleStage: string | null;
    city: string;
    district: string;
    neighborhood: string | null;
    completionPercent: number | null;
    defaultDeliveryDate: string | null;
  };
  crmHint: {
    directMatchCount: number;
    matchingInterestIds: string[];
    privateCustomerDataIncluded: false;
  };
};

type ChannelResponse = {
  generatedAt: string;
  summary: {
    visibleUnitCount: number;
    unitsWithDirectCrmMatch: number;
    directCrmMatchCount: number;
  };
  items: ChannelItem[];
  privacy: {
    projectOwnerIdentityIncluded: false;
    projectOwnerContactIncluded: false;
    deedOwnerIncluded: false;
    fullAddressIncluded: false;
    privateCustomerDataIncluded: false;
  };
};

const TYPE_OPTIONS = [
  ["", "Tüm tipler"],
  ["DAIRE", "Daire"],
  ["VILLA", "Villa"],
  ["REZIDANS", "Rezidans"],
  ["DUKKAN_MAGAZA", "Dükkan / Mağaza"],
  ["OFIS_BURO", "Ofis / Büro"],
  ["ARSA", "Arsa"],
  ["KONUT_PROJESI", "Konut Projesi"],
] as const;

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat("tr-TR").format(value)} ${currency}`;
  }
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|\s)(\S)/g, (part) => part.toLocaleUpperCase("tr-TR"));
}

export default function AgentSalesChannelPage() {
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [unitType, setUnitType] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [data, setData] = useState<ChannelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchProvinceOptions()
      .then((items) => active && setCities(items))
      .catch(() => active && setCities([]))
      .finally(() => active && setLocationLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setDistrict("");
    setDistricts([]);
    if (!city) return;

    setDistrictLoading(true);
    fetchDistrictOptions(city)
      .then((items) => active && setDistricts(items))
      .catch(() => active && setDistricts([]))
      .finally(() => active && setDistrictLoading(false));

    return () => {
      active = false;
    };
  }, [city]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<ChannelResponse>("/project-sales/agent-channel", {
        params: {
          city: city || undefined,
          district: district || undefined,
          unitType: unitType || undefined,
          roomCount: roomCount || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          limit: 100,
        },
      });
      setData(response.data);
    } catch {
      setData(null);
      setError("EPH Emlakçı Satış Kanalı yüklenemedi. Hesap rolünüzü veya bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  }, [city, district, maxPrice, minPrice, roomCount, unitType]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedItems = useMemo(
    () =>
      [...(data?.items || [])].sort((left, right) => {
        if (right.crmHint.directMatchCount !== left.crmHint.directMatchCount) {
          return right.crmHint.directMatchCount - left.crmHint.directMatchCount;
        }
        return right.price - left.price;
      }),
    [data],
  );

  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-[calc(96px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-[calc(18px+env(safe-area-inset-top))] sm:px-6">
        <header className="mb-5 rounded-[28px] border border-blue-100 bg-white p-5 text-center shadow-sm sm:p-7">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-blue-100">
            <Building2 size={22} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">EPH Emlakçı Satış Kanalı</h1>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Müteahhit ve inşaat firmalarının satışa açtığı proje stoklarını tek ekranda inceleyin. Kendi CRM taleplerinizle doğrudan uyuşan stoklar otomatik öne çıkarılır.
          </p>
        </header>

        <section className="mb-5 rounded-[24px] border border-[#D8E4F3] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-center gap-2 text-sm font-black">
            <Filter size={17} className="text-[#2563EB]" />
            Satış Kanalı Filtreleri
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <select value={city} disabled={locationLoading} onChange={(e) => setCity(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
              <option value="">Tüm şehirler</option>
              {cities.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
            <select value={district} disabled={!city || districtLoading} onChange={(e) => setDistrict(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold disabled:bg-slate-50">
              <option value="">Tüm ilçeler</option>
              {districts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
            <select value={unitType} onChange={(e) => setUnitType(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
              {TYPE_OPTIONS.map(([value, text]) => <option key={value || "all"} value={value}>{text}</option>)}
            </select>
            <input value={roomCount} onChange={(e) => setRoomCount(e.target.value)} placeholder="Oda: 2+1" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold" />
            <input value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="Min. fiyat" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold" />
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="Maks. fiyat" className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold" />
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="mx-auto mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-black text-white disabled:opacity-60">
            {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
            Sonuçları Yenile
          </button>
        </section>

        {error ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

        {data ? (
          <section className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-blue-100 bg-white p-4 text-center shadow-sm"><div className="text-2xl font-black text-[#2563EB]">{data.summary.visibleUnitCount}</div><div className="mt-1 text-xs font-bold text-slate-500">Açık Stok</div></div>
            <div className="rounded-2xl border border-violet-100 bg-white p-4 text-center shadow-sm"><div className="text-2xl font-black text-violet-600">{data.summary.unitsWithDirectCrmMatch}</div><div className="mt-1 text-xs font-bold text-slate-500">CRM Uyumlu Stok</div></div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 text-center shadow-sm"><div className="text-2xl font-black text-emerald-600">{data.summary.directCrmMatchCount}</div><div className="mt-1 text-xs font-bold text-slate-500">Doğrudan Eşleşme</div></div>
          </section>
        ) : null}

        {loading && !data ? (
          <div className="grid min-h-72 place-items-center rounded-[24px] border border-[#D8E4F3] bg-white"><div className="text-center text-sm font-bold text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin text-[#2563EB]" size={28} />Satış stoku hazırlanıyor…</div></div>
        ) : sortedItems.length === 0 ? (
          <div className="rounded-[24px] border border-[#D8E4F3] bg-white p-10 text-center"><Search className="mx-auto mb-3 text-slate-400" size={28} /><h2 className="font-black">Filtrelere uygun açık proje stoku bulunamadı.</h2><p className="mt-2 text-sm text-slate-500">Konum, fiyat veya tip filtresini genişletin.</p></div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedItems.map((item) => {
              const displayArea = item.netArea || item.grossArea || item.area;
              return (
                <article key={item.unitId} className="overflow-hidden rounded-[24px] border border-[#D8E4F3] bg-white shadow-sm">
                  <div className="relative aspect-[16/9] bg-[#EAF2FF]">
                    {item.coverImage ? <img src={item.coverImage} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-blue-300"><Building2 size={42} /></div>}
                    {item.crmHint.directMatchCount > 0 ? <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-black text-white shadow"><Sparkles size={13} />CRM: {item.crmHint.directMatchCount} eşleşme</div> : null}
                    <div className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black text-white">{label(item.status)}</div>
                  </div>

                  <div className="p-4">
                    <div className="text-center">
                      <div className="text-xs font-black uppercase tracking-wide text-[#2563EB]">{label(item.type)}</div>
                      <h2 className="mt-1 line-clamp-2 text-base font-black">{item.project.name}</h2>
                      <div className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-slate-500"><MapPin size={14} />{[item.project.city, item.project.district, item.project.neighborhood].filter(Boolean).join(" / ")}</div>
                    </div>

                    <div className="my-4 text-center text-xl font-black text-[#1F2937]">{money(item.price, item.priceCurrency)}</div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-[#F4F8FF] p-2"><div className="text-slate-400">Oda</div><div className="mt-1 font-black">{item.roomCount || "—"}</div></div>
                      <div className="rounded-xl bg-[#F4F8FF] p-2"><div className="text-slate-400">Net / Alan</div><div className="mt-1 font-black">{displayArea ? `${displayArea} m²` : "—"}</div></div>
                      <div className="rounded-xl bg-[#F4F8FF] p-2"><div className="text-slate-400">Kat</div><div className="mt-1 truncate font-black">{item.floorLabel || item.floor ?? "—"}</div></div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link href="/crm" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-3 text-xs font-black text-white"><UsersRound size={15} />CRM ile Eşleştir</Link>
                      <Link href="/havuz" className="inline-flex h-11 items-center justify-center rounded-xl border border-blue-200 px-4 text-xs font-black text-[#2563EB]">Havuz</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} />
          <p><strong>Mahremiyet koruması:</strong> satış kanalında proje sahibinin kimliği, iletişim bilgileri, tapu sahibi bilgileri ve açık adres gösterilmez. CRM eşleşme sayısı yalnızca sizin kendi aktif müşteri talepleriniz üzerinden hesaplanır.</p>
        </div>
      </div>
    </main>
  );
}
