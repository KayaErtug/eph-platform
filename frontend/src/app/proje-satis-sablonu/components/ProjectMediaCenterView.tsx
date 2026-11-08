"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  Images,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";

import type {
  ProjectMediaConfig,
  ProjectMediaPackagesResponse,
  ProjectMediaPreview,
  ProjectSummary,
} from "../lib/projectSalesTypes";
import { formatBytes } from "../lib/projectSalesFormatters";
import {
  cardStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../lib/projectSalesStyles";
import {
  InfoBand,
  Metric,
  SectionTitle,
} from "./ProjectSalesPrimitives";

type MediaFolder = ProjectMediaConfig["folders"][number];
type SelectedFilesByPackage = Record<string, File[]>;

const MIN_IMAGES_PER_CATEGORY = 4;

type ZipEntry = {
  path: string;
  data: Uint8Array;
  crc: number;
  modifiedAt: Date;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value =
        value & 1
          ? 0xedb88320 ^ (value >>> 1)
          : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function dosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosTime, dosDate };
}

function localHeader(entry: ZipEntry, nameBytes: Uint8Array) {
  const buffer = new ArrayBuffer(30 + nameBytes.length);
  const view = new DataView(buffer);
  const { dosTime, dosDate } = dosDateTime(entry.modifiedAt);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, dosTime, true);
  view.setUint16(12, dosDate, true);
  view.setUint32(14, entry.crc, true);
  view.setUint32(18, entry.data.byteLength, true);
  view.setUint32(22, entry.data.byteLength, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  new Uint8Array(buffer, 30).set(nameBytes);

  return new Uint8Array(buffer);
}

function centralHeader(
  entry: ZipEntry,
  nameBytes: Uint8Array,
  localOffset: number,
) {
  const buffer = new ArrayBuffer(46 + nameBytes.length);
  const view = new DataView(buffer);
  const { dosTime, dosDate } = dosDateTime(entry.modifiedAt);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, dosTime, true);
  view.setUint16(14, dosDate, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.data.byteLength, true);
  view.setUint32(24, entry.data.byteLength, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localOffset, true);
  new Uint8Array(buffer, 46).set(nameBytes);

  return new Uint8Array(buffer);
}

function endOfCentralDirectory(
  entryCount: number,
  centralSize: number,
  centralOffset: number,
) {
  const buffer = new ArrayBuffer(22);
  const view = new DataView(buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);

  return new Uint8Array(buffer);
}

function safeFolderName(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("/");
}

function fileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.(jpe?g|png|webp)$/);
  return match?.[0] || ".jpg";
}

function roomLabel(folder: MediaFolder) {
  if (folder.type === "PROJECT_GENERAL") {
    return "Proje Genel";
  }

  return folder.roomCount?.trim() || folder.name;
}

function generatedFileBase(folder: MediaFolder) {
  if (folder.type === "PROJECT_GENERAL") {
    return "proje-genel";
  }

  return roomLabel(folder)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü+_-]/g, "-");
}

async function createZipFile(
  project: ProjectSummary,
  folders: MediaFolder[],
  filesByPackage: SelectedFilesByPackage,
) {
  const entries: ZipEntry[] = [];

  for (const folder of folders) {
    const selectedFiles = filesByPackage[folder.packageId] || [];
    const folderPath = safeFolderName(folder.folder);
    const baseName = generatedFileBase(folder);

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      const extension = fileExtension(file.name);
      const generatedName = `${baseName}-${String(index + 1).padStart(2, "0")}${extension}`;
      const data = new Uint8Array(await file.arrayBuffer());

      entries.push({
        path: `${folderPath}/${generatedName}`,
        data,
        crc: crc32(data),
        modifiedAt: new Date(file.lastModified || Date.now()),
      });
    }
  }

  if (entries.length === 0) {
    return null;
  }

  const encoder = new TextEncoder();
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let localOffset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const local = localHeader(entry, nameBytes);
    const central = centralHeader(entry, nameBytes, localOffset);

    localParts.push(toArrayBuffer(local), toArrayBuffer(entry.data));
    centralParts.push(toArrayBuffer(central));
    localOffset += local.byteLength + entry.data.byteLength;
    centralSize += central.byteLength;
  }

  const end = endOfCentralDirectory(
    entries.length,
    centralSize,
    localOffset,
  );
  const projectCode =
    project.code?.trim().replace(/[^0-9A-Za-z_-]/g, "-") ||
    "proje";

  return new File(
    [...localParts, ...centralParts, toArrayBuffer(end)],
    `${projectCode}-gorseller.zip`,
    { type: "application/zip" },
  );
}

