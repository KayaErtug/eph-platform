"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FileText,
  Image,
  ImageIcon,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import PortfolioShareCard, {
  type PortfolioShareData,
} from "./PortfolioShareCard";
import PortfolioShareStory from "./PortfolioShareStory";
import PortfolioSharePdf from "./PortfolioSharePdf";

type ShareMode = "whatsapp" | "story" | "pdf";

type CanvasSize = {
  width: number;
  height: number;
};

function getCanvasSize(mode: ShareMode): CanvasSize {
  if (mode === "story") return { width: 390, height: 760 };
  if (mode === "pdf") return { width: 794, height: 1123 };
  return { width: 390, height: 840 };
}

function normalizeText(value?: string | null, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: string,
  color = "#06194A",
  align: CanvasTextAlign = "left",
) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  font: string,
  color = "#06194A",
  align: CanvasTextAlign = "left",
) {
  const words = normalizeText(text, "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  ctx.save();
  ctx.font = font;

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = testLine;
  });

  if (currentLine) lines.push(currentLine);

  const visibleLines = lines.slice(0, maxLines);

  if (lines.length > maxLines && visibleLines.length > 0) {
    const lastIndex = visibleLines.length - 1;
    let lastLine = visibleLines[lastIndex];

    while (
      lastLine.length > 0 &&
      ctx.measureText(`${lastLine}...`).width > maxWidth
    ) {
      lastLine = lastLine.slice(0, -1).trim();
    }

    visibleLines[lastIndex] = `${lastLine}...`;
  }

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  visibleLines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight, maxWidth);
  });

  ctx.restore();
}

async function loadSafeImage(src?: string | null) {
  const rawSrc = String(src || "").trim();

  if (!rawSrc || typeof window === "undefined") return null;

  const absoluteSrc = rawSrc.startsWith("/")
    ? `${window.location.origin}${rawSrc}`
    : rawSrc;

  try {
    const response = await fetch(absoluteSrc, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache",
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const image = new window.Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Görsel yüklenemedi."));
      image.src = objectUrl;
    });

    return { image, objectUrl };
  } catch {
    return null;
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.save();
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
  ctx.restore();
}

function drawGradientCover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);

  gradient.addColorStop(0, "#06194A");
  gradient.addColorStop(0.52, "#1557D6");
  gradient.addColorStop(1, "#38BDF8");

  ctx.save();
  ctx.fillStyle = gradient;
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#FFFFFF";
  drawRoundRect(ctx, x + 34, y + 42, 148, 76, 28);
  ctx.fill();
  drawRoundRect(ctx, x + width - 156, y + height - 116, 124, 74, 28);
  ctx.fill();
  ctx.restore();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  background: string,
  color: string,
  font = "900 10px Arial",
) {
  ctx.save();
  ctx.fillStyle = background;
  drawRoundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  drawText(ctx, text, x + width / 2, y + height / 2 - 5, width - 12, font, color, "center");
  ctx.restore();
}

function drawInfoBox(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  drawRoundRect(ctx, x, y, width, height, 18);
  ctx.fill();
  ctx.strokeStyle = "#DDE7F3";
  ctx.lineWidth = 1;
  ctx.stroke();

  drawText(ctx, label, x + width / 2, y + 12, width - 12, "900 9px Arial", "#64748B", "center");
  drawWrappedText(
    ctx,
    value,
    x + width / 2,
    y + 33,
    width - 12,
    13,
    2,
    "900 12px Arial",
    "#06194A",
    "center",
  );
  ctx.restore();
}

