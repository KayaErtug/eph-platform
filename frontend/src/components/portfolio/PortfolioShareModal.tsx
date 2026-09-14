"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Download,
  ImageIcon,
  Loader2,
  MessageCircle,
  PlaySquare,
  Send,
  Square,
  X,
} from "lucide-react";
import api from "@/lib/api";
import EphStandartGayrimenkulKarti from "./EphStandartGayrimenkulKarti";
import PortfolioShareCard, {
  type PortfolioShareData,
} from "./PortfolioShareCard";
import PortfolioShareStory from "./PortfolioShareStory";
import {
  buildEphPremiumCardData,
  type EphPremiumCardData,
} from "./ephPremiumCardStandard";

type ShareMode =
  | "whatsapp"
  | "instagram-post"
  | "story"
  | "reel";

type CanvasSize = {
  width: number;
  height: number;
};

const MODE_LABELS: Record<ShareMode, string> = {
  whatsapp: "WhatsApp Kartı",
  "instagram-post": "Instagram Gönderisi",
  story: "WhatsApp Durum / Instagram Hikâye",
  reel: "Instagram Reels Kapağı",
};

function getCanvasSize(mode: ShareMode): CanvasSize {
  if (mode === "story" || mode === "reel") {
    return { width: 1080, height: 1920 };
  }

  return { width: 1080, height: 1350 };
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

function drawFallbackCover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "#06194A");
  gradient.addColorStop(0.56, "#1557D6");
  gradient.addColorStop(1, "#38BDF8");

  ctx.save();
  ctx.fillStyle = gradient;
  drawRoundRect(ctx, x, y, width, height, radius);
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
) {
  ctx.save();
  ctx.fillStyle = background;
  drawRoundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  drawText(
    ctx,
    text,
    x + width / 2,
    y + height / 2 - 12,
    width - 24,
    "900 23px Arial",
    color,
    "center",
  );
  ctx.restore();
}

function drawFactBox(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "#FFFFFF");
  gradient.addColorStop(1, "#F3F8FF");

  ctx.save();
  ctx.fillStyle = gradient;
  drawRoundRect(ctx, x, y, width, height, 28);
  ctx.fill();
  ctx.strokeStyle = "#D5E2F1";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(
    ctx,
    label.toLocaleUpperCase("tr-TR"),
    x + width / 2,
    y + 18,
    width - 28,
    "900 18px Arial",
    "#64748B",
    "center",
  );
  drawWrappedText(
    ctx,
    value,
    x + width / 2,
    y + 48,
    width - 34,
    28,
    2,
    "900 27px Arial",
    "#06194A",
    "center",
  );
  ctx.restore();
}

function drawFeatureChip(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = "#F4F8FF";
  drawRoundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  ctx.strokeStyle = "#D5E2F1";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawText(
    ctx,
    truncateText(text, 25),
    x + width / 2,
    y + 15,
    width - 28,
    "800 19px Arial",
    "#27364F",
    "center",
  );
  ctx.restore();
}

