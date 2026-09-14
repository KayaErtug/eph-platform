"use client";

import {
  ArrowLeft,
  Building2,
  CircleAlert,
  Flame,
  Loader2,
  MapPin,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  fetchDistrictOptions,
  fetchProvinceOptions,
  type LocationOption,
} from "@/components/stok/locationData";
import api from "@/lib/api";

type CountItem = {
  key: string;
  count: number;
  sharePercent: number;
  demandScore: number;
};

type NumericStats = {
  sampleCount: number;
  minimum: number | null;
  median: number | null;
  average: number | null;
  maximum: number | null;
};

type DemandHeatmapResponse = {
  generatedAt: string;
  period: {
    days: number;
    from: string;
    to: string;
  };
  filters: {
    city: string | null;
    district: string | null;
  };
  summary: {
    activeRequestCount: number;
    saleRequestCount: number;
    rentRequestCount: number;
    sourceRowLimit: number;
    sourceRowsScanned: number;
    sourceLimitReached: boolean;
    privacyMinimumCohort: number;
  };
  locations: {
    cities: CountItem[];
    districts: CountItem[];
    neighborhoods: CountItem[];
  };
  propertyTypes: CountItem[];
  roomCounts: CountItem[];
  budgetByCurrency: Array<
    NumericStats & {
      currency: string;
    }
  >;
  area: NumericStats;
  privacy: {
    identityFieldsIncluded: false;
    titlesIncluded: false;
    descriptionsIncluded: false;
    phoneOrEmailIncluded: false;
    neighborhoodMinimumCohort: number;
    aggregateOnly: true;
  };
  policy: {
    version: string;
    source: string;
    includesPrivateCrm: false;
    includesExpiredRequests: false;
    connectionOnlyRequestsExcluded: true;
  };
};

const PERIOD_OPTIONS = [7, 14, 30, 60, 90];

function formatNumber(value: number | null, maximumFractionDigits = 0) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits }).format(value);
}

