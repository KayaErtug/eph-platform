"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Factory,
  FileSpreadsheet,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

const FILE_NAME = "EPH_Proje_Satis_Merkezi_Excel_Sablonu_V4.xlsx";

type NoticeState = {
  tone: "warning" | "error" | "success";
  title: string;
  message: string;
} | null;

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLocaleUpperCase("tr-TR")
    .trim();
}

function canDownloadTemplate(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === "MUTEAHHIT" ||
    normalizedRole === "MÜTEAHHİT" ||
    normalizedRole === "MÜTAHHİT" ||
    normalizedRole === "INSAAT_FIRMASI" ||
    normalizedRole === "İNŞAAT_FİRMASI"
  );
}

function roleLabel(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "MUTEAHHIT") return "Müteahhit";
  if (normalizedRole === "INSAAT_FIRMASI") return "İnşaat Firması";
  if (normalizedRole === "EMLAKCI") return "Emlak Danışmanı";
  if (normalizedRole === "EMLAK_OFISI") return "Emlak Ofisi";
  if (normalizedRole === "OFIS_SAHIBI") return "Ofis Sahibi";
  if (normalizedRole === "TAKIM_LIDERI") return "Takım Lideri";
  if (normalizedRole === "MODERATOR") return "Moderatör";
  if (normalizedRole === "ADMIN") return "Admin";
  if (normalizedRole === "SUPER_ADMIN") return "Yazılım Ekibi";

  return "EPH Üyesi";
}

function getDownloadFileName(contentDisposition?: string) {
  if (!contentDisposition) return FILE_NAME;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, ""));
    } catch {
      return FILE_NAME;
    }
  }

  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

  return basicMatch?.[1] || FILE_NAME;
}

