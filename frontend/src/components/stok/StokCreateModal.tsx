"use client";

import { useMemo, useRef, useState } from "react";
import { CITIES, ROOM_COUNT_OPTIONS, STATUS_LABELS, TYPE_LABELS } from "./stokConstants";
import type { Project, ProjectFormState, UnitFormState } from "./stokTypes";

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
  onSubmit: () => void;
}

const MAX_GALLERY_COUNT = 15;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type LocalImage = {
  id: string;
  file: File;
  previewUrl: string;
};

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function isAcceptedImage(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
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
  onSubmit,
}: Props) {
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [coverImage, setCoverImage] = useState<LocalImage | null>(null);
  const [galleryImages, setGalleryImages] = useState<LocalImage[]>([]);
  const [imageError, setImageError] = useState("");

  const totalSelectedImages = useMemo(() => {
    return (coverImage ? 1 : 0) + galleryImages.length;
  }, [coverImage, galleryImages.length]);

  if (!open) return null;

  const validateFiles = (files: File[]) => {
    const invalidType = files.find((file) => !isAcceptedImage(file));

    if (invalidType) {
      return "Sadece JPG, PNG veya WEBP formatında görsel yüklenebilir.";
    }

    const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE);

    if (tooLarge) {
      return "Her fotoğraf en fazla 10 MB olabilir.";
    }

    return "";
  };

  const createLocalImage = (file: File): LocalImage => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(16)
      .slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  });

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setImageError("");

    if (!file) return;

    const error = validateFiles([file]);

    if (error) {
      setImageError(error);
      event.target.value = "";
      return;
    }

    if (coverImage?.previewUrl) URL.revokeObjectURL(coverImage.previewUrl);

    setCoverImage(createLocalImage(file));
    event.target.value = "";
  };

  const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    setImageError("");

    if (files.length === 0) return;

    const error = validateFiles(files);

    if (error) {
      setImageError(error);
      event.target.value = "";
      return;
    }

    const remaining = MAX_GALLERY_COUNT - galleryImages.length;

    if (remaining <= 0) {
      setImageError(`Galeri için en fazla ${MAX_GALLERY_COUNT} fotoğraf seçilebilir.`);
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
                        setProjectForm((f) => ({ ...f, city: e.target.value }))
                      }
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="stock-form-field">
                    <span>İlçe *</span>
                    <input
                      value={projectForm.district}
                      onChange={(e) =>
                        setProjectForm((f) => ({ ...f, district: e.target.value }))
                      }
                    />
                  </label>

                  <label className="stock-form-field">
                    <span>Adres *</span>
                    <input
                      value={projectForm.address}
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
                <span>Kat</span>
                <input
                  type="number"
                  value={unitForm.floor}
                  onChange={(e) =>
                    setUnitForm((f) => ({ ...f, floor: e.target.value }))
                  }
                />
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

              <label className="stock-form-field full">
                <span>Fiyat (TL) *</span>
                <input
                  type="number"
                  value={unitForm.price}
                  onChange={(e) =>
                    setUnitForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </label>

              <label className="stock-form-field full">
                <span>Açıklama</span>
                <textarea
                  value={unitForm.description}
                  onChange={(e) =>
                    setUnitForm((f) => ({ ...f, description: e.target.value }))
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
                  Maksimum {MAX_GALLERY_COUNT} galeri fotoğrafı, her biri en fazla 10 MB.
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

          <button className="stock-save-btn" onClick={onSubmit} disabled={formLoading}>
            {formLoading ? "Kaydediliyor..." : "Portföyü Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
