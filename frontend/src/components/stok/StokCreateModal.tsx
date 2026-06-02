
"use client";

import { useMemo, useRef, useState } from "react";
import { CITIES, ROOM_COUNT_OPTIONS, STATUS_LABELS, TYPE_LABELS } from "./stokConstants";
import type { LocalPortfolioImage, Project, ProjectFormState, UnitFormState } from "./stokTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (value: string) => void;
  projectForm: ProjectFormState;
  setProjectForm: React.Dispatch<React.SetStateAction<ProjectFormState>>;
  unitForm: UnitFormState;
  setUnitForm: React.Dispatch<React.SetStateAction<UnitFormState>>;
  formError: string;
  formSuccess: boolean;
  formLoading: boolean;
  coverImage: LocalPortfolioImage | null;
  setCoverImage: React.Dispatch<React.SetStateAction<LocalPortfolioImage | null>>;
  galleryImages: LocalPortfolioImage[];
  setGalleryImages: React.Dispatch<React.SetStateAction<LocalPortfolioImage[]>>;
  onSubmit: () => void;
}

const MAX_GALLERY_COUNT = 15;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_FILE_SIZE = 30 * 1024;
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;
const MAX_DESCRIPTION_LENGTH = 500;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PRICE_CURRENCIES = [
  { value: "TRY", label: "₺ Türk Lirası" },
  { value: "USD", label: "$ Amerikan Doları" },
  { value: "EUR", label: "€ Euro" },
  { value: "GBP", label: "£ İngiliz Sterlini" },
] as const;

const DISTRICTS_BY_CITY: Record<string, string[]> = {
  Denizli: [
    "Acıpayam",
    "Babadağ",
    "Baklan",
    "Bekilli",
    "Beyağaç",
    "Bozkurt",
    "Buldan",
    "Çal",
    "Çameli",
    "Çardak",
    "Çivril",
    "Güney",
    "Honaz",
    "Kale",
    "Merkezefendi",
    "Pamukkale",
    "Sarayköy",
    "Serinhisar",
    "Tavas",
  ],
  İzmir: [
    "Aliağa",
    "Balçova",
    "Bayındır",
    "Bayraklı",
    "Bergama",
    "Beydağ",
    "Bornova",
    "Buca",
    "Çeşme",
    "Çiğli",
    "Dikili",
    "Foça",
    "Gaziemir",
    "Güzelbahçe",
    "Karabağlar",
    "Karaburun",
    "Karşıyaka",
    "Kemalpaşa",
    "Kınık",
    "Kiraz",
    "Konak",
    "Menderes",
    "Menemen",
    "Narlıdere",
    "Ödemiş",
    "Seferihisar",
    "Selçuk",
    "Tire",
    "Torbalı",
    "Urla",
  ],
  İstanbul: [
    "Adalar",
    "Arnavutköy",
    "Ataşehir",
    "Avcılar",
    "Bağcılar",
    "Bahçelievler",
    "Bakırköy",
    "Başakşehir",
    "Bayrampaşa",
    "Beşiktaş",
    "Beykoz",
    "Beylikdüzü",
    "Beyoğlu",
    "Büyükçekmece",
    "Çatalca",
    "Çekmeköy",
    "Esenler",
    "Esenyurt",
    "Eyüpsultan",
    "Fatih",
    "Gaziosmanpaşa",
    "Güngören",
    "Kadıköy",
    "Kağıthane",
    "Kartal",
    "Küçükçekmece",
    "Maltepe",
    "Pendik",
    "Sancaktepe",
    "Sarıyer",
    "Silivri",
    "Sultanbeyli",
    "Sultangazi",
    "Şile",
    "Şişli",
    "Tuzla",
    "Ümraniye",
    "Üsküdar",
    "Zeytinburnu",
  ],
  Ankara: [
    "Akyurt",
    "Altındağ",
    "Ayaş",
    "Bala",
    "Beypazarı",
    "Çamlıdere",
    "Çankaya",
    "Çubuk",
    "Elmadağ",
    "Etimesgut",
    "Evren",
    "Gölbaşı",
    "Güdül",
    "Haymana",
    "Kahramankazan",
    "Kalecik",
    "Keçiören",
    "Kızılcahamam",
    "Mamak",
    "Nallıhan",
    "Polatlı",
    "Pursaklar",
    "Sincan",
    "Şereflikoçhisar",
    "Yenimahalle",
  ],
  Aydın: [
    "Bozdoğan",
    "Buharkent",
    "Çine",
    "Didim",
    "Efeler",
    "Germencik",
    "İncirliova",
    "Karacasu",
    "Karpuzlu",
    "Koçarlı",
    "Köşk",
    "Kuşadası",
    "Kuyucak",
    "Nazilli",
    "Söke",
    "Sultanhisar",
    "Yenipazar",
  ],
  Muğla: [
    "Bodrum",
    "Dalaman",
    "Datça",
    "Fethiye",
    "Kavaklıdere",
    "Köyceğiz",
    "Marmaris",
    "Menteşe",
    "Milas",
    "Ortaca",
    "Seydikemer",
    "Ula",
    "Yatağan",
  ],
};