export default function ProjectSalesTemplatePage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const eligible = useMemo(
    () => canDownloadTemplate(user?.role),
    [user?.role],
  );

  const currentRoleLabel = roleLabel(user?.role);

  const handleDownload = async () => {
    if (!hasHydrated) return;

    if (!eligible) {
      setNotice({
        tone: "warning",
        title: "İndirme Yetkiniz Bulunmuyor",
        message:
          "Bu Excel şablonu yalnız Müteahhit ve İnşaat Firması rollerine açıktır. Mevcut rolünüz bu indirme işlemi için uygun değildir.",
      });
      return;
    }

    setDownloading(true);

    try {
      const response = await api.get(
        "/project-sales/templates/excel",
        {
          responseType: "blob",
        },
      );

      const contentType = String(
        response.headers["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      const fileName = getDownloadFileName(
        response.headers["content-disposition"],
      );
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);

      setNotice({
        tone: "success",
        title: "Şablon İndirildi",
        message:
          "EPH Proje Satış Merkezi Excel V4 şablonu cihazınıza indirildi.",
      });
    } catch (error: any) {
      setNotice({
        tone: "error",
        title: "İndirme Tamamlanamadı",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Excel şablonu indirilemedi. Lütfen tekrar deneyiniz.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        overflowY: "auto",
        background:
          "linear-gradient(180deg, #F4F8FF 0%, #FFFFFF 42%, #F8FAFC 100%)",
        padding:
          "calc(12px + env(safe-area-inset-top)) 14px calc(110px + env(safe-area-inset-bottom))",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 880,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px minmax(0, 1fr) 44px",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
            padding: 10,
            borderRadius: 22,
            border: "1px solid #C7D6E8",
            background: "#FFFFFF",
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/uretkenlik")}
            aria-label="Üretkenlik sayfasına dön"
            style={{
              width: 44,
              height: 44,
              border: "1px solid #D6E2F0",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#F8FAFC",
              color: "#1F2937",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <div
            style={{
              minWidth: 0,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "#06194A",
              fontSize: 16,
              lineHeight: 1.25,
              fontWeight: 950,
            }}
          >
            PROJE SATIŞ EXCEL ŞABLONU
          </div>

          <div aria-hidden="true" style={{ width: 44, height: 44 }} />
        </div>

        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            border: "1px solid #BFD3EE",
            background:
              "linear-gradient(135deg, #0B3B88 0%, #1557D6 56%, #2563EB 100%)",
            padding: "28px 20px",
            boxShadow: "0 24px 60px rgba(21, 87, 214, 0.20)",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 190,
              height: 190,
              borderRadius: "50%",
              right: -72,
              top: -92,
              background: "rgba(255,255,255,0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 120,
              height: 120,
              borderRadius: "50%",
              left: -60,
              bottom: -66,
              background: "rgba(255,255,255,0.08)",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 66,
                height: 66,
                borderRadius: 22,
                display: "grid",
                placeItems: "center",
                color: "#1557D6",
                background: "#FFFFFF",
                boxShadow: "0 14px 32px rgba(0,0,0,0.16)",
              }}
            >
              <FileSpreadsheet size={34} strokeWidth={2.15} />
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  color: "#BFDBFE",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1.4,
                }}
              >
                EPH PROJE SATIŞ MERKEZİ
              </p>
              <h1
                style={{
                  minHeight: 58,
                  margin: "8px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "#FFFFFF",
                  fontSize: "clamp(25px, 7vw, 38px)",
                  lineHeight: 1.12,
                  fontWeight: 950,
                  letterSpacing: -0.7,
                }}
              >
                Toplu Portföy Giriş Şablonu
              </h1>
            </div>

            <p
              style={{
                maxWidth: 650,
                margin: 0,
                color: "#EAF2FF",
                fontSize: 14,
                lineHeight: 1.65,
                fontWeight: 650,
              }}
            >
              Proje, blok, kat, bağımsız bölüm, özellik ve fotoğraf
              paketlerini tek Excel dosyasında hazırlayın.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          <InfoCard
            icon={<Building2 size={22} />}
            title="Müteahhit"
            text="Yüzlerce veya binlerce bağımsız bölümü toplu hazırlayın."
          />
          <InfoCard
            icon={<Factory size={22} />}
            title="İnşaat Firması"
            text="Oda tipi, konsept ve fotoğraf paketlerini projeye göre tanımlayın."
          />
          <InfoCard
            icon={<ShieldCheck size={22} />}
            title="Kontrollü Aktarım"
            text="Ön izleme, doğrulama ve tekrar kayıt önleme altyapısıyla kullanın."
          />
        </div>

        <section
          style={{
            marginTop: 14,
            borderRadius: 26,
            border: "1px solid #C7D6E8",
            background: "#FFFFFF",
            padding: "20px 16px",
            boxShadow: "0 16px 44px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div
              style={{
                flex: "0 0 auto",
                width: 48,
                height: 48,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background: "#EFF6FF",
                color: "#1557D6",
              }}
            >
              <FileSpreadsheet size={25} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <h2
                style={{
                  margin: 0,
                  color: "#1F2937",
                  fontSize: 19,
                  lineHeight: 1.3,
                  fontWeight: 950,
                }}
              >
                Excel Şablonu V4
              </h2>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748B",
                  fontSize: 13,
                  lineHeight: 1.55,
                  fontWeight: 650,
                  wordBreak: "break-word",
                }}
              >
                {FILE_NAME}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 9,
              marginTop: 18,
            }}
          >
            {[
              "Dinamik oda ve konsept tanımları",
              "Özellik paketlerinde tikli seçim sistemi",
              "Dinamik fotoğraf paketleri ve ZIP klasör eşleşmesi",
              "Proje → Blok → Kat → Bağımsız Bölüm hiyerarşisi",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  color: "#334155",
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontWeight: 750,
                }}
              >
                <CheckCircle2
                  size={18}
                  color="#16A34A"
                  style={{ flex: "0 0 auto", marginTop: 1 }}
                />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 18,
              borderRadius: 18,
              border: eligible
                ? "1px solid #BBF7D0"
                : "1px solid #FED7AA",
              background: eligible ? "#F0FDF4" : "#FFF7ED",
              padding: "12px 13px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {eligible ? (
              <ShieldCheck
                size={21}
                color="#15803D"
                style={{ flex: "0 0 auto" }}
              />
            ) : (
              <LockKeyhole
                size={21}
                color="#C2410C"
                style={{ flex: "0 0 auto" }}
              />
            )}

            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  color: eligible ? "#166534" : "#9A3412",
                  fontSize: 12,
                  fontWeight: 950,
                }}
              >
                Mevcut rolünüz: {currentRoleLabel}
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  color: eligible ? "#15803D" : "#C2410C",
                  fontSize: 12,
                  lineHeight: 1.45,
                  fontWeight: 700,
                }}
              >
                İndirme yetkisi yalnız Müteahhit ve İnşaat Firması
                rollerine açıktır.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!hasHydrated || downloading}
            style={{
              width: "100%",
              minHeight: 54,
              marginTop: 16,
              border: "none",
              borderRadius: 17,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              cursor:
                !hasHydrated || downloading ? "not-allowed" : "pointer",
              background:
                !hasHydrated || downloading
                  ? "#94A3B8"
                  : eligible
                    ? "linear-gradient(135deg, #1557D6, #2563EB)"
                    : "linear-gradient(135deg, #C2410C, #EA580C)",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 950,
              boxShadow:
                !hasHydrated || downloading
                  ? "none"
                  : eligible
                    ? "0 14px 30px rgba(37, 99, 235, 0.25)"
                    : "0 14px 30px rgba(234, 88, 12, 0.20)",
            }}
          >
            {downloading ? (
              <Loader2
                size={21}
                style={{ animation: "spin 0.9s linear infinite" }}
              />
            ) : eligible ? (
              <Download size={21} />
            ) : (
              <LockKeyhole size={21} />
            )}

            {!hasHydrated
              ? "Rol Kontrol Ediliyor"
              : downloading
                ? "Şablon Hazırlanıyor"
                : "Excel V4 Şablonunu İndir"}
          </button>
        </section>
      </section>

      {notice && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setNotice(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10050,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(15, 23, 42, 0.58)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 430,
              borderRadius: 24,
              border: "1px solid #D6E2F0",
              background: "#FFFFFF",
              padding: 20,
              boxShadow: "0 26px 80px rgba(15, 23, 42, 0.26)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 15,
                  flex: "0 0 auto",
                  display: "grid",
                  placeItems: "center",
                  background:
                    notice.tone === "success"
                      ? "#DCFCE7"
                      : notice.tone === "warning"
                        ? "#FFEDD5"
                        : "#FEE2E2",
                  color:
                    notice.tone === "success"
                      ? "#15803D"
                      : notice.tone === "warning"
                        ? "#C2410C"
                        : "#B91C1C",
                }}
              >
                {notice.tone === "success" ? (
                  <CheckCircle2 size={25} />
                ) : (
                  <AlertTriangle size={25} />
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <h3
                  style={{
                    margin: 0,
                    color: "#1F2937",
                    fontSize: 18,
                    lineHeight: 1.3,
                    fontWeight: 950,
                  }}
                >
                  {notice.title}
                </h3>
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#64748B",
                    fontSize: 13,
                    lineHeight: 1.65,
                    fontWeight: 650,
                  }}
                >
                  {notice.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Uyarıyı kapat"
                style={{
                  width: 36,
                  height: 36,
                  flex: "0 0 auto",
                  border: "1px solid #D6E2F0",
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: "#FFFFFF",
                  color: "#64748B",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setNotice(null)}
              style={{
                width: "100%",
                minHeight: 46,
                marginTop: 18,
                border: "none",
                borderRadius: 15,
                background: "#1557D6",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article
      style={{
        minWidth: 0,
        borderRadius: 21,
        border: "1px solid #C7D6E8",
        background: "#FFFFFF",
        padding: 15,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          display: "grid",
          placeItems: "center",
          color: "#1557D6",
          background: "#EFF6FF",
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          margin: "12px 0 0",
          color: "#1F2937",
          fontSize: 15,
          fontWeight: 950,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "6px 0 0",
          color: "#64748B",
          fontSize: 12,
          lineHeight: 1.55,
          fontWeight: 650,
        }}
      >
        {text}
      </p>
    </article>
  );
}