async function drawShareCanvas(data: PortfolioShareData, mode: ShareMode) {
  const { width, height } = getCanvasSize(mode);
  const scale = 2;
  const canvas = document.createElement("canvas");

  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas oluşturulamadı.");

  ctx.scale(scale, scale);
  ctx.fillStyle = "#F4F8FF";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#FFFFFF";
  drawRoundRect(ctx, 0, 0, width, height, mode === "pdf" ? 0 : 34);
  ctx.fill();

  const padding = mode === "pdf" ? 42 : 16;
  const coverHeight = mode === "pdf" ? 360 : mode === "story" ? 360 : 250;
  const coverWidth = width - padding * 2;
  const coverX = padding;
  const coverY = mode === "pdf" ? 42 : 16;

  const safeImage = await loadSafeImage(data.coverImage);

  if (safeImage) {
    drawCoverImage(ctx, safeImage.image, coverX, coverY, coverWidth, coverHeight, 28);
    URL.revokeObjectURL(safeImage.objectUrl);
  } else {
    drawGradientCover(ctx, coverX, coverY, coverWidth, coverHeight, 28);
  }

  const coverOverlay = ctx.createLinearGradient(0, coverY + 70, 0, coverY + coverHeight);
  coverOverlay.addColorStop(0, "rgba(6,25,74,0.04)");
  coverOverlay.addColorStop(1, "rgba(6,25,74,0.78)");
  ctx.fillStyle = coverOverlay;
  drawRoundRect(ctx, coverX, coverY, coverWidth, coverHeight, 28);
  ctx.fill();

  drawPill(ctx, "EPH YETKİLİ PORTFÖY", coverX + 14, coverY + 16, 156, 32, "rgba(255,255,255,0.94)", "#1557D6");
  drawPill(ctx, "SATILIK", coverX + coverWidth - 92, coverY + 16, 78, 32, "#1557D6", "#FFFFFF");

  drawText(
    ctx,
    "PORTFÖY KARTI",
    coverX + 18,
    coverY + coverHeight - 80,
    coverWidth - 36,
    "900 11px Arial",
    "#FFFFFF",
  );
  drawWrappedText(
    ctx,
    data.title || "EPH Portföy",
    coverX + 18,
    coverY + coverHeight - 58,
    coverWidth - 36,
    mode === "pdf" ? 34 : 27,
    2,
    mode === "pdf" ? "900 31px Arial" : "900 25px Arial",
    "#FFFFFF",
  );

  const bodyY = coverY + coverHeight + 18;
  const bodyX = padding + (mode === "pdf" ? 24 : 8);
  const bodyWidth = width - bodyX * 2;

  ctx.fillStyle = "#F7FBFF";
  drawRoundRect(ctx, bodyX, bodyY, bodyWidth, mode === "pdf" ? 142 : 108, 26);
  ctx.fill();
  ctx.strokeStyle = "#DDE7F3";
  ctx.lineWidth = 1;
  ctx.stroke();

  drawText(ctx, "FİYAT", width / 2, bodyY + 18, bodyWidth - 24, "900 11px Arial", "#64748B", "center");
  drawText(
    ctx,
    normalizeText(data.price, "Fiyat bilgisi yok"),
    width / 2,
    bodyY + 42,
    bodyWidth - 28,
    mode === "pdf" ? "900 38px Arial" : "900 31px Arial",
    "#06194A",
    "center",
  );
  drawWrappedText(
    ctx,
    normalizeText(data.location, "Konum bilgisi yok"),
    width / 2,
    bodyY + (mode === "pdf" ? 91 : 80),
    bodyWidth - 28,
    18,
    2,
    "800 13px Arial",
    "#64748B",
    "center",
  );

  const infoY = bodyY + (mode === "pdf" ? 162 : 128);
  const infoGap = mode === "pdf" ? 12 : 8;
  const infoBoxWidth = (bodyWidth - infoGap * 3) / 4;
  const infoBoxHeight = mode === "pdf" ? 88 : 74;

  const infoItems = [
    ["ODA", normalizeText(data.roomCount)],
    ["ALAN", normalizeText(data.area)],
    ["KAT", normalizeText(data.floor)],
    ["YETKİ", normalizeText(data.authorization, "Kontrol")],
  ];

  infoItems.forEach(([label, value], index) => {
    drawInfoBox(
      ctx,
      label,
      value,
      bodyX + index * (infoBoxWidth + infoGap),
      infoY,
      infoBoxWidth,
      infoBoxHeight,
    );
  });

  const featureY = infoY + infoBoxHeight + 16;
  const features = data.features?.length ? data.features : [];
  const featureItems = features.slice(0, 8).map((item) => item.label);
  const defaultFeatureItems = [
    "Site İçerisinde",
    "Güvenlik",
    "Kapalı Otopark",
    "Açık Havuz",
    "Fitness",
    "Akıllı Ev",
    "Sosyal Tesis",
    "Merkezi Konum",
  ];

  for (let index = 0; index < 8; index += 1) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const boxWidth = (bodyWidth - 10) / 2;
    const x = bodyX + col * (boxWidth + 10);
    const y = featureY + row * 42;
    const text = featureItems[index] || defaultFeatureItems[index];

    ctx.fillStyle = "#FFFFFF";
    drawRoundRect(ctx, x, y, boxWidth, 34, 16);
    ctx.fill();
    ctx.strokeStyle = "#DDE7F3";
    ctx.lineWidth = 1;
    ctx.stroke();

    drawText(ctx, truncateText(text, 24), x + boxWidth / 2, y + 10, boxWidth - 16, "900 11px Arial", "#27364F", "center");
  }

  const descY = featureY + 178;

  ctx.fillStyle = "#FFFFFF";
  drawRoundRect(ctx, bodyX, descY, bodyWidth, mode === "pdf" ? 98 : 76, 24);
  ctx.fill();
  ctx.strokeStyle = "#DDE7F3";
  ctx.stroke();

  drawWrappedText(
    ctx,
    data.shortDescription ||
      "Bu portföy için açıklama henüz eklenmedi.",
    bodyX + 18,
    descY + 16,
    bodyWidth - 36,
    19,
    mode === "pdf" ? 3 : 2,
    mode === "pdf" ? "800 15px Arial" : "800 13px Arial",
    "#475569",
  );

  const advisorY = descY + (mode === "pdf" ? 120 : 96);

  ctx.fillStyle = "#FFFFFF";
  drawRoundRect(ctx, bodyX, advisorY, bodyWidth, 72, 24);
  ctx.fill();
  ctx.strokeStyle = "#DDE7F3";
  ctx.stroke();

  drawText(ctx, "DANIŞMAN", bodyX + 18, advisorY + 15, bodyWidth - 116, "900 10px Arial", "#64748B");
  drawText(
    ctx,
    normalizeText(data.consultantName, "EPH Üyesi"),
    bodyX + 18,
    advisorY + 34,
    bodyWidth - 116,
    "900 14px Arial",
    "#06194A",
  );
  drawText(
    ctx,
    normalizeText(data.consultantPhone, "Telefon bilgisi"),
    bodyX + 18,
    advisorY + 52,
    bodyWidth - 116,
    "800 11px Arial",
    "#64748B",
  );

  ctx.fillStyle = "#F7FBFF";
  drawRoundRect(ctx, bodyX + bodyWidth - 74, advisorY + 12, 52, 48, 16);
  ctx.fill();
  ctx.strokeStyle = "#DDE7F3";
  ctx.stroke();
  drawText(ctx, "QR", bodyX + bodyWidth - 48, advisorY + 22, 40, "900 10px Arial", "#1557D6", "center");
  drawText(ctx, "KOD", bodyX + bodyWidth - 48, advisorY + 36, 40, "900 10px Arial", "#1557D6", "center");

  const footerY = Math.min(height - 78, advisorY + 96);

  ctx.fillStyle = "#06194A";
  drawRoundRect(ctx, padding, footerY, width - padding * 2, 56, 18);
  ctx.fill();
  drawText(
    ctx,
    normalizeText(data.consultantName, "EPH Danışmanı"),
    width / 2,
    footerY + 12,
    width - padding * 2 - 24,
    "900 14px Arial",
    "#FFFFFF",
    "center",
  );
  drawText(
    ctx,
    normalizeText(data.consultantPhone, "Telefon bilgisi"),
    width / 2,
    footerY + 32,
    width - padding * 2 - 24,
    "800 11px Arial",
    "rgba(255,255,255,0.78)",
    "center",
  );

  ctx.save();
  ctx.translate(width / 2, height / 2 - 12);
  ctx.rotate((-28 * Math.PI) / 180);
  ctx.globalAlpha = 0.035;
  drawText(ctx, "EMLAK", 0, -56, width + 120, mode === "pdf" ? "900 72px Arial" : "900 54px Arial", "#06194A", "center");
  drawText(ctx, "PORTFÖY", 0, 0, width + 120, mode === "pdf" ? "900 72px Arial" : "900 54px Arial", "#06194A", "center");
  drawText(ctx, "HAVUZU", 0, 56, width + 120, mode === "pdf" ? "900 72px Arial" : "900 54px Arial", "#06194A", "center");
  ctx.restore();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("PNG oluşturulamadı."));
          return;
        }

        resolve(blob);
      },
      "image/png",
      0.96,
    );
  });
}

