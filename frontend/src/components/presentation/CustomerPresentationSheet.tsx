"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Clock3,
  Copy,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Share2,
  Trash2,
  X,
} from "lucide-react";

import api from "@/lib/api";

type PresentationLink = {
  id: string;
  token: string;
  unitId: string;
  source: "POOL" | "PORTFOLIO";
  durationHours: number;
  expiresAt: string;
  revokedAt?: string | null;
  viewCount: number;
  whatsappClickCount: number;
  lastViewedAt?: string | null;
  createdAt: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  url: string;
};

type DurationOption = {
  value: number;
  label: string;
};

const DURATION_OPTIONS: DurationOption[] = [
  { value: 24, label: "24 Saat" },
  { value: 72, label: "3 Gün" },
  { value: 168, label: "7 Gün" },
  { value: 336, label: "14 Gün" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown) {
  const anyError = error as any;
  return (
    anyError?.response?.data?.message ||
    anyError?.message ||
    "İşlem tamamlanamadı."
  );
}

export default function CustomerPresentationSheet({
  open,
  unitId,
  ephId,
  source = "POOL",
  onClose,
}: {
  open: boolean;
  unitId: string;
  ephId: string;
  source?: "POOL" | "PORTFOLIO";
  onClose: () => void;
}) {
  const [durationHours, setDurationHours] = useState(168);
  const [links, setLinks] = useState<PresentationLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeLink = useMemo(
    () => links.find((link) => link.status === "ACTIVE") || null,
    [links],
  );

  const fetchLinks = async () => {
    if (!unitId) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/pool-experience/units/${unitId}/presentations`,
        { params: { source } },
      );
      setLinks(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setDurationHours(168);
    setMessage("");
    setError("");
    void fetchLinks();
  }, [open, source, unitId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const createLink = async () => {
    if (busy) return;
    setBusy("create");
    setError("");
    setMessage("");

    try {
      const endpoint =
        source === "POOL"
          ? `/pool-experience/units/${unitId}/presentations`
          : `/pool-experience/portfolio/${unitId}/presentations`;
      const response = await api.post(endpoint, { durationHours });
      const next = response.data as PresentationLink;
      setLinks((current) => [
        next,
        ...current.filter((item) => item.id !== next.id),
      ]);
      setMessage("Müşteri sunumu hazırlandı.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  const renewLink = async () => {
    if (!activeLink || busy) return;
    setBusy("renew");
    setError("");
    setMessage("");

    try {
      const response = await api.patch(
        `/pool-experience/presentations/${activeLink.id}/renew`,
        { durationHours },
      );
      const next = response.data as PresentationLink;
      setLinks((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
      setMessage("Sunum süresi yenilendi.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  const revokeLink = async () => {
    if (!activeLink || busy) return;
    setBusy("revoke");
    setError("");
    setMessage("");

    try {
      const response = await api.delete(
        `/pool-experience/presentations/${activeLink.id}`,
      );
      const next = response.data as PresentationLink;
      setLinks((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
      setMessage("Sunum bağlantısı iptal edildi.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy("");
    }
  };

  const copyLink = async () => {
    if (!activeLink?.url) return;
    await navigator.clipboard.writeText(activeLink.url);
    setMessage("Bağlantı kopyalandı.");
  };

  const shareLink = async () => {
    if (!activeLink?.url) return;

    const text = `Merhaba, ${ephId} numaralı portföy için hazırladığım müşteri sunumu: ${activeLink.url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${ephId} Müşteri Sunumu`,
          text,
          url: activeLink.url,
        });
        return;
      } catch {
        return;
      }
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-end justify-center bg-slate-950/60 px-2 pt-8"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="relative flex max-h-[92dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] border-2 border-b-0 border-[#C7D6E8] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.30)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b-2 border-[#E2EAF5] bg-[#F8FAFC] px-4 pb-3 pt-2 text-center">
          <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-[#CBD5E1]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3 flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-[#C7D6E8] bg-white text-[#2563EB]"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#2563EB]">
            {ephId}
          </p>
          <h2 className="mt-1 text-[19px] font-black text-[#0F172A]">
            Müşteri Sunumu
          </h2>
          <p className="mt-1 text-[11px] font-bold leading-4 text-[#64748B]">
            Sunumu açın, kopyalayın veya müşterinizle paylaşın.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-4 gap-1.5">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDurationHours(option.value)}
                className={`min-h-[42px] rounded-[13px] border-2 px-1 text-[10px] font-black ${
                  durationHours === option.value
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#C7D6E8] bg-white text-[#64748B]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="mt-3 rounded-[18px] border-2 border-[#C7D6E8] bg-[#F8FAFC] p-5 text-center text-[12px] font-black text-[#64748B]">
              Sunum bağlantıları hazırlanıyor...
            </div>
          ) : activeLink ? (
            <div className="mt-3 overflow-hidden rounded-[20px] border-2 border-emerald-200 bg-white">
              <div className="bg-emerald-50 px-3 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">
                  Bağlantı Aktif
                </p>
                <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-black text-emerald-900">
                  <Clock3 size={14} /> {formatDate(activeLink.expiresAt)} tarihine kadar
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-2.5 text-center">
                <div className="rounded-[13px] bg-[#F8FAFC] px-2 py-2">
                  <p className="text-[16px] font-black text-[#2563EB]">
                    {activeLink.viewCount}
                  </p>
                  <p className="text-[8.5px] font-black text-[#64748B]">Görüntüleme</p>
                </div>
                <div className="rounded-[13px] bg-[#F8FAFC] px-2 py-2">
                  <p className="text-[16px] font-black text-[#16A34A]">
                    {activeLink.whatsappClickCount}
                  </p>
                  <p className="text-[8.5px] font-black text-[#64748B]">WhatsApp</p>
                </div>
                <div className="rounded-[13px] bg-[#F8FAFC] px-2 py-2">
                  <p className="text-[10px] font-black leading-4 text-[#0F172A]">
                    {formatDate(activeLink.lastViewedAt)}
                  </p>
                  <p className="text-[8.5px] font-black text-[#64748B]">Son Açılma</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-[#E2EAF5] p-2.5">
                <button
                  type="button"
                  onClick={() => window.open(activeLink.url, "_blank", "noopener,noreferrer")}
                  className="flex min-h-[44px] items-center justify-center gap-1 rounded-[14px] bg-[#2563EB] text-[11px] font-black text-white"
                >
                  <ExternalLink size={15} /> Sunumu Aç
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex min-h-[44px] items-center justify-center gap-1 rounded-[14px] border-2 border-[#2563EB] bg-[#EFF6FF] text-[11px] font-black text-[#1D4ED8]"
                >
                  <Copy size={15} /> Linki Kopyala
                </button>
                <button
                  type="button"
                  onClick={shareLink}
                  className="col-span-2 flex min-h-[44px] items-center justify-center gap-1 rounded-[14px] border-2 border-[#16A34A] bg-[#F0FDF4] text-[11px] font-black text-[#15803D]"
                >
                  <MessageCircle size={15} /> WhatsApp / Paylaş
                </button>
                <button
                  type="button"
                  onClick={renewLink}
                  disabled={Boolean(busy)}
                  className="flex min-h-[42px] items-center justify-center gap-1 rounded-[14px] border-2 border-[#C7D6E8] bg-white text-[10.5px] font-black text-[#475569] disabled:opacity-60"
                >
                  <RefreshCw size={14} />
                  {busy === "renew" ? "Yenileniyor" : "Süreyi Yenile"}
                </button>
                <button
                  type="button"
                  onClick={revokeLink}
                  disabled={Boolean(busy)}
                  className="flex min-h-[42px] items-center justify-center gap-1 rounded-[14px] border-2 border-rose-200 bg-rose-50 text-[10.5px] font-black text-rose-700 disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  {busy === "revoke" ? "İptal Ediliyor" : "Bağlantıyı İptal Et"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={createLink}
              disabled={Boolean(busy)}
              className="mt-3 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#2563EB] px-4 text-[13px] font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] disabled:opacity-60"
            >
              <Share2 size={17} />
              {busy === "create" ? "Hazırlanıyor..." : "Müşteri Sunumu Oluştur"}
            </button>
          )}

          {error && (
            <p className="mt-3 rounded-[14px] border-2 border-red-200 bg-red-50 px-3 py-2 text-center text-[11px] font-black leading-4 text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p className="mt-3 rounded-[14px] border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-[11px] font-black leading-4 text-emerald-700">
              {message}
            </p>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
