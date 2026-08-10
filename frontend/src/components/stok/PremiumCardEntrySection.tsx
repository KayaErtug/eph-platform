"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import {
  BadgeCheck,
  BedDouble,
  Building2,
  Car,
  CheckCircle2,
  CircleGauge,
  Flame,
  Home,
  Layers3,
  MapPin,
  Maximize2,
  Mountain,
  Ruler,
  Sparkles,
  Waves,
} from "lucide-react";

import {
  buildEphPremiumCardData,
  type EphCardFact,
  type EphCardIconKey,
} from "@/components/portfolio/ephPremiumCardStandard";
import type {
  ProjectFormState,
  UnitFormState,
} from "@/components/stok/stokTypes";

type Props = {
  unitForm: UnitFormState;
  projectForm: ProjectFormState;
  setUnitForm: Dispatch<SetStateAction<UnitFormState>>;
};

type ExtraFieldDefinition = {
  factKeys: string[];
  stateKey: string;
  label: string;
  type: "select" | "number" | "text";
  options?: string[];
  placeholder?: string;
  suffix?: string;
};

const HEATING_OPTIONS = [
  "Kombi Doğalgaz",
  "Merkezi Sistem",
  "Merkezi Sistem (Pay Ölçer)",
  "Yerden Isıtma",
  "Klima",
  "Isı Pompası",
  "Soba",
  "Şömine",
  "Güneş Enerjisi",
  "Yok",
];

const PARKING_OPTIONS = [
  "Kapalı Otopark",
  "Açık Otopark",
  "Açık + Kapalı Otopark",
  "Araç Park Yeri",
  "Otopark Yok",
];

const FRONT_OPTIONS = [
  "Güney",
  "Kuzey",
  "Doğu",
  "Batı",
  "Kuzeydoğu",
  "Kuzeybatı",
  "Güneydoğu",
  "Güneybatı",
  "Çift Cephe",
  "Köşe Parsel",
  "Cadde Cepheli",
];

const VIEW_OPTIONS = [
  "Deniz",
  "Boğaz",
  "Doğa",
  "Dağ",
  "Göl",
  "Nehir",
  "Şehir",
  "Havuz",
  "Park & Yeşil Alan",
  "Vadi",
  "Panoramik",
  "Marina",
];

const EXTRA_FIELD_DEFINITIONS: ExtraFieldDefinition[] = [
  {
    factKeys: ["heatingType", "heating"],
    stateKey: "heatingType",
    label: "Isınma Türü",
    type: "select",
    options: HEATING_OPTIONS,
  },
  {
    factKeys: ["parkingType", "parking"],
    stateKey: "parkingType",
    label: "Otopark",
    type: "select",
    options: PARKING_OPTIONS,
  },
  {
    factKeys: ["front"],
    stateKey: "front",
    label: "Cephe",
    type: "select",
    options: FRONT_OPTIONS,
  },
  {
    factKeys: ["elevator"],
    stateKey: "elevator",
    label: "Asansör",
    type: "select",
    options: ["Var", "Yok"],
  },
  {
    factKeys: ["landArea"],
    stateKey: "landArea",
    label: "Arsa Alanı",
    type: "number",
    placeholder: "Örn: 420",
    suffix: "m²",
  },
  {
    factKeys: ["gardenArea"],
    stateKey: "gardenArea",
    label: "Bahçe Alanı",
    type: "number",
    placeholder: "Örn: 250",
    suffix: "m²",
  },
  {
    factKeys: ["seasonUsage"],
    stateKey: "seasonUsage",
    label: "Kullanım Şekli",
    type: "select",
    options: ["Sezonluk", "Yıl Boyu", "Dönemsel"],
  },
  {
    factKeys: ["view"],
    stateKey: "view",
    label: "Manzara",
    type: "select",
    options: VIEW_OPTIONS,
  },
  {
    factKeys: ["restorationStatus"],
    stateKey: "restorationStatus",
    label: "Restorasyon Durumu",
    type: "select",
    options: [
      "Restore Edilmiş",
      "Bakımlı",
      "Kısmi Tadilat Gerekli",
      "Restorasyon Gerekli",
    ],
  },
  {
    factKeys: ["unitCount"],
    stateKey: "unitCount",
    label: "Bağımsız Bölüm Sayısı",
    type: "number",
    placeholder: "Örn: 12",
  },
  {
    factKeys: ["infrastructure"],
    stateKey: "infrastructure",
    label: "Altyapı Özeti",
    type: "text",
    placeholder: "Örn: Su, elektrik ve doğalgaz mevcut",
  },
  {
    factKeys: ["road"],
    stateKey: "road",
    label: "Yol Durumu",
    type: "select",
    options: [
      "Asfalt Yol",
      "Stabilize Yol",
      "Kadastral Yolu Var",
      "Yola Cepheli",
      "Yol Yok",
    ],
  },
  {
    factKeys: ["commercialValue"],
    stateKey: "commercialValue",
    label: "Ticari Değer",
    type: "select",
    options: [
      "Cadde Üzeri",
      "Köşe Konum",
      "Tabela Değeri Yüksek",
      "Yaya Trafiği Yoğun",
      "Araç Trafiği Yoğun",
    ],
  },
];

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function isCompletedValue(value: unknown) {
  const normalized = clean(value).toLocaleLowerCase("tr-TR");

  return Boolean(
    normalized &&
      !["—", "-", "bilgi yok", "seçilmedi", "belirtilmedi"].includes(
        normalized,
      ),
  );
}