const FLOOR_OPTIONS = [
  "Kot -10",
  "Kot -9",
  "Kot -8",
  "Kot -7",
  "Kot -6",
  "Kot -5",
  "Kot -4",
  "Kot -3",
  "Kot -2",
  "Kot -1",
  "Bodrum 10",
  "Bodrum 9",
  "Bodrum 8",
  "Bodrum 7",
  "Bodrum 6",
  "Bodrum 5",
  "Bodrum 4",
  "Bodrum 3",
  "Bodrum 2",
  "Bodrum 1",
  "Yarı Bodrum",
  "Giriş Katı",
  "Zemin Kat",
  "Yüksek Giriş",
  "Bahçe Katı",
  "Bahçe Dubleksi",
  "Bahçe Terası",
  ...Array.from({ length: 80 }, (_, index) => `${index + 1}. Kat`),
  "Çatı Katı",
  "Çatı Dubleksi",
  "Çatı Tripleksi",
  "Teras Katı",
  "Teras Dubleksi",
  "Penthouse",
  "Asma Kat",
  "Ara Kat",
  "Ara Dubleks",
  "Villa Tipi",
  "Tek Kat Villa",
  "Dubleks Villa",
  "Tripleks Villa",
  "Müstakil",
  "Tam Müstakil",
  "Dükkan Girişi",
  "Çarşı Katı",
  "AVM Katı",
  "Plaza Katı",
  "Ofis Katı",
  "Depo Katı",
  "Sanayi Katı",
];

const TOTAL_FLOOR_OPTIONS = ["Belirtilmedi", ...Array.from({ length: 100 }, (_, index) => `${index + 1}`)];

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function isAcceptedImage(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .split(/(\s+|\/|-)/g)
    .map((part) => {
      if (/^\s+$/.test(part) || part === "/" || part === "-") return part;
      return part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1);
    })
    .join("");
}

function normalizeLongText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[.!?]\s+)([a-zçğıöşü])/g, (match) => match.toLocaleUpperCase("tr-TR"));
}

function onlyDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function formatPriceInput(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("tr-TR");
}

function getNumericPrice(value: string) {
  return Number(onlyDigits(value));
}

function getFloorNumericValue(label: string) {
  const normalFloor = label.match(/^(\d+)\. Kat$/);
  if (normalFloor) return normalFloor[1];

  const kotFloor = label.match(/^Kot -(\d+)$/);
  if (kotFloor) return `-${kotFloor[1]}`;

  const bodrumFloor = label.match(/^Bodrum (\d+)$/);
  if (bodrumFloor) return `-${bodrumFloor[1]}`;

  if (["Giriş Katı", "Zemin Kat", "Yüksek Giriş", "Bahçe Katı", "Bahçe Dubleksi", "Bahçe Terası", "Yarı Bodrum"].includes(label)) {
    return "0";
  }

  return "";
}

function getImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const result = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Görsel okunamadı."));
    };

    image.src = objectUrl;
  });
}

export default function StokCreateModal({
  open,
  onClose,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  projectForm,
  setProjectForm,
  unitForm,
  setUnitForm,
  formError,
  formSuccess,
  formLoading,
  coverImage,
  setCoverImage,
  galleryImages,
  setGalleryImages,
  onSubmit,
}: Props) {
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [imageError, setImageError] = useState("");
  const [smartError, setSmartError] = useState("");

  const selectedCityDistricts = DISTRICTS_BY_CITY[projectForm.city] || [];
  const selectedCurrency = unitForm.priceCurrency || "TRY";
  const currentDescriptionLength = unitForm.description.length;

  const totalSelectedImages = useMemo(() => {
    return (coverImage ? 1 : 0) + galleryImages.length;
  }, [coverImage, galleryImages.length]);

  if (!open) return null;

  const validateFiles = async (files: File[]) => {
    const invalidType = files.find((file) => !isAcceptedImage(file));

    if (invalidType) {
      return "Sadece JPG, PNG veya WEBP formatında görsel yüklenebilir.";
    }

    const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE);

    if (tooLarge) {
      return `Seçtiğiniz görsel 10 MB sınırını aşıyor. Lütfen daha küçük bir görsel seçiniz. (${tooLarge.name})`;
    }

    const tooSmallFile = files.find((file) => file.size < MIN_FILE_SIZE);

    if (tooSmallFile) {
      return `Seçtiğiniz görsel dosyası çok küçük görünüyor. Daha kaliteli bir görsel seçiniz. (${tooSmallFile.name})`;
    }

    for (const file of files) {
      try {
        const size = await getImageSize(file);
        if (size.width < MIN_IMAGE_WIDTH || size.height < MIN_IMAGE_HEIGHT) {
          return `Görsel çözünürlüğü düşük. En az ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} piksel önerilir. (${file.name}: ${size.width}x${size.height})`;
        }
      } catch {
        return `Görsel okunamadı. Lütfen farklı bir JPG, PNG veya WEBP dosyası seçiniz. (${file.name})`;
      }
    }

    return "";
  };

  const createLocalImage = (file: File): LocalPortfolioImage => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(16)
      .slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  });

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setImageError("");

    if (!file) return;

    const error = await validateFiles([file]);

    if (error) {
      setImageError(error);
      event.target.value = "";
      return;
    }

    if (coverImage?.previewUrl) URL.revokeObjectURL(coverImage.previewUrl);

    setCoverImage(createLocalImage(file));
    event.target.value = "";
  };

  const handleGalleryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    setImageError("");

    if (files.length === 0) return;

    const error = await validateFiles(files);

    if (error) {
      setImageError(error);
      event.target.value = "";
      return;
    }

    const remaining = MAX_GALLERY_COUNT - galleryImages.length;

    if (remaining <= 0) {
      setImageError(`En fazla ${MAX_GALLERY_COUNT} galeri fotoğrafı yükleyebilirsiniz.`);
      event.target.value = "";
      return;
    }

    const acceptedFiles = files.slice(0, remaining);
    const newImages = acceptedFiles.map(createLocalImage);

    setGalleryImages((current) => [...current, ...newImages]);

    if (files.length > remaining) {
      setImageError(
        `Galeri limiti ${MAX_GALLERY_COUNT} fotoğraf. Fazla seçilenler eklenmedi.`,
      );
    }

    event.target.value = "";
  };

  const removeCoverImage = () => {
    if (coverImage?.previewUrl) URL.revokeObjectURL(coverImage.previewUrl);
    setCoverImage(null);
  };

  const removeGalleryImage = (id: string) => {
    setGalleryImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((image) => image.id !== id);
    });
  };

  const handleSmartSubmit = () => {
    setSmartError("");

    const area = Number(unitForm.area || 0);
    const price = getNumericPrice(unitForm.price);
    const unitNoDigits = onlyDigits(unitForm.number);
    const currency = unitForm.priceCurrency || "TRY";

    if (unitForm.type === "DAIRE" && area && (area < 20 || area > 500)) {
      setSmartError("Daire metrekare değeri mantıksız görünüyor. 20 m² ile 500 m² arasında bir değer giriniz veya bilgiyi kontrol ediniz.");
      return;
    }

    if (["VILLA", "ULTRA_LUKS_VILLA", "MUSTAKIL_EV"].includes(unitForm.type) && area && (area < 50 || area > 2000)) {
      setSmartError("Villa/metrekare değeri mantıksız görünüyor. 50 m² ile 2000 m² arasında bir değer giriniz veya bilgiyi kontrol ediniz.");
      return;
    }

    if (unitNoDigits.length > 4) {
      setSmartError("Daire no çok uzun görünüyor. Lütfen bağımsız bölüm numarasını kontrol ediniz.");
      return;
    }

    if (price && currency === "TRY" && (price < 100000 || price > 500000000)) {
      setSmartError("TL fiyat değeri mantıksız görünüyor. Lütfen fiyat bilgisini kontrol ediniz.");
      return;
    }

    if (price && currency !== "TRY" && (price < 10000 || price > 50000000)) {
      setSmartError("Döviz fiyat değeri mantıksız görünüyor. Lütfen fiyat bilgisini ve para birimini kontrol ediniz.");
      return;
    }

    if (unitForm.description.length > MAX_DESCRIPTION_LENGTH) {
      setSmartError(`Açıklama en fazla ${MAX_DESCRIPTION_LENGTH} karakter olabilir.`);
      return;
    }

    onSubmit();
  };

  return (
    <div className="stock-modal-v2-backdrop" onClick={onClose}>
      <div className="stock-modal-v2" onClick={(e) => e.stopPropagation()}>
        <div className="stock-modal-v2-head">
          <div>
            <div className="stock-section-kicker">Yeni Portföy</div>
            <h2>Yeni Portföy Ekle</h2>
            <p>Gayrimenkul portföy kaydını görselleriyle birlikte oluştur.</p>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        <div className="stock-modal-v2-body">
          {formSuccess && <div className="stock-form-success">Portföy başarıyla eklendi.</div>}
          {formError && <div className="stock-form-error">{formError}</div>}
          {imageError && <div className="stock-form-error">{imageError}</div>}
          {smartError && <div className="stock-form-error">{smartError}</div>}

          <div className="stock-form-block">
            <h3>Proje</h3>
            <div className="stock-form-grid">
              {projects.length > 0 && (
                <label className="stock-form-field full">
                  <span>Mevcut Projeye Ekle</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">Yeni Proje Oluştur</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.city})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {!selectedProjectId && (
                <>
                  <label className="stock-form-field">
                    <span>Proje Adı *</span>
                    <input
                      value={projectForm.name}
                      onBlur={(e) =>
                        setProjectForm((f) => ({ ...f, name: normalizeText(e.target.value) }))
                      }
                      onChange={(e) =>
                        setProjectForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </label>

                  <label className="stock-form-field">
                    <span>Şehir *</span>
                    <select
                      value={projectForm.city}
                      onChange={(e) =>
                        setProjectForm((f) => ({
                          ...f,
                          city: e.target.value,
                          district: "",
                        }))
                      }
                    >
                      {CITIES.filter((city) => DISTRICTS_BY_CITY[city]).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="stock-form-field">
                    <span>İlçe *</span>
                    <select
                      value={projectForm.district}
                      onChange={(e) =>
                        setProjectForm((f) => ({ ...f, district: e.target.value }))
                      }
                    >
                      <option value="">İlçe seçiniz</option>
                      {selectedCityDistricts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="stock-form-field">
                    <span>Adres *</span>
                    <input
                      value={projectForm.address}
                      onBlur={(e) =>
                        setProjectForm((f) => ({ ...f, address: normalizeText(e.target.value) }))
                      }
                      onChange={(e) =>
                        setProjectForm((f) => ({ ...f, address: e.target.value }))
                      }
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="stock-form-block">
            <h3>Mülk Bilgileri</h3>
            <div className="stock-form-grid">
              <label className="stock-form-field">
                <span>Mülk Tipi *</span>
                <select
                  value={unitForm.type}
                  onChange={(e) =>
                    setUnitForm((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stock-form-field">
                <span>Durum *</span>
                <select
                  value={unitForm.status}
                  onChange={(e) =>
                    setUnitForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stock-form-field">
                <span>Oda / Plan Tipi</span>
                <input
                  list="room-count-options"
                  value={unitForm.roomCount}
                  onChange={(e) =>
                    setUnitForm((f) => ({ ...f, roomCount: e.target.value }))
                  }
                  placeholder="Örn: 3+1, 2,5+1, 10+4, Loft"
                />
                <datalist id="room-count-options">
                  {ROOM_COUNT_OPTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </label>

              <label className="stock-form-field">
                <span>Alan (m²) *</span>
                <input
                  type="number"
                  value={unitForm.area}
                  onChange={(e) =>
                    setUnitForm((f) => ({ ...f, area: e.target.value }))
                  }
                />
              </label>

              <label className="stock-form-field">
                <span>Bulunduğu Kat</span>
                <select
                  value={unitForm.floorLabel || ""}
                  onChange={(e) => {
                    const label = e.target.value;
                    setUnitForm((f) => ({
                      ...f,
                      floorLabel: label,
                      floor: getFloorNumericValue(label),
                    }));
                  }}
                >
                  <option value="">Kat seçiniz</option>
                  {FLOOR_OPTIONS.map((floor) => (
                    <option key={floor} value={floor}>
                      {floor}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stock-form-field">
                <span>Toplam Kat Sayısı</span>
                <select
                  value={unitForm.totalFloors || ""}
                  onChange={(e) =>
                    setUnitForm((f) => ({
                      ...f,
                      totalFloors: e.target.value === "Belirtilmedi" ? "" : e.target.value,
                    }))
                  }
                >
                  {TOTAL_FLOOR_OPTIONS.map((floor) => (
                    <option key={floor} value={floor}>
                      {floor === "Belirtilmedi" ? floor : `${floor} Katlı`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stock-form-field">
                <span>Daire No *</span>
                <input
                  value={unitForm.number}
                  onChange={(e) =>
                    setUnitForm((f) => ({ ...f, number: e.target.value }))
                  }
                />
              </label>

              <label className="stock-form-field">
                <span>Para Birimi</span>
                <select
                  value={selectedCurrency}
                  onChange={(e) =>
                    setUnitForm((f) => ({
                      ...f,
                      priceCurrency: e.target.value as "TRY" | "USD" | "EUR" | "GBP",
                    }))
                  }
                >
                  {PRICE_CURRENCIES.map((currency) => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stock-form-field">
                <span>Fiyat *</span>
                <input
                  inputMode="numeric"
                  value={formatPriceInput(unitForm.price)}
                  onChange={(e) =>
                    setUnitForm((f) => ({ ...f, price: onlyDigits(e.target.value) }))
                  }
                  placeholder="Örn: 4.400.000"
                />
              </label>

              <label className="stock-form-field full">
                <span>Açıklama ({currentDescriptionLength}/{MAX_DESCRIPTION_LENGTH})</span>
                <textarea
                  value={unitForm.description}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  onBlur={(e) =>
                    setUnitForm((f) => ({ ...f, description: normalizeLongText(e.target.value) }))
                  }
                  onChange={(e) =>
                    setUnitForm((f) => ({
                      ...f,
                      description: e.target.value.slice(0, MAX_DESCRIPTION_LENGTH),
                    }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="stock-form-block">
            <h3>Portföy Görselleri</h3>

            <div className="stock-form-grid">
              <div className="stock-form-field full">
                <span>Kapak Fotoğrafı * (1 adet)</span>

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverChange}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  className="stock-save-btn"
                  onClick={() => coverInputRef.current?.click()}
                >
                  Kapak Fotoğrafı Seç
                </button>

                {coverImage ? (
                  <div className="mt-4 overflow-hidden rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF]">
                    <img
                      src={coverImage.previewUrl}
                      alt="Kapak fotoğrafı önizleme"
                      className="h-56 w-full object-cover"
                    />

                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#06194A]">
                          {coverImage.file.name}
                        </p>
                        <p className="text-xs font-bold text-[#64748B]">
                          {formatFileSize(coverImage.file.size)}
                        </p>
                      </div>

                      <button type="button" className="stock-cancel-btn" onClick={removeCoverImage}>
                        Sil
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[24px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-5 text-center text-sm font-bold text-[#64748B]">
                    Kapak fotoğrafı portföy kartlarında ve detay sayfasında ana görsel olarak kullanılacak.
                  </div>
                )}
              </div>

              <div className="stock-form-field full">
                <span>Galeri Fotoğrafları ({galleryImages.length}/{MAX_GALLERY_COUNT})</span>

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleGalleryChange}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  className="stock-save-btn"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={galleryImages.length >= MAX_GALLERY_COUNT}
                >
                  Galeri Fotoğrafı Seç
                </button>

                <p className="mt-2 text-xs font-bold text-[#64748B]">
                  Maksimum {MAX_GALLERY_COUNT} galeri fotoğrafı, her biri en fazla 10 MB. Önerilen minimum çözünürlük: {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT} px.
                </p>

                {galleryImages.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {galleryImages.map((image, index) => (
                      <div
                        key={image.id}
                        className="overflow-hidden rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF]"
                      >
                        <div className="relative h-28">
                          <img
                            src={image.previewUrl}
                            alt={`Galeri fotoğrafı ${index + 1}`}
                            className="absolute inset-0 h-full w-full object-cover"
                          />

                          <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black text-[#06194A]">
                            {index + 1}
                          </span>
                        </div>

                        <div className="p-2">
                          <p className="truncate text-xs font-black text-[#06194A]">
                            {image.file.name}
                          </p>
                          <p className="text-[10px] font-bold text-[#64748B]">
                            {formatFileSize(image.file.size)}
                          </p>

                          <button
                            type="button"
                            className="mt-2 w-full rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
                            onClick={() => removeGalleryImage(image.id)}
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[24px] border border-dashed border-[#DDE7F3] bg-[#F7FBFF] p-5 text-center text-sm font-bold text-[#64748B]">
                    Galeri fotoğrafları portföy detay sayfasında kullanılacak.
                  </div>
                )}
              </div>

              <div className="stock-form-field full">
                <span>Görsel Limiti</span>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
                    <p className="text-2xl font-black text-[#06194A]">1</p>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                      Kapak
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
                    <p className="text-2xl font-black text-[#06194A]">15</p>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                      Galeri
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-[#DDE7F3] bg-[#F7FBFF] p-4 text-center">
                    <p className="text-2xl font-black text-[#06194A]">
                      {totalSelectedImages}
                    </p>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                      Seçili
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="stock-modal-v2-foot">
          <button className="stock-cancel-btn" onClick={onClose}>
            İptal
          </button>

          <button
            className="stock-save-btn"
            onClick={handleSmartSubmit}
            disabled={formLoading}
          >
            {formLoading ? "Kaydediliyor..." : "Portföyü Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
