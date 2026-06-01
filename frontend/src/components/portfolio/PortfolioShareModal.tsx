"use client";

import { useMemo, useRef, useState } from "react";
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
  const captureRef = useRef<HTMLDivElement | null>(null);

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
    const node = captureRef.current?.firstElementChild as HTMLElement | null;

    if (!node) {
      throw new Error("Kart alanı bulunamadı.");
    }

    const rect = node.getBoundingClientRect();
    const clonedNode = node.cloneNode(true) as HTMLElement;

    clonedNode.style.margin = "0";
    clonedNode.style.transform = "none";

    const wrapper = document.createElement("div");

    wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    wrapper.style.width = `${Math.ceil(rect.width)}px`;
    wrapper.style.height = `${Math.ceil(rect.height)}px`;
    wrapper.style.background = "#ffffff";
    wrapper.appendChild(clonedNode);

    const serialized = new XMLSerializer().serializeToString(wrapper);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(rect.width)}" height="${Math.ceil(rect.height)}">
        <foreignObject width="100%" height="100%">
          ${serialized}
        </foreignObject>
      </svg>
    `;

    const svgBlob = new Blob([svg], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(svgBlob);
    const image = document.createElement("img");

    image.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Görsel hazırlanamadı."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    const scale = 2;

    canvas.width = Math.ceil(rect.width) * scale;
    canvas.height = Math.ceil(rect.height) * scale;

    const context = canvas.getContext("2d");

    if (!context) {
      URL.revokeObjectURL(url);
      throw new Error("Canvas oluşturulamadı.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.drawImage(image, 0, 0);

    URL.revokeObjectURL(url);

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
    <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[#06194A]/60 p-4 backdrop-blur-xl">
      <div className="mx-auto flex min-h-full max-w-7xl items-center justify-center">
        <div className="grid w-full gap-4 rounded-[34px] border border-white/20 bg-[#F7FBFF] p-4 shadow-[0_30px_120px_rgba(15,23,42,0.30)] lg:grid-cols-[420px_1fr] lg:p-5">
          <aside className="rounded-[30px] border border-[#DDE7F3] bg-white p-5">
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

          <section className="rounded-[30px] border border-[#DDE7F3] bg-white p-4">
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

            <div className="max-h-[78vh] overflow-auto rounded-[26px] bg-[#EEF5FF] p-4">
              <div ref={captureRef} className="origin-top">
                {renderPreview()}
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
  icon: React.ReactNode;
  title: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[70px] items-center gap-3 rounded-[22px] border px-4 text-left transition ${
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