function iconForFact(icon: EphCardIconKey) {
  const className = "h-[18px] w-[18px]";

  if (icon === "room") return <BedDouble className={className} />;
  if (icon === "area") return <Maximize2 className={className} />;
  if (icon === "floor") return <Layers3 className={className} />;
  if (icon === "age") return <Building2 className={className} />;
  if (icon === "heating") return <Flame className={className} />;
  if (icon === "parking") return <Car className={className} />;
  if (icon === "front") return <CircleGauge className={className} />;
  if (icon === "elevator") return <Building2 className={className} />;
  if (icon === "home") return <Home className={className} />;
  if (icon === "layout") return <Layers3 className={className} />;
  if (icon === "land") return <Ruler className={className} />;
  if (icon === "view") return <Mountain className={className} />;
  if (icon === "pool") return <Waves className={className} />;
  if (icon === "zoning") return <MapPin className={className} />;
  if (icon === "parcel") return <MapPin className={className} />;

  return <BadgeCheck className={className} />;
}

function getRelevantExtraFields(facts: EphCardFact[]) {
  const result: ExtraFieldDefinition[] = [];
  const usedStateKeys = new Set<string>();

  facts.forEach((fact) => {
    const definition = EXTRA_FIELD_DEFINITIONS.find((item) =>
      item.factKeys.includes(fact.key),
    );

    if (!definition || usedStateKeys.has(definition.stateKey)) return;

    usedStateKeys.add(definition.stateKey);
    result.push(definition);
  });

  return result;
}

