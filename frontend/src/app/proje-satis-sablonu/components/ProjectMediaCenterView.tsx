"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  FolderOpen,
  Images,
  Loader2,
  UploadCloud,
} from "lucide-react";

import type {
  ProjectMediaConfig,
  ProjectMediaPackagesResponse,
  ProjectMediaPreview,
  ProjectSummary,
} from "../lib/projectSalesTypes";
import { formatBytes, mediaActionLabel } from "../lib/projectSalesFormatters";
import { cardStyle, primaryButtonStyle, secondaryButtonStyle } from "../lib/projectSalesStyles";
import { InfoBand, Metric, SectionTitle } from "./ProjectSalesPrimitives";

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
  const [copied, setCopied] = useState(false);
  const previewing = busyAction === "media-preview";
  const uploading = busyAction === "media-upload";

  const folderPlan = config.folders
    .map((folder) => {
      const countText =
        folder.type === "PROJECT_GENERAL"
          ? `${config.limits.generalImageCount.min}-${config.limits.generalImageCount.max} görsel`
          : `önerilen ${config.limits.recommendedStandardImageCount}, en fazla ${config.limits.maxStandardImageCount} görsel`;

      return `${folder.folder}/  (${folder.name} • ${countText})`;
    })
    .join("\n");

  const copyFolderPlan = async () => {
    try {
      await navigator.clipboard.writeText(folderPlan);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const totalExistingAssets = config.folders.reduce(
    (total, folder) => total + folder.existingAssetCount,
    0,
  );
  const totalAssignedUnits = config.folders.reduce(
    (total, folder) => total + folder.assignedUnitCount,
    0,
  );

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        marginTop: 12,
        paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
      }}
    >
      <section
        style={{
          ...cardStyle,
          borderColor: "#C4B5FD",
          background:
            "linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 52%, #FFF7ED 100%)",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<Images size={22} />}
          title="Toplu Proje Görselleri"
          subtitle={`${project.name} • Daire tiplerine göre tek ZIP ile toplu yükleme`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
            gap: 7,
            marginTop: 12,
          }}
        >
          <Metric label="Fotoğraf Paketi" value={config.folders.length} />
          <Metric label="Bağlı Bağımsız" value={totalAssignedUnits} />
          <Metric label="Mevcut Görsel" value={totalExistingAssets} />
          <Metric
            label="ZIP Limiti"
            value={`${config.limits.maxZipSizeMb} MB`}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            border: "1.5px solid #C4B5FD",
            borderRadius: 16,
            background: "#FFFFFF",
            padding: 11,
            color: "#475569",
            fontSize: 10,
            lineHeight: 1.6,
            fontWeight: 750,
          }}
        >
          Proje genel fotoğraflarını ayrı klasöre; 2+1, 3+1, 4+1,
          dükkan ve diğer bağımsız bölüm gruplarını kendi klasörlerine
          koyun. Aynı pakete bağlı bütün bağımsız bölümlerde aynı
          görseller ortak kullanılır.
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 13 }}>
        <SectionTitle
          icon={<FolderOpen size={21} />}
          title="ZIP Klasör Planı"
          subtitle="Aşağıdaki klasör adlarını değiştirmeden ZIP dosyasının köküne yerleştirin."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
            gap: 9,
            marginTop: 12,
          }}
        >
          {config.folders.map((folder, index) => {
            const palette =
              folder.type === "PROJECT_GENERAL"
                ? {
                    background: "#EDE9FE",
                    border: "#A78BFA",
                    color: "#5B21B6",
                  }
                : index % 3 === 0
                  ? {
                      background: "#DCFCE7",
                      border: "#86EFAC",
                      color: "#166534",
                    }
                  : index % 3 === 1
                    ? {
                        background: "#DBEAFE",
                        border: "#93C5FD",
                        color: "#1D4ED8",
                      }
                    : {
                        background: "#FEF3C7",
                        border: "#FCD34D",
                        color: "#92400E",
                      };

            return (
              <article
                key={folder.packageId}
                style={{
                  minWidth: 0,
                  border: `1.5px solid ${palette.border}`,
                  borderRadius: 17,
                  background: palette.background,
                  padding: 11,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      flex: "0 0 38px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 12,
                      background: "#FFFFFF",
                      color: palette.color,
                    }}
                  >
                    <Archive size={20} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        color: palette.color,
                        fontSize: 12,
                        lineHeight: 1.35,
                        fontWeight: 950,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {folder.folder}/
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        color: "#475569",
                        fontSize: 9,
                        lineHeight: 1.4,
                        fontWeight: 750,
                      }}
                    >
                      {folder.name}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 6,
                  }}
                >
                  <Metric
                    label="Bağlı Bölüm"
                    value={folder.assignedUnitCount}
                  />
                  <Metric
                    label="Mevcut Görsel"
                    value={folder.existingAssetCount}
                  />
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#475569",
                    fontSize: 9,
                    lineHeight: 1.5,
                    fontWeight: 700,
                  }}
                >
                  {folder.type === "PROJECT_GENERAL"
                    ? `Zorunlu ilk paket: ${config.limits.generalImageCount.min}-${config.limits.generalImageCount.max} proje görseli.`
                    : `Önerilen ${config.limits.recommendedStandardImageCount}, en fazla ${config.limits.maxStandardImageCount} görsel.`}
                </p>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void copyFolderPlan()}
          style={{
            ...secondaryButtonStyle,
            width: "100%",
            marginTop: 10,
            borderColor: "#C4B5FD",
            background: "#F5F3FF",
            color: "#6D28D9",
          }}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? "Klasör Listesi Kopyalandı" : "Klasör Listesini Kopyala"}
        </button>
      </section>

      <section
        style={{
          ...cardStyle,
          borderColor: "#93C5FD",
          background: "#F8FBFF",
          padding: 13,
        }}
      >
        <SectionTitle
          icon={<UploadCloud size={22} />}
          title="ZIP Dosyasını Yükle"
          subtitle={`En fazla ${config.limits.maxZipSizeMb} MB • JPG, PNG ve WEBP`}
        />

        <label
          style={{
            marginTop: 12,
            minHeight: 110,
            border: selectedFile
              ? "2px solid #2563EB"
              : "2px dashed #93C5FD",
            borderRadius: 18,
            background: selectedFile ? "#EAF2FF" : "#FFFFFF",
            display: "grid",
            placeItems: "center",
            gap: 5,
            padding: 14,
            textAlign: "center",
            cursor: uploading || previewing ? "not-allowed" : "pointer",
          }}
        >
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            disabled={uploading || previewing}
            onChange={(event) =>
              onFileChange(event.target.files?.[0] || null)
            }
            style={{ display: "none" }}
          />

          <Archive size={30} color="#2563EB" />

          <strong
            style={{
              color: "#1D4ED8",
              fontSize: 12,
              fontWeight: 950,
            }}
          >
            {selectedFile
              ? selectedFile.name
              : "ZIP dosyasını seçmek için dokunun"}
          </strong>

          <span
            style={{
              color: "#64748B",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {selectedFile
              ? formatBytes(selectedFile.size)
              : "Klasörleri tek ZIP içinde yükleyin"}
          </span>
        </label>

        <label
          style={{
            marginTop: 10,
            border: "1.5px solid #F3C97B",
            borderRadius: 14,
            background: "#FFF8E7",
            padding: 10,
            display: "flex",
            alignItems: "center",
            gap: 9,
            color: "#7A4307",
            fontSize: 10,
            lineHeight: 1.45,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(event) =>
              onReplaceExistingChange(event.target.checked)
            }
          />
          Mevcut paket görsellerini bu ZIP içeriğiyle değiştir
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          <button
            type="button"
            onClick={onPreview}
            disabled={!selectedFile || previewing || uploading}
            style={{
              ...secondaryButtonStyle,
              width: "100%",
              minHeight: 48,
              borderColor: "#93C5FD",
              background: "#EFF6FF",
              color: "#1D4ED8",
            }}
          >
            {previewing ? (
              <Loader2 size={18} className="eph-spin" />
            ) : (
              <ClipboardList size={18} />
            )}
            ZIP Dosyasını Önizle
          </button>

          <button
            type="button"
            onClick={onUpload}
            disabled={!preview?.valid || uploading || previewing}
            style={{
              ...primaryButtonStyle,
              width: "100%",
              minHeight: 48,
              background: preview?.valid
                ? "linear-gradient(135deg, #6D28D9, #8B5CF6)"
                : "#94A3B8",
              cursor: preview?.valid ? "pointer" : "not-allowed",
            }}
          >
            {uploading ? (
              <Loader2 size={18} className="eph-spin" />
            ) : (
              <UploadCloud size={18} />
            )}
            Görselleri Toplu Yükle
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
                ? "ZIP Önizlemesi Onaylandı"
                : "ZIP Dosyasında Düzeltilecekler Var"
            }
            subtitle={preview.archive.fileName}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
              gap: 7,
              marginTop: 11,
            }}
          >
            <Metric label="Paket" value={preview.summary.packageCount} />
            <Metric label="Görsel" value={preview.summary.imageCount} />
            <Metric
              label="Toplam Boyut"
              value={formatBytes(preview.summary.totalImageSize)}
            />
            <Metric label="Hata" value={preview.summary.errorCount} />
            <Metric label="Uyarı" value={preview.summary.warningCount} />
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {preview.packages.map((mediaPackage) => (
              <div
                key={mediaPackage.packageId}
                style={{
                  border: "1.5px solid #C7D6E8",
                  borderRadius: 14,
                  background: "#FFFFFF",
                  padding: 10,
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0, 1fr) repeat(2, minmax(78px, auto))",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      color: "#1F2937",
                      fontSize: 11,
                      fontWeight: 950,
                    }}
                  >
                    {mediaPackage.sourceFolder}/
                  </strong>
                  <div
                    style={{
                      marginTop: 2,
                      color: "#64748B",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {mediaPackage.name}
                  </div>
                </div>

                <Metric
                  label="Görsel"
                  value={mediaPackage.fileCount}
                />
                <Metric
                  label="İşlem"
                  value={mediaActionLabel(mediaPackage.action)}
                />
              </div>
            ))}
          </div>

          {preview.issues.length > 0 && (
            <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
              {preview.issues.map((issue, index) => (
                <InfoBand
                  key={`${issue.code}-${index}`}
                  tone={issue.level === "ERROR" ? "error" : "warning"}
                >
                  {issue.message}
                  {issue.path ? ` • ${issue.path}` : ""}
                </InfoBand>
              ))}
            </div>
          )}
        </section>
      )}

      <section style={{ ...cardStyle, padding: 13 }}>
        <SectionTitle
          icon={<Images size={21} />}
          title="Yüklü Görsel Paketleri"
          subtitle={`${packages.packages.reduce(
            (total, item) => total + item._count.assets,
            0,
          )} görsel kayıtlı`}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: 9,
            marginTop: 11,
          }}
        >
          {packages.packages.map((mediaPackage) => {
            const cover =
              mediaPackage.assets.find((asset) => asset.isCover) ||
              mediaPackage.assets[0];
            const coverUrl =
              cover?.supabaseUrl || cover?.url || "";
            const fallbackCoverUrl =
              cover?.supabaseUrl && cover?.url !== cover.supabaseUrl
                ? cover.url
                : "";

            return (
              <article
                key={mediaPackage.id}
                style={{
                  minWidth: 0,
                  border: "1.5px solid #C7D6E8",
                  borderRadius: 17,
                  background: "#F8FAFC",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16 / 10",
                    overflow: "hidden",
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
                          const fallback =
                            image.dataset.fallback || "";

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
                          filter: "blur(18px)",
                          opacity: 0.55,
                        }}
                      />
                      <img
                        src={coverUrl}
                        data-fallback={fallbackCoverUrl}
                        alt={mediaPackage.name}
                        onError={(event) => {
                          const image = event.currentTarget;
                          const fallback =
                            image.dataset.fallback || "";

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
                      <Images size={34} />
                    </div>
                  )}
                </div>

                <div style={{ padding: 10 }}>
                  <strong
                    style={{
                      display: "block",
                      color: "#1F2937",
                      fontSize: 11,
                      lineHeight: 1.4,
                      fontWeight: 950,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {mediaPackage.name}
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      color: "#64748B",
                      fontSize: 9,
                      lineHeight: 1.4,
                      fontWeight: 750,
                    }}
                  >
                    <span>{mediaPackage.zipFolder}/</span>
                    <span>
                      {mediaPackage._count.assets} görsel •{" "}
                      {mediaPackage._count.units} bölüm
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

