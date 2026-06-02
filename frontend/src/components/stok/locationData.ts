export type LocationOption = {
  id: string;
  name: string;
};

const API_BASE = "https://api.turkiyeapi.dev/v1";

const KKTC_PROVINCE: LocationOption = { id: "kktc", name: "KKTC" };

const KKTC_DISTRICTS: LocationOption[] = [
  { id: "kktc-lefkosa", name: "Lefkoşa" },
  { id: "kktc-gazimagusa", name: "Gazimağusa" },
  { id: "kktc-girne", name: "Girne" },
  { id: "kktc-guzelyurt", name: "Güzelyurt" },
  { id: "kktc-iskele", name: "İskele" },
  { id: "kktc-lefke", name: "Lefke" },
];

const KKTC_PLACES: Record<string, LocationOption[]> = {
  Lefkoşa: [
    "Kumsal",
    "Küçük Kaymaklı",
    "Gönyeli",
    "Hamitköy",
    "Haspolat",
    "Ortaköy",
    "Yenikent",
  ].map((name) => ({ id: `kktc-place-${name}`, name })),
  Gazimağusa: [
    "Maraş",
    "Sakarya",
    "Karakol",
    "Tuzla",
    "Yeniboğaziçi",
    "İskele Yolu",
  ].map((name) => ({ id: `kktc-place-${name}`, name })),
  Girne: [
    "Alsancak",
    "Lapta",
    "Karaoğlanoğlu",
    "Ozanköy",
    "Çatalköy",
    "Bellapais",
    "Esentepe",
  ].map((name) => ({ id: `kktc-place-${name}`, name })),
  Güzelyurt: ["Merkez", "Bostancı", "Zümrütköy", "Yayla", "Akçay"].map(
    (name) => ({ id: `kktc-place-${name}`, name }),
  ),
  İskele: [
    "Merkez",
    "Long Beach",
    "Boğaz",
    "Yeni Erenköy",
    "Bafra",
    "Dipkarpaz",
  ].map((name) => ({ id: `kktc-place-${name}`, name })),
  Lefke: ["Merkez", "Gemikonağı", "Yeşilyurt", "Doğancı", "Yedidalga"].map(
    (name) => ({ id: `kktc-place-${name}`, name }),
  ),
};

const FALLBACK_PROVINCES = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Amasya",
  "Ankara",
  "Antalya",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkari",
  "Hatay",
  "Isparta",
  "Mersin",
  "İstanbul",
  "İzmir",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Kahramanmaraş",
  "Mardin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Şanlıurfa",
  "Uşak",
  "Van",
  "Yozgat",
  "Zonguldak",
  "Aksaray",
  "Bayburt",
  "Karaman",
  "Kırıkkale",
  "Batman",
  "Şırnak",
  "Bartın",
  "Ardahan",
  "Iğdır",
  "Yalova",
  "Karabük",
  "Kilis",
  "Osmaniye",
  "Düzce",
].map((name, index) => ({ id: String(index + 1), name }));

function toTitleCaseTR(value: string) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|\s|\/|-)(\S)/g, (match) => match.toLocaleUpperCase("tr-TR"));
}

function normalizeList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function toOption(item: any, fallbackIndex: number): LocationOption {
  const name =
    item?.name ||
    item?.title ||
    item?.text ||
    item?.label ||
    item?.mahalle ||
    item?.koy ||
    item?.village ||
    item?.neighborhood ||
    "";
  const id =
    item?.id ||
    item?.code ||
    item?.districtId ||
    item?.provinceId ||
    `${name}-${fallbackIndex}`;
  return { id: String(id), name: toTitleCaseTR(name) };
}

async function getJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`Konum verisi alınamadı: ${response.status}`);
  return response.json();
}

function sortOptions(options: LocationOption[]) {
  return options
    .filter((option) => option.name)
    .filter(
      (option, index, all) =>
        all.findIndex((item) => item.name === option.name) === index,
    )
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export async function fetchProvinceOptions(): Promise<LocationOption[]> {
  try {
    const payload = await getJson(`${API_BASE}/provinces?limit=100&sort=name`);
    return [
      ...sortOptions(normalizeList(payload).map(toOption)),
      KKTC_PROVINCE,
    ];
  } catch {
    return [...FALLBACK_PROVINCES, KKTC_PROVINCE];
  }
}

export async function fetchDistrictOptions(
  provinceName: string,
): Promise<LocationOption[]> {
  if (!provinceName) return [];
  if (provinceName === "KKTC") return KKTC_DISTRICTS;

  try {
    const payload = await getJson(
      `${API_BASE}/districts?province=${encodeURIComponent(provinceName)}&limit=1000&sort=name`,
    );
    return sortOptions(normalizeList(payload).map(toOption));
  } catch {
    return [];
  }
}

export async function fetchPlaceOptions(
  provinceName: string,
  districtName: string,
): Promise<LocationOption[]> {
  if (!provinceName || !districtName) return [];
  if (provinceName === "KKTC") return KKTC_PLACES[districtName] || [];

  try {
    const [neighborhoodPayload, villagePayload, townPayload] =
      await Promise.allSettled([
        getJson(
          `${API_BASE}/neighborhoods?province=${encodeURIComponent(provinceName)}&district=${encodeURIComponent(districtName)}&limit=5000&sort=name`,
        ),
        getJson(
          `${API_BASE}/villages?province=${encodeURIComponent(provinceName)}&district=${encodeURIComponent(districtName)}&limit=5000&sort=name`,
        ),
        getJson(
          `${API_BASE}/towns?province=${encodeURIComponent(provinceName)}&district=${encodeURIComponent(districtName)}&limit=5000&sort=name`,
        ),
      ]);

    const neighborhoods =
      neighborhoodPayload.status === "fulfilled"
        ? normalizeList(neighborhoodPayload.value).map(toOption)
        : [];
    const villages =
      villagePayload.status === "fulfilled"
        ? normalizeList(villagePayload.value).map(toOption)
        : [];
    const towns =
      townPayload.status === "fulfilled"
        ? normalizeList(townPayload.value).map(toOption)
        : [];

    return sortOptions([...neighborhoods, ...villages, ...towns]);
  } catch {
    return [];
  }
}