function formatMoney(value: number | null, currency: string) {
  if (value == null || !Number.isFinite(value)) return "—";

  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${formatNumber(value)} ${currency || "TRY"}`;
  }
}

function prettifyKey(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|\s)(\S)/g, (part) => part.toLocaleUpperCase("tr-TR"));
}

function DemandBars({ title, items }: { title: string; items: CountItem[] }) {
  return (
    <section className="rounded-[24px] border border-[#D8E4F3] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-center text-sm font-black text-[#1F2937]">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-center text-sm text-slate-500">Bu kırılım için yeterli veri yok.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.slice(0, 12).map((item) => (
            <div key={item.key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-bold text-slate-700" title={item.key}>
                  {prettifyKey(item.key)}
                </span>
                <span className="shrink-0 font-black text-[#2563EB]">
                  {item.count} talep · %{formatNumber(item.sharePercent, 1)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF4FB]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                  style={{ width: `${Math.max(4, Math.min(100, item.demandScore))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProjectSalesDemandHeatmapPage() {
  const router = useRouter();
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DemandHeatmapResponse | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingLocations(true);

    fetchProvinceOptions()
      .then((items) => {
        if (active) setCities(items);
      })
      .catch(() => {
        if (active) setCities([]);
      })
      .finally(() => {
        if (active) setLoadingLocations(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setDistrict("");
    setDistricts([]);

    if (!city) {
      setLoadingDistricts(false);
      return;
    }

    setLoadingDistricts(true);
    fetchDistrictOptions(city)
      .then((items) => {
        if (active) setDistricts(items);
      })
      .catch(() => {
        if (active) setDistricts([]);
      })
      .finally(() => {
        if (active) setLoadingDistricts(false);
      });

    return () => {
      active = false;
    };
  }, [city]);

  const loadHeatmap = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<DemandHeatmapResponse>("/project-sales/demand-heatmap", {
        params: {
          city: city || undefined,
          district: district || undefined,
          days,
        },
      });
      setData(response.data);
    } catch {
      setData(null);
      setError("Talep Isı Haritası oluşturulamadı. Erişim yetkinizi veya bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  }, [city, district, days]);

  useEffect(() => {
    void loadHeatmap();
  }, [loadHeatmap]);

  const topLocation = useMemo(() => {
    if (!data) return null;
    return data.locations.neighborhoods[0] || data.locations.districts[0] || data.locations.cities[0] || null;
  }, [data]);

  return (
    <main className="min-h-screen bg-[#F4F8FF] pb-[calc(112px+env(safe-area-inset-bottom))] text-[#1F2937]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-[calc(16px+env(safe-area-inset-top))] sm:px-6">
        <header className="relative mb-5 rounded-[28px] border border-blue-100 bg-white px-4 py-5 shadow-sm sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/proje-satis-sablonu")}
            className="absolute left-4 top-5 grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 active:scale-95"
            aria-label="Proje Satış Merkezine dön"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="mx-auto max-w-3xl px-10 text-center">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-100">
              <Flame size={21} />
            </div>
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">Talep Isı Haritası</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Talep Merkezi verisini anonim ve toplulaştırılmış biçimde analiz ederek hangi bölgelerde, hangi gayrimenkul tiplerinde ve hangi bütçe aralıklarında talep olduğunu gösterir.
            </p>
          </div>
        </header>

        <section className="mb-5 rounded-[24px] border border-[#D8E4F3] bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-600">İl / Şehir</span>
              <select
                value={city}
                disabled={loadingLocations}
                onChange={(event) => setCity(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400"
              >
                <option value="">Tüm Türkiye + KKTC</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-600">İlçe</span>
              <select
                value={district}
                disabled={!city || loadingDistricts}
                onChange={(event) => setDistrict(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Tüm ilçeler</option>
                {districts.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-600">Dönem</span>
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="h-12 min-w-32 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Son {option} gün
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void loadHeatmap()}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-black text-white shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
              Yenile
            </button>
          </div>
        </section>

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleAlert className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        {loading && !data ? (
          <div className="grid min-h-64 place-items-center rounded-[24px] border border-[#D8E4F3] bg-white">
            <div className="text-center text-sm font-bold text-slate-500">
              <Loader2 className="mx-auto mb-3 animate-spin text-[#2563EB]" size={28} />
              Talep yoğunluğu analiz ediliyor…
            </div>
          </div>
        ) : data ? (
          <div className="space-y-5">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-[22px] border border-blue-100 bg-white p-4 text-center shadow-sm">
                <Search className="mx-auto mb-2 text-[#2563EB]" size={20} />
                <div className="text-2xl font-black">{formatNumber(data.summary.activeRequestCount)}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">Aktif Talep</div>
              </div>
              <div className="rounded-[22px] border border-emerald-100 bg-white p-4 text-center shadow-sm">
                <Building2 className="mx-auto mb-2 text-emerald-600" size={20} />
                <div className="text-2xl font-black">{formatNumber(data.summary.saleRequestCount)}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">Satılık Talebi</div>
              </div>
              <div className="rounded-[22px] border border-violet-100 bg-white p-4 text-center shadow-sm">
                <WalletCards className="mx-auto mb-2 text-violet-600" size={20} />
                <div className="text-2xl font-black">{formatNumber(data.summary.rentRequestCount)}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">Kiralık Talebi</div>
              </div>
              <div className="rounded-[22px] border border-orange-100 bg-white p-4 text-center shadow-sm">
                <MapPin className="mx-auto mb-2 text-orange-600" size={20} />
                <div className="truncate text-base font-black" title={topLocation?.key || "—"}>
                  {topLocation ? prettifyKey(topLocation.key) : "—"}
                </div>
                <div className="mt-1 text-xs font-bold text-slate-500">En Yoğun Bölge</div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <DemandBars title="Bölgesel Talep Yoğunluğu" items={data.locations.neighborhoods.length > 0 ? data.locations.neighborhoods : data.locations.districts.length > 0 ? data.locations.districts : data.locations.cities} />
              <DemandBars title="Gayrimenkul Tipi Talebi" items={data.propertyTypes} />
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <DemandBars title="Oda Sayısı Talebi" items={data.roomCounts} />

              <div className="rounded-[24px] border border-[#D8E4F3] bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-center text-sm font-black">Bütçe Aralıkları</h2>
                {data.budgetByCurrency.length === 0 ? (
                  <p className="mt-4 text-center text-sm text-slate-500">Bütçe istatistiği için yeterli örnek yok.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.budgetByCurrency.map((item) => (
                      <div key={item.currency} className="rounded-2xl border border-slate-100 bg-[#F8FBFF] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black">{item.currency}</span>
                          <span className="text-xs font-bold text-slate-500">{item.sampleCount} örnek</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                          <div><div className="text-slate-400">Min.</div><div className="mt-1 font-black">{formatMoney(item.minimum, item.currency)}</div></div>
                          <div><div className="text-slate-400">Medyan</div><div className="mt-1 font-black">{formatMoney(item.median, item.currency)}</div></div>
                          <div><div className="text-slate-400">Ortalama</div><div className="mt-1 font-black">{formatMoney(item.average, item.currency)}</div></div>
                          <div><div className="text-slate-400">Maks.</div><div className="mt-1 font-black">{formatMoney(item.maximum, item.currency)}</div></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[24px] border border-[#D8E4F3] bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-center gap-2">
                  <Ruler size={18} className="text-[#2563EB]" />
                  <h2 className="text-sm font-black">Aranan Alan / m²</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-[#F8FBFF] p-3 text-center"><div className="text-xs text-slate-400">Min.</div><div className="mt-1 font-black">{formatNumber(data.area.minimum)} m²</div></div>
                  <div className="rounded-2xl bg-[#F8FBFF] p-3 text-center"><div className="text-xs text-slate-400">Medyan</div><div className="mt-1 font-black">{formatNumber(data.area.median)} m²</div></div>
                  <div className="rounded-2xl bg-[#F8FBFF] p-3 text-center"><div className="text-xs text-slate-400">Ortalama</div><div className="mt-1 font-black">{formatNumber(data.area.average)} m²</div></div>
                  <div className="rounded-2xl bg-[#F8FBFF] p-3 text-center"><div className="text-xs text-slate-400">Maks.</div><div className="mt-1 font-black">{formatNumber(data.area.maximum)} m²</div></div>
                </div>
              </div>

              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><ShieldCheck size={20} /></div>
                  <div>
                    <h2 className="text-sm font-black text-emerald-900">Mahremiyet Koruması Aktif</h2>
                    <p className="mt-1.5 text-sm leading-6 text-emerald-800">
                      Bu ekran yalnızca toplulaştırılmış Talep Merkezi verisini gösterir. Kullanıcı kimliği, başlık, açıklama, telefon ve e-posta bilgileri API yanıtına dahil edilmez. Mahalle ve hassas sayısal kırılımlar en az {data.summary.privacyMinimumCohort} kayıt olduğunda gösterilir.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {data.summary.sourceLimitReached ? (
              <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Analiz kaynak tarama limitine ulaştı. Sonuçlar en güncel {formatNumber(data.summary.sourceRowLimit)} aktif Talep Merkezi kaydı üzerinden hesaplandı.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