export function ProjectMediaCenterView({
  project,
  config,
  packages,
  selectedFile,
  preview,
  replaceExisting,
  busyAction,
  onFileChange,
  onReplaceExistingChange,
  onPreview,
  onUpload,
}: {
  project: ProjectSummary;
  config: ProjectMediaConfig;
  packages: ProjectMediaPackagesResponse;
  selectedFile: File | null;
  preview: ProjectMediaPreview | null;
  replaceExisting: boolean;
  busyAction: string | null;
  onFileChange: (file: File | null) => void;
  onReplaceExistingChange: (checked: boolean) => void;
  onPreview: () => void;
  onUpload: () => void;
}) {
  const [filesByPackage, setFilesByPackage] =
    useState<SelectedFilesByPackage>({});
  const [buildingZip, setBuildingZip] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(
    null,
  );
  const buildVersionRef = useRef(0);

  const previewing = busyAction === "media-preview";
  const uploading = busyAction === "media-upload";
  const locked = buildingZip || previewing || uploading;

  const orderedFolders = useMemo(
    () =>
      [...config.folders].sort((first, second) => {
        if (first.type === "PROJECT_GENERAL") return -1;
        if (second.type === "PROJECT_GENERAL") return 1;

        return roomLabel(first).localeCompare(
          roomLabel(second),
          "tr-TR",
          { numeric: true },
        );
      }),
    [config.folders],
  );

  const totalSelected = Object.values(filesByPackage).reduce(
    (total, files) => total + files.length,
    0,
  );
  const totalExistingAssets = config.folders.reduce(
    (total, folder) => total + folder.existingAssetCount,
    0,
  );
  const uploadedPackages = packages.packages.filter(
    (mediaPackage) => mediaPackage._count.assets > 0,
  );
  const missingMinimumFolders = orderedFolders.filter(
    (folder) =>
      (filesByPackage[folder.packageId] || []).length <
      MIN_IMAGES_PER_CATEGORY,
  );
  const selectionsReady =
    orderedFolders.length > 0 && missingMinimumFolders.length === 0;

  const rebuildZip = async (
    nextFilesByPackage: SelectedFilesByPackage,
  ) => {
    const version = buildVersionRef.current + 1;
    buildVersionRef.current = version;

    const selectedCount = Object.values(nextFilesByPackage).reduce(
      (total, files) => total + files.length,
      0,
    );

    if (selectedCount === 0) {
      onFileChange(null);
      setBuildingZip(false);
      return;
    }

    setBuildingZip(true);

    try {
      const generatedZip = await createZipFile(
        project,
        orderedFolders,
        nextFilesByPackage,
      );

      if (buildVersionRef.current !== version) {
        return;
      }

      onFileChange(generatedZip);
    } catch {
      if (buildVersionRef.current === version) {
        onFileChange(null);
        setSelectionError(
          "Görseller hazırlanamadı. Dosyaları yeniden seçin.",
        );
      }
    } finally {
      if (buildVersionRef.current === version) {
        setBuildingZip(false);
      }
    }
  };

  const updateFolderFiles = (
    folder: MediaFolder,
    selectedFiles: File[],
  ) => {
    const maxCount =
      folder.type === "PROJECT_GENERAL"
        ? config.limits.generalImageCount.max
        : config.limits.maxStandardImageCount;

    if (selectedFiles.length > maxCount) {
      setSelectionError(
        `${roomLabel(folder)} için en fazla ${maxCount} görsel seçilebilir.`,
      );
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !/\.(jpe?g|png|webp)$/i.test(file.name),
    );

    if (invalidFile) {
      setSelectionError(
        "Yalnız JPG, PNG ve WEBP görseller yüklenebilir.",
      );
      return;
    }

    setSelectionError(null);

    const nextFilesByPackage = {
      ...filesByPackage,
      [folder.packageId]: selectedFiles,
    };

    if (selectedFiles.length === 0) {
      delete nextFilesByPackage[folder.packageId];
    }

    setFilesByPackage(nextFilesByPackage);
    void rebuildZip(nextFilesByPackage);
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        marginTop: 12,
        paddingBottom: "calc(84px + env(safe-area-inset-bottom))",
      }}
    >
      <section
        style={{
          ...cardStyle,
          borderColor: "#BFDBFE",
          background:
            "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 58%, #F8FAFC 100%)",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<Images size={21} />}
          title="Proje Görselleri"
          subtitle={`${project.name} • Oda planına göre ayrı görsel yükleme`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 7,
            marginTop: 11,
          }}
        >
          <Metric label="Kategori" value={orderedFolders.length} />
          <Metric label="Seçilen" value={totalSelected} />
          <Metric label="Yüklü" value={totalExistingAssets} />
        </div>

        <InfoBand tone="info">
          Proje Genel, 2+1, 3+1, 4+1 ve projedeki diğer oda
          planlarına ayrı ayrı en az 4 görsel seçin. Dosya adları sistem
          tarafından otomatik olarak 2+1-01, 3+1-01 şeklinde oluşturulur.
        </InfoBand>
      </section>

      {selectionError && (
        <InfoBand tone="error">{selectionError}</InfoBand>
      )}

      <section style={{ ...cardStyle, padding: 13 }}>
        <SectionTitle
          icon={<FileImage size={21} />}
          title="Görsel Kategorileri"
          subtitle="Her kategori için en az 4 görsel seçin."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
            gap: 9,
            marginTop: 11,
          }}
        >
          {orderedFolders.map((folder) => {
            const selectedFiles =
              filesByPackage[folder.packageId] || [];
            const selectedCount = selectedFiles.length;
            const maxCount =
              folder.type === "PROJECT_GENERAL"
                ? config.limits.generalImageCount.max
                : config.limits.maxStandardImageCount;
            const label = roomLabel(folder);

            return (
              <article
                key={folder.packageId}
                style={{
                  minWidth: 0,
                  border: selectedCount
                    ? "2px solid #2563EB"
                    : "1.5px solid #C7D6E8",
                  borderRadius: 16,
                  background: selectedCount ? "#EFF6FF" : "#FFFFFF",
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px minmax(0, 1fr)",
                    alignItems: "center",
                    gap: 9,
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 12,
                      background: selectedCount ? "#DBEAFE" : "#F1F5F9",
                      color: selectedCount ? "#1D4ED8" : "#64748B",
                    }}
                  >
                    {selectedCount ? (
                      <CheckCircle2 size={21} />
                    ) : (
                      <Images size={21} />
                    )}
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        color: "#1F2937",
                        fontSize: 13,
                        lineHeight: 1.35,
                        fontWeight: 950,
                      }}
                    >
                      {label}
                    </strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        color: "#64748B",
                        fontSize: 9,
                        lineHeight: 1.4,
                        fontWeight: 750,
                      }}
                    >
                      {selectedCount > 0
                        ? `${selectedCount} görsel seçildi • en az ${MIN_IMAGES_PER_CATEGORY}`
                        : `En az ${MIN_IMAGES_PER_CATEGORY} • en fazla ${maxCount} görsel`}
                    </span>
                  </div>
                </div>

                {selectedCount > 0 && (
                  <div
                    style={{
                      border: "1px solid #BFDBFE",
                      borderRadius: 11,
                      background: "#FFFFFF",
                      padding: 7,
                      color: "#475569",
                      fontSize: 9,
                      lineHeight: 1.45,
                      fontWeight: 750,
                    }}
                  >
                    {selectedFiles
                      .slice(0, 3)
                      .map((file) => file.name)
                      .join(" • ")}
                    {selectedCount > 3
                      ? ` • +${selectedCount - 3} görsel`
                      : ""}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: selectedCount
                      ? "minmax(0, 1fr) 42px"
                      : "1fr",
                    gap: 7,
                  }}
                >
                  <label
                    style={{
                      ...secondaryButtonStyle,
                      width: "100%",
                      minHeight: 42,
                      borderColor: "#93C5FD",
                      background: "#EFF6FF",
                      color: "#1D4ED8",
                      cursor: locked ? "not-allowed" : "pointer",
                      opacity: locked ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      disabled={locked}
                      onChange={(event) => {
                        updateFolderFiles(
                          folder,
                          Array.from(event.target.files || []),
                        );
                        event.currentTarget.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                    <UploadCloud size={17} />
                    {selectedCount ? "Değiştir" : "Görsel Seç"}
                  </label>

                  {selectedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => updateFolderFiles(folder, [])}
                      disabled={locked}
                      aria-label={`${label} görsellerini temizle`}
                      style={{
                        width: 42,
                        minHeight: 42,
                        border: "1.5px solid #FCA5A5",
                        borderRadius: 12,
                        background: "#FFF7F7",
                        color: "#DC2626",
                        display: "grid",
                        placeItems: "center",
                        cursor: locked ? "not-allowed" : "pointer",
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {totalExistingAssets > 0 && (
        <label
          style={{
            ...cardStyle,
            borderColor: "#F3C97B",
            background: "#FFF8E7",
            padding: 10,
            display: "flex",
            alignItems: "center",
            gap: 9,
            color: "#7A4307",
            fontSize: 10,
            lineHeight: 1.45,
            fontWeight: 850,
            cursor: locked ? "not-allowed" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={replaceExisting}
            disabled={locked}
            onChange={(event) =>
              onReplaceExistingChange(event.target.checked)
            }
          />
          Daha önce yüklenen görselleri yeni seçimlerle değiştir
        </label>
      )}

      {totalSelected > 0 && !selectionsReady && (
        <InfoBand tone="warning">
          En az 4 görsel bekleyen kategoriler:{" "}
          {missingMinimumFolders.map(roomLabel).join(", ")}.
        </InfoBand>
      )}

      <section
        style={{
          ...cardStyle,
          borderColor: "#93C5FD",
          background: "#F8FBFF",
          padding: 11,
        }}
      >
        {buildingZip && (
          <InfoBand tone="info">
            Görseller oda planlarına göre hazırlanıyor...
          </InfoBand>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onPreview}
            disabled={!selectedFile || !selectionsReady || locked}
            style={{
              ...secondaryButtonStyle,
              width: "100%",
              minHeight: 48,
              borderColor: "#93C5FD",
              background: "#EFF6FF",
              color: "#1D4ED8",
              opacity: !selectedFile || !selectionsReady || locked ? 0.55 : 1,
              cursor:
                !selectedFile || !selectionsReady || locked ? "not-allowed" : "pointer",
            }}
          >
            {previewing || buildingZip ? (
              <Loader2 size={18} className="eph-spin" />
            ) : (
              <RefreshCw size={18} />
            )}
            Kontrol Et
          </button>

          <button
            type="button"
            onClick={onUpload}
            disabled={!preview?.valid || locked}
            style={{
              ...primaryButtonStyle,
              width: "100%",
              minHeight: 48,
              background: preview?.valid
                ? "linear-gradient(135deg, #047857, #10B981)"
                : "#94A3B8",
              opacity: !preview?.valid || locked ? 0.6 : 1,
              cursor:
                !preview?.valid || locked
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {uploading ? (
              <Loader2 size={18} className="eph-spin" />
            ) : (
              <UploadCloud size={18} />
            )}
            Görselleri Yükle
          </button>
        </div>
      </section>

      {preview && (
        <section
          style={{
            ...cardStyle,
            borderColor: preview.valid ? "#86EFAC" : "#FCA5A5",
            background: preview.valid ? "#F0FDF4" : "#FFF7F7",
            padding: 13,
          }}
        >
          <SectionTitle
            icon={
              preview.valid ? (
                <CheckCircle2 size={21} />
              ) : (
                <AlertTriangle size={21} />
              )
            }
            title={
              preview.valid
                ? "Görseller yüklemeye hazır"
                : "Görsel seçimlerinde düzeltilecekler var"
            }
            subtitle={`${preview.summary.packageCount} kategori • ${preview.summary.imageCount} görsel`}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 7,
              marginTop: 10,
            }}
          >
            <Metric label="Kategori" value={preview.summary.packageCount} />
            <Metric label="Görsel" value={preview.summary.imageCount} />
            <Metric
              label="Boyut"
              value={formatBytes(preview.summary.totalImageSize)}
            />
          </div>

          {preview.issues.length > 0 && (
            <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
              {preview.issues.map((issue, index) => (
                <InfoBand
                  key={`${issue.code}-${index}`}
                  tone={
                    issue.level === "ERROR" ? "error" : "warning"
                  }
                >
                  {issue.message}
                </InfoBand>
              ))}
            </div>
          )}
        </section>
      )}

      {uploadedPackages.length > 0 && (
        <section style={{ ...cardStyle, padding: 13 }}>
          <SectionTitle
            icon={<Images size={20} />}
            title="Yüklü Görseller"
            subtitle={`${uploadedPackages.reduce(
              (total, item) => total + item._count.assets,
              0,
            )} görsel kayıtlı`}
          />

          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {uploadedPackages.map((mediaPackage) => {
              const cover =
                mediaPackage.assets.find((asset) => asset.isCover) ||
                mediaPackage.assets[0];
              const coverUrl = cover?.supabaseUrl || cover?.url || "";
              const fallbackCoverUrl =
                cover?.supabaseUrl && cover?.url !== cover.supabaseUrl
                  ? cover.url
                  : "";
              const visibleName =
                mediaPackage.type === "PROJECT_GENERAL"
                  ? "Proje Genel"
                  : mediaPackage.roomCount || mediaPackage.name;

              return (
                <article
                  key={mediaPackage.id}
                  style={{
                    minWidth: 0,
                    border: "1.5px solid #C7D6E8",
                    borderRadius: 15,
                    background: "#F8FAFC",
                    padding: 8,
                    display: "grid",
                    gridTemplateColumns: "72px minmax(0, 1fr)",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 72,
                      height: 58,
                      overflow: "hidden",
                      borderRadius: 11,
                      background: "#E2E8F0",
                    }}
                  >
                    {cover && coverUrl ? (
                      <>
                        <img
                          src={coverUrl}
                          data-fallback={fallbackCoverUrl}
                          alt=""
                          aria-hidden="true"
                          onError={(event) => {
                            const image = event.currentTarget;
                            const fallback = image.dataset.fallback || "";

                            if (fallback) {
                              image.dataset.fallback = "";
                              image.src = fallback;
                              return;
                            }

                            image.style.display = "none";
                          }}
                          style={{
                            position: "absolute",
                            inset: "-12%",
                            width: "124%",
                            height: "124%",
                            objectFit: "cover",
                            filter: "blur(12px)",
                            opacity: 0.5,
                          }}
                        />

                        <img
                          src={coverUrl}
                          data-fallback={fallbackCoverUrl}
                          alt={visibleName}
                          onError={(event) => {
                            const image = event.currentTarget;
                            const fallback = image.dataset.fallback || "";

                            if (fallback) {
                              image.dataset.fallback = "";
                              image.src = fallback;
                              return;
                            }

                            image.style.display = "none";
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </>
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                          color: "#94A3B8",
                        }}
                      >
                        <Images size={23} />
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        color: "#1F2937",
                        fontSize: 12,
                        lineHeight: 1.4,
                        fontWeight: 950,
                      }}
                    >
                      {visibleName}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: 3,
                        color: "#64748B",
                        fontSize: 9,
                        lineHeight: 1.45,
                        fontWeight: 750,
                      }}
                    >
                      {mediaPackage._count.assets} görsel •{" "}
                      {mediaPackage._count.units} bağımsız bölüm
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
