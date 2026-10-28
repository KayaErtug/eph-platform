import { BadRequestException } from "@nestjs/common";

type Location = {
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
};
const provinces: readonly string[] = [
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
  "KKTC",
];
const key = (value: string) =>
  value.normalize("NFC").toLocaleLowerCase("tr-TR");
function text(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string")
    throw new BadRequestException(`${label} geçersiz.`);
  const clean = value.normalize("NFC").trim().replace(/\s+/g, " ");
  if (clean.length > 160)
    throw new BadRequestException(`${label} en fazla 160 karakter olabilir.`);
  return clean || null;
}

/** State-only legacy updates do not require location; edits clear stale descendants. */
export function officeLocationData(
  body: Location,
  previous?: Location,
): Location {
  const touched = ["city", "district", "neighborhood"].some(
    (field) => body[field] !== undefined,
  );
  if (previous && !touched) return {};
  const requestedCity = text(
    body.city === undefined && previous ? previous.city : body.city,
    "İl",
  );
  if (!requestedCity) throw new BadRequestException("İl seçimi zorunludur.");
  const city = provinces.find((name) => key(name) === key(requestedCity));
  if (!city) throw new BadRequestException("Listeden geçerli bir il seçin.");
  const cityChanged = !previous?.city || key(previous.city) !== key(city);
  const district = text(
    body.district !== undefined
      ? body.district
      : cityChanged
        ? null
        : previous?.district,
    "İlçe",
  );
  const districtChanged =
    cityChanged || (previous?.district || null) !== district;
  const neighborhood = text(
    body.neighborhood !== undefined
      ? body.neighborhood
      : districtChanged
        ? null
        : previous?.neighborhood,
    "Mahalle",
  );
  if (neighborhood && !district)
    throw new BadRequestException("Mahalle seçmek için önce ilçe seçin.");
  return { city, district, neighborhood };
}
