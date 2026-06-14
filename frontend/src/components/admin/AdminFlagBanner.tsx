"use client";

import { useEffect, useMemo, useState } from "react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type AdminFlagBannerProps = {
  className?: string;
};

type TuranQuote = {
  id: string;
  text: string;
  isActive?: boolean;
  sortOrder?: number;
};

const ADMIN_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

const TYPE_SPEED_MS = 24;
const ROTATE_MS = 60000;
const FADE_MS = 260;

function getRandomQuoteIndex(current: number, length: number) {
  if (length <= 1) return 0;

  let next = current;

  while (next === current) {
    next = Math.floor(Math.random() * length);
  }

  return next;
}

function normalizeQuotes(input: unknown): TuranQuote[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item: any, index) => ({
      id: String(item?.id || `quote-${index}`),
      text: String(item?.text || "").trim(),
      isActive: item?.isActive !== false,
      sortOrder: Number(item?.sortOrder || index + 1),
    }))
    .filter((item) => item.text && item.isActive)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export default function AdminFlagBanner({ className = "" }: AdminFlagBannerProps) {
  const { user } = useAuthStore();
  const [quotes, setQuotes] = useState<TuranQuote[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [typedText, setTypedText] = useState("");

  const role = String(user?.role || "").toUpperCase();
  const canSeeBanner = ADMIN_ROLES.includes(role);

  useEffect(() => {
    if (!canSeeBanner) return;

    let active = true;

    api
      .get("/turan-quotes/active")
      .then((response) => {
        if (!active) return;

        const nextQuotes = normalizeQuotes(response.data);
        setQuotes(nextQuotes);
        setQuoteIndex(nextQuotes.length ? Math.floor(Math.random() * nextQuotes.length) : 0);
      })
      .catch(() => {
        if (active) setQuotes([]);
      });

    return () => {
      active = false;
    };
  }, [canSeeBanner]);

  const quote = useMemo(() => quotes[quoteIndex], [quoteIndex, quotes]);

  useEffect(() => {
    if (!canSeeBanner || !quote?.text) return;

    setTypedText("");
    setVisible(true);

    let cursor = 0;
    const text = quote.text;

    const typingTimer = window.setInterval(() => {
      cursor += 1;
      setTypedText(text.slice(0, cursor));

      if (cursor >= text.length) {
        window.clearInterval(typingTimer);
      }
    }, TYPE_SPEED_MS);

    return () => window.clearInterval(typingTimer);
  }, [canSeeBanner, quote?.id, quote?.text]);

  useEffect(() => {
    if (!canSeeBanner || quotes.length <= 1) return;

    const timer = window.setInterval(() => {
      setVisible(false);

      window.setTimeout(() => {
        setQuoteIndex((current) => getRandomQuoteIndex(current, quotes.length));
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [canSeeBanner, quotes.length]);

  if (!canSeeBanner || !quote?.text) return null;

  return (
    <section
      className={`relative w-full overflow-hidden rounded-[12px] border border-red-900/20 bg-[#b3131b] shadow-[0_10px_24px_rgba(127,29,29,0.18)] ${className}`}
      aria-label="Turan Köşesi"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_50%,rgba(255,255,255,0.22),transparent_13%),linear-gradient(110deg,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,#d41922,#9f1219)]" />
      <div className="absolute left-[7%] top-1/2 -translate-y-1/2 select-none text-[clamp(34px,11vw,70px)] font-black leading-none text-white/20">
        ☾ ★
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/25 to-transparent" />

      <div className="relative flex min-h-[52px] items-center justify-center px-3 py-2 md:min-h-[72px] md:px-5">
        <p
          className={`line-clamp-2 max-w-[920px] break-words text-center text-[clamp(11px,3.1vw,18px)] font-black leading-[1.18] tracking-[-0.02em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {typedText}
          <span className="ml-0.5 inline-block animate-pulse text-white/80">|</span>
        </p>
      </div>
    </section>
  );
}