async function drawPremiumCanvas(
  data: EphPremiumCardData,
  mode: ShareMode,
) {
  const { width, height } = getCanvasSize(mode);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas oluşturulamadı.");

  const isVertical = mode === "story" || mode === "reel";
  const outerPadding = 34;
  const cardX = outerPadding;
  const cardY = outerPadding;
  const cardWidth = width - outerPadding * 2;
  const cardHeight = height - outerPadding * 2;
  const coverHeight = isVertical ? 720 : 470;

  ctx.fillStyle = "#EAF2FF";
  ctx.fillRect(0, 0, width, height);

  const pageGradient = ctx.createLinearGradient(0, 0, width, height);
  pageGradient.addColorStop(0, "rgba(255,255,255,0.96)");
  pageGradient.addColorStop(1, "rgba(220,234,252,0.94)");
  ctx.fillStyle = pageGradient;
  drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 54);
  ctx.fill();

  const coverX = cardX;
  const coverY = cardY;
  const safeImage = await loadSafeImage(data.coverImage);

  if (safeImage) {
    drawCoverImage(
      ctx,
      safeImage.image,
      coverX,
      coverY,
      cardWidth,
      coverHeight,
      54,
    );
    URL.revokeObjectURL(safeImage.objectUrl);
  } else {
    drawFallbackCover(ctx, coverX, coverY, cardWidth, coverHeight, 54);
  }

  const overlay = ctx.createLinearGradient(
    0,
    coverY + 80,
    0,
    coverY + coverHeight,
  );
  overlay.addColorStop(0, "rgba(6,25,74,0.04)");
  overlay.addColorStop(1, "rgba(6,25,74,0.90)");
  ctx.fillStyle = overlay;
  drawRoundRect(ctx, coverX, coverY, cardWidth, coverHeight, 54);
  ctx.fill();

  drawPill(
    ctx,
    data.authorization.toLocaleUpperCase("tr-TR"),
    coverX + 34,
    coverY + 34,
    300,
    58,
    "rgba(255,255,255,0.95)",
    "#1557D6",
  );
  drawPill(
    ctx,
    data.status.toLocaleUpperCase("tr-TR"),
    coverX + cardWidth - 250,
    coverY + 34,
    216,
    58,
    "#1557D6",
    "#FFFFFF",
  );

  drawText(
    ctx,
    "EPH PREMIUM PORTFÖY KARTI",
    coverX + 42,
    coverY + coverHeight - 170,
    cardWidth - 84,
    "900 24px Arial",
    "rgba(255,255,255,0.78)",
  );
  drawWrappedText(
    ctx,
    data.title,
    coverX + 42,
    coverY + coverHeight - 126,
    cardWidth - 84,
    isVertical ? 57 : 49,
    2,
    isVertical ? "900 50px Arial" : "900 43px Arial",
    "#FFFFFF",
  );

  const bodyX = cardX + 34;
  const bodyWidth = cardWidth - 68;
  const bodyY = cardY + coverHeight + 26;

  ctx.fillStyle = "#F4F8FF";
  drawRoundRect(ctx, bodyX, bodyY, bodyWidth, 142, 34);
  ctx.fill();
  ctx.strokeStyle = "#D5E2F1";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(
    ctx,
    data.propertyType.toLocaleUpperCase("tr-TR"),
    width / 2,
    bodyY + 20,
    bodyWidth - 30,
    "900 20px Arial",
    "#64748B",
    "center",
  );
  drawText(
    ctx,
    data.price,
    width / 2,
    bodyY + 54,
    bodyWidth - 30,
    "900 47px Arial",
    "#06194A",
    "center",
  );
  drawWrappedText(
    ctx,
    data.location,
    width / 2,
    bodyY + 108,
    bodyWidth - 44,
    25,
    1,
    "800 22px Arial",
    "#64748B",
    "center",
  );

  const factsY = bodyY + 166;
  const factGap = 14;
  const factWidth = (bodyWidth - factGap) / 2;
  const factHeight = isVertical ? 104 : 92;

  data.facts.slice(0, 8).forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    drawFactBox(
      ctx,
      item.label,
      item.value,
      bodyX + col * (factWidth + factGap),
      factsY + row * (factHeight + factGap),
      factWidth,
      factHeight,
    );
  });

  const featuresY = factsY + 4 * (factHeight + factGap) + 4;
  const featureTitleY = featuresY;

  drawText(
    ctx,
    "İLAVE ÖZELLİKLER",
    bodyX,
    featureTitleY,
    bodyWidth,
    "900 20px Arial",
    "#1557D6",
  );

  const visibleFeatures = data.additionalFeatures.slice(0, isVertical ? 8 : 6);
  const chipGap = 12;
  const chipWidth = (bodyWidth - chipGap) / 2;
  const chipHeight = 50;

  visibleFeatures.forEach((feature, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    drawFeatureChip(
      ctx,
      feature,
      bodyX + col * (chipWidth + chipGap),
      featureTitleY + 36 + row * (chipHeight + 10),
      chipWidth,
      chipHeight,
    );
  });

  const featureRows = Math.max(1, Math.ceil(visibleFeatures.length / 2));
  const descriptionY = featureTitleY + 48 + featureRows * (chipHeight + 10);

  if (isVertical) {
    ctx.fillStyle = "#F8FAFC";
    drawRoundRect(ctx, bodyX, descriptionY, bodyWidth, 108, 30);
    ctx.fill();
    ctx.strokeStyle = "#D5E2F1";
    ctx.stroke();
    drawWrappedText(
      ctx,
      data.description,
      bodyX + 26,
      descriptionY + 22,
      bodyWidth - 52,
      29,
      2,
      "800 23px Arial",
      "#475569",
    );
  }

  const footerHeight = 120;
  const footerY = cardY + cardHeight - footerHeight - 28;
  const footerGradient = ctx.createLinearGradient(
    bodyX,
    footerY,
    bodyX + bodyWidth,
    footerY + footerHeight,
  );
  footerGradient.addColorStop(0, "#06194A");
  footerGradient.addColorStop(1, "#1557D6");
  ctx.fillStyle = footerGradient;
  drawRoundRect(ctx, bodyX, footerY, bodyWidth, footerHeight, 34);
  ctx.fill();

  drawText(
    ctx,
    "EPH DANIŞMANI",
    bodyX + 28,
    footerY + 22,
    bodyWidth - 320,
    "900 18px Arial",
    "rgba(255,255,255,0.62)",
  );
  drawText(
    ctx,
    data.consultantName,
    bodyX + 28,
    footerY + 50,
    bodyWidth - 320,
    "900 29px Arial",
    "#FFFFFF",
  );
  drawText(
    ctx,
    data.consultantPhone,
    bodyX + 28,
    footerY + 84,
    bodyWidth - 320,
    "800 21px Arial",
    "rgba(255,255,255,0.76)",
  );

  drawText(
    ctx,
    "PORTFÖY NO",
    bodyX + bodyWidth - 240,
    footerY + 30,
    200,
    "900 17px Arial",
    "rgba(255,255,255,0.62)",
    "right",
  );
  drawText(
    ctx,
    data.portfolioNo,
    bodyX + bodyWidth - 40,
    footerY + 62,
    220,
    "900 22px Arial",
    "#FFFFFF",
    "right",
  );

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-28 * Math.PI) / 180);
  ctx.globalAlpha = 0.035;
  drawText(
    ctx,
    "EMLAK PORTFÖY HAVUZU",
    0,
    0,
    width + 460,
    "900 78px Arial",
    "#06194A",
    "center",
  );
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
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitData, setUnitData] = useState<unknown>(null);

  useEffect(() => {
    if (!open || !data?.id) {
      setUnitData(null);
      return;
    }

    let active = true;
    setUnitLoading(true);

    api
      .get(`/units/${data.id}`)
      .then((response) => {
        if (active) setUnitData(response.data);
      })
      .catch(() => {
        if (active) setUnitData(null);
      })
      .finally(() => {
        if (active) setUnitLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, data?.id]);

  const premiumData = useMemo(
    () => buildEphPremiumCardData(unitData, data),
    [unitData, data],
  );

  const filename = useMemo(() => {
    const title = premiumData.title || "eph-portfoy";

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
  }, [premiumData.title]);

  if (!open || !data) return null;

  const renderPreview = () => {
    if (mode === "whatsapp") {
      return <PortfolioShareCard data={premiumData} />;
    }

    if (mode === "instagram-post") {
      return (
        <EphStandartGayrimenkulKarti
          data={premiumData}
          variant="instagram-post"
        />
      );
    }

    return (
      <PortfolioShareStory
        data={premiumData}
        mode={mode === "reel" ? "reel" : "story"}
      />
    );
  };

  const makeFile = async () => {
    const blob = await drawPremiumCanvas(premiumData, mode);
    return {
      blob,
      file: new File([blob], `${filename}-${mode}.png`, {
        type: "image/png",
      }),
    };
  };

  const handleDownload = async () => {
    setBusy(true);

    try {
      const { blob } = await makeFile();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}-${mode}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error?.message || "Paylaşım kartı hazırlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);

    try {
      const { blob, file } = await makeFile();

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: premiumData.title,
          text: `${premiumData.title} · ${premiumData.price}`,
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
      alert("Bu cihaz doğrudan paylaşımı desteklemiyor. Kart indirildi.");
    } catch (error: any) {
      alert(error?.message || "Paylaşım kartı hazırlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto overflow-x-hidden bg-[#06194A]/70 px-3 py-4 backdrop-blur-xl">
      <div className="mx-auto flex min-h-full w-full max-w-7xl items-start justify-center">
        <div className="grid w-full min-w-0 gap-4 rounded-[30px] border border-white/20 bg-[#F4F8FF] p-3 shadow-[0_30px_120px_rgba(15,23,42,0.34)] lg:grid-cols-[410px_1fr] lg:p-5">
          <aside className="min-w-0 rounded-[28px] border border-[#DDE7F3] bg-white p-4 lg:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#1557D6]">
                  EPH Premium Paylaşım Merkezi
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#06194A]">
                  Tek kart, tüm kanallar
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                  Portföy verilerinden otomatik üretilen, güncel ve filigranlı
                  müşteri sunum kartı.
                </p>
              </div>

              <button
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-[#DDE7F3] bg-[#F7FBFF] text-[#06194A]"
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
                note="Sohbet ve müşteri gönderimi"
                onClick={() => setMode("whatsapp")}
              />
              <ModeButton
                active={mode === "instagram-post"}
                icon={<Square size={18} />}
                title="Instagram Gönderisi"
                note="4:5 premium gönderi formatı"
                onClick={() => setMode("instagram-post")}
              />
              <ModeButton
                active={mode === "story"}
                icon={<ImageIcon size={18} />}
                title="Durum / Hikâye"
                note="WhatsApp ve Instagram 9:16"
                onClick={() => setMode("story")}
              />
              <ModeButton
                active={mode === "reel"}
                icon={<PlaySquare size={18} />}
                title="Reels Kapağı"
                note="Instagram Reels 9:16"
                onClick={() => setMode("reel")}
              />
            </div>

            <div className="mt-5 rounded-[24px] border border-[#DDE7F3] bg-[#F7FBFF] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                  Seçili Portföy
                </p>
                {unitLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-[#1557D6]" />
                )}
              </div>
              <p className="mt-2 text-base font-black text-[#06194A]">
                {premiumData.title}
              </p>
              <p className="mt-1 text-sm font-bold text-[#64748B]">
                {premiumData.location}
              </p>
              <p className="mt-3 text-[11px] font-bold leading-5 text-[#475569]">
                Kart bilgileri portföy kaydından canlı alınır. Portföy
                güncellendiğinde yeni oluşturulan kart da güncel veriyi kullanır.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={handleDownload}
                disabled={busy || unitLoading}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[20px] border border-[#C7D6E8] bg-white px-4 py-3 text-sm font-black text-[#1557D6] disabled:opacity-60"
              >
                <Download size={17} />
                İndir
              </button>
              <button
                onClick={handleShare}
                disabled={busy || unitLoading}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[20px] bg-[#1557D6] px-4 py-3 text-sm font-black text-white shadow-[0_18px_38px_rgba(21,87,214,0.22)] disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send size={17} />
                )}
                {busy ? "Hazırlanıyor" : "Paylaş"}
              </button>
            </div>
          </aside>

          <section className="min-w-0 rounded-[28px] border border-[#DDE7F3] bg-white p-3 lg:p-4">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1557D6]">
                Canlı Önizleme
              </p>
              <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#06194A]">
                {MODE_LABELS[mode]}
              </h3>
            </div>

            <div className="max-h-[80vh] overflow-auto rounded-[24px] bg-[#EAF2FF] p-3">
              <div className="mx-auto flex min-w-[340px] justify-center py-2">
                <div
                  className={
                    mode === "story" || mode === "reel"
                      ? "origin-top scale-[0.78] sm:scale-[0.88]"
                      : mode === "instagram-post"
                        ? "origin-top scale-[0.82] sm:scale-100"
                        : "origin-top scale-[0.84] sm:scale-100"
                  }
                >
                  {renderPreview()}
                </div>
              </div>
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
  icon: ReactNode;
  title: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[68px] items-center gap-3 rounded-[22px] border px-4 text-left transition ${
        active
          ? "border-[#1557D6] bg-[#EFF6FF] text-[#1557D6] shadow-[0_10px_24px_rgba(21,87,214,0.10)]"
          : "border-[#DDE7F3] bg-white text-[#475569]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] ${
          active ? "bg-[#1557D6] text-white" : "bg-[#F4F8FF] text-[#1557D6]"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-1 block text-[11px] font-bold text-[#64748B]">
          {note}
        </span>
      </span>
    </button>
  );
}