export default function PremiumCardEntrySection({
  unitForm,
  projectForm,
  setUnitForm,
}: Props) {
  const cardData = useMemo(
    () =>
      buildEphPremiumCardData({
        ...(unitForm as Record<string, unknown>),
        id: "EPH-PREVIEW",
        project: {
          name: projectForm.name || "Yeni Portföy",
          city: projectForm.city,
          district: projectForm.district,
          address: projectForm.address,
        },
      }),
    [projectForm, unitForm],
  );

  const completedCount = cardData.facts.filter((fact) =>
    isCompletedValue(fact.value),
  ).length;
  const completionPercent = Math.round(
    (completedCount / Math.max(1, cardData.facts.length)) * 100,
  );
  const extraFields = useMemo(
    () => getRelevantExtraFields(cardData.facts),
    [cardData.facts],
  );

  const setField = (key: string, value: string) => {
    setUnitForm(
      (current) =>
        ({
          ...(current as Record<string, unknown>),
          [key]: value,
        }) as UnitFormState,
    );
  };

  return (
    <section className="col-span-full overflow-hidden rounded-[30px] border-2 border-[#B8C7F5] bg-[linear-gradient(145deg,#06194A_0%,#0B2A72_48%,#1557D6_100%)] p-3 shadow-[0_24px_54px_rgba(6,25,74,0.24)]">
      <div className="rounded-[24px] border border-white/14 bg-white/[0.08] p-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8FC5FF]">
              EPH Premium Kart Standardı
            </p>
            <h2 className="mt-1 text-[18px] font-black tracking-[-0.03em] text-white">
              Kartta Görünecek 8 Temel Bilgi
            </h2>
            <p className="mt-1 text-[11px] font-bold leading-5 text-white/68">
              Bu alanlar Portföy, Havuz, CRM, Talep Merkezi ve müşteri paylaşım
              kartlarında aynı sırayla kullanılır.
            </p>
          </div>

          <div className="flex h-[62px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[20px] border border-white/18 bg-white/10 text-center text-white shadow-[0_14px_30px_rgba(0,0,0,0.14)]">
            <span className="text-[20px] font-black leading-none">
              {completedCount}/8
            </span>
            <span className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/60">
              Tamam
            </span>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#38BDF8,#FFFFFF)] transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {cardData.facts.slice(0, 8).map((fact, index) => {
            const completed = isCompletedValue(fact.value);

            return (
              <div
                key={`${fact.key}-${index}`}
                className={`relative min-h-[92px] overflow-hidden rounded-[20px] border p-3 text-center transition ${
                  completed
                    ? "border-white/18 bg-white text-[#06194A]"
                    : "border-amber-300/45 bg-amber-50/95 text-[#7C3E00]"
                }`}
              >
                <span
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-[12px] ${
                    completed
                      ? "bg-[#EFF6FF] text-[#1557D6]"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {completed ? iconForFact(fact.icon) : <Sparkles size={17} />}
                </span>
                <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] opacity-60">
                  {fact.label}
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] font-black leading-4">
                  {completed ? fact.value : "Eksik bilgi"}
                </p>
                {completed && (
                  <CheckCircle2
                    size={13}
                    className="absolute right-2 top-2 text-emerald-600"
                  />
                )}
              </div>
            );
          })}
        </div>

        {extraFields.length > 0 && (
          <div className="mt-3 rounded-[22px] border border-white/16 bg-white p-3">
            <div className="mb-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1557D6]">
                Kartı Tamamlayan Seçimler
              </p>
              <p className="mt-1 text-[10px] font-bold leading-4 text-[#64748B]">
                Oda, alan, kat ve bina yaşı aşağıdaki temel bilgi bölümünden;
                diğer kart bilgileri buradan alınır.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {extraFields.map((field) => {
                const value = clean(
                  (unitForm as unknown as Record<string, unknown>)[field.stateKey],
                );

                return (
                  <label
                    key={field.stateKey}
                    className="rounded-[18px] border border-[#D7E1EF] bg-[#F8FAFC] p-2"
                  >
                    <span className="mb-1.5 block text-center text-[9px] font-black uppercase tracking-[0.1em] text-[#64748B]">
                      {field.label}
                    </span>

                    {field.type === "select" ? (
                      <select
                        value={value}
                        onChange={(event) =>
                          setField(field.stateKey, event.target.value)
                        }
                        className="min-h-[42px] w-full rounded-[14px] border border-[#BFD0E5] bg-white px-2 text-center text-[12px] font-black text-[#06194A] outline-none focus:border-[#1557D6]"
                      >
                        <option value="">Seçiniz</option>
                        {(field.options || []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type}
                          inputMode={field.type === "number" ? "numeric" : undefined}
                          value={value}
                          onChange={(event) =>
                            setField(field.stateKey, event.target.value)
                          }
                          placeholder={field.placeholder}
                          className="min-h-[42px] w-full rounded-[14px] border border-[#BFD0E5] bg-white px-2 text-center text-[12px] font-black text-[#06194A] outline-none placeholder:text-[#94A3B8] focus:border-[#1557D6]"
                        />
                        {field.suffix && (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#64748B]">
                            {field.suffix}
                          </span>
                        )}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