export default function PortfolioShareModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: PortfolioShareData | null;
}) {
  const [mode, setMode] = useState<ShareMode>("whatsapp");
  const [busy, setBusy] = useState(false);

  const filename = useMemo(() => {
    const title = data?.title || "eph-portfoy";

    return title
      .toLocaleLowerCase("tr-TR")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }, [data?.title]);

  if (!open || !data) return null;

  const renderPreview = () => {
    if (mode === "story") return <PortfolioShareStory data={data} />;
    if (mode === "pdf") return <PortfolioSharePdf data={data} />;
    return <PortfolioShareCard data={data} />;
  };

  const getBlobFromPreview = async () => {
    return await drawShareCanvas(data, mode);
  };

  const handleDownload = async () => {
    setBusy(true);

    try {
      const blob = await getBlobFromPreview();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${filename}-${mode}.png`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error?.message || "Kart indirilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);

    try {
      const blob = await getBlobFromPreview();
      const file = new File([blob], `${filename}-${mode}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: data.title,
          text: `${data.title} · ${data.price}`,
          files: [file],
        });

        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${filename}-${mode}.png`;
      link.click();

      URL.revokeObjectURL(url);

      alert("Bu cihaz doğrudan görsel paylaşımı desteklemiyor. Kart indirildi.");
    } catch (error: any) {
      alert(error?.message || "Paylaşım kartı hazırlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto overflow-x-hidden bg-[#06194A]/60 px-3 py-4 backdrop-blur-xl">
      <div className="mx-auto flex min-h-full w-full max-w-7xl items-start justify-center">
        <div className="grid w-full min-w-0 max-w-full gap-4 rounded-[28px] border border-white/20 bg-[#F7FBFF] p-3 shadow-[0_30px_120px_rgba(15,23,42,0.30)] lg:grid-cols-[420px_1fr] lg:p-5">
          <aside className="min-w-0 rounded-[26px] border border-[#DDE7F3] bg-white p-4 lg:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
                  Lina Paylaşım Merkezi
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                  Portföy kartını hazırla
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                  EPH filigranlı görsel kart üretin. Link yerine paylaşılabilir
                  görsel kullanılır.
                </p>
              </div>

              <button
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-[#DDE7F3] bg-[#F7FBFF] text-[#06194A] transition hover:bg-[#EFF6FF]"
                aria-label="Kapat"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              <ModeButton
                active={mode === "whatsapp"}
                icon={<MessageCircle size={18} />}
                title="WhatsApp Kartı"
                note="Dikey paylaşım kartı"
                onClick={() => setMode("whatsapp")}
              />

              <ModeButton
                active={mode === "story"}
                icon={<ImageIcon size={18} />}
                title="Instagram Hikâye"
                note="Story formatı"
                onClick={() => setMode("story")}
              />

              <ModeButton
                active={mode === "pdf"}
                icon={<FileText size={18} />}
                title="PDF Broşür"
                note="Tek sayfalık broşür görünümü"
                onClick={() => setMode("pdf")}
              />
            </div>

            <div className="mt-5 rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                Seçili Portföy
              </p>

              <p className="mt-2 text-base font-black text-[#06194A]">
                {data.title}
              </p>

              <p className="mt-1 text-sm font-bold text-[#64748B]">
                {data.location}
              </p>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                onClick={handleShare}
                disabled={busy}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[20px] bg-[#1557D6] px-5 py-3 text-sm font-black text-white shadow-[0_18px_38px_rgba(21,87,214,0.22)] transition hover:bg-[#0F49BD] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={17} />
                {busy ? "Hazırlanıyor..." : "Paylaş"}
              </button>

              <button
                onClick={handleDownload}
                disabled={busy}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE7F3] bg-white px-5 py-3 text-sm font-black text-[#1557D6] transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={17} />
                Görsel İndir
              </button>

              {mode === "pdf" && (
                <button
                  onClick={handlePrintPdf}
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE7F3] bg-white px-5 py-3 text-sm font-black text-[#475569] transition hover:bg-[#EFF6FF] hover:text-[#1557D6]"
                >
                  <Image size={17} />
                  PDF Yazdır / Kaydet
                </button>
              )}
            </div>

            <p className="mt-4 text-center text-xs font-bold leading-5 text-[#64748B]">
              Not: Bazı masaüstü tarayıcılar doğrudan WhatsApp görsel paylaşımını
              desteklemeyebilir. Bu durumda kart indirilir.
            </p>
          </aside>

          <section className="min-w-0 rounded-[26px] border border-[#DDE7F3] bg-white p-3 lg:p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1557D6]">
                  Önizleme
                </p>

                <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#06194A]">
                  {mode === "whatsapp"
                    ? "WhatsApp Kartı"
                    : mode === "story"
                      ? "Instagram Hikâye"
                      : "PDF Broşür"}
                </h3>
              </div>
            </div>

            <div className="max-h-[78vh] max-w-full overflow-auto rounded-[24px] bg-[#EEF5FF] p-3">
              <div className="origin-top scale-[0.86] sm:scale-100">{renderPreview()}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  icon,
  title,
  note,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[70px] min-w-0 items-center gap-3 rounded-[22px] border px-4 text-left transition ${
        active
          ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6]"
          : "border-[#DDE7F3] bg-white text-[#475569] hover:bg-[#F7FBFF]"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] ${
          active ? "bg-[#1557D6] text-white" : "bg-[#F7FBFF] text-[#1557D6]"
        }`}
      >
        {icon}
      </span>

      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-0.5 block text-xs font-bold opacity-70">
          {note}
        </span>
      </span>
    </button>
  );
}